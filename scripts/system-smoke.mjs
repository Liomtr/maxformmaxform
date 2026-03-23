import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const backendDir = path.join(repoRoot, 'backend')

const envDefaults = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '3309',
  DB_USER: 'root',
  DB_PASSWORD: '123456',
  DB_NAME: 'survey_system',
  FRONTEND_URL: 'http://127.0.0.1:63000',
  PORT: '63102'
}

for (const [key, value] of Object.entries(envDefaults)) {
  if (!process.env[key]) process.env[key] = value
}

const env = { ...process.env }
const [{ migrate, seed }, { default: knex }, { default: User }, { default: Role }] = await Promise.all([
  import('../backend/src/db/migrate.js'),
  import('../backend/src/db/knex.js'),
  import('../backend/src/models/User.js'),
  import('../backend/src/models/Role.js')
])

const baseUrl = `http://127.0.0.1:${env.PORT}`
const runId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
const adminUsername = `sys_admin_${runId}`
const adminPassword = `Admin!${runId}`
const testUser = `sys_user_${runId}`
const importedUser = `sys_import_${runId}`
const results = []

function record(name, ok, detail = {}) {
  results.push({ name, ok, ...detail })
}

async function api(pathname, { method = 'GET', token, body, expectedStatus } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  if (expectedStatus !== undefined && response.status !== expectedStatus) {
    throw new Error(`${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`)
  }

  return { status: response.status, json }
}

async function ensureAdminUser() {
  await migrate()
  await seed()

  let user = await User.findByUsername(adminUsername)
  if (!user) {
    const adminRole = await Role.findByCode('admin')
    user = await User.create({
      username: adminUsername,
      email: `${adminUsername}@example.com`,
      password: adminPassword,
      role_id: adminRole.id
    })
  }
  return user
}

async function waitForHealth(serverProcess) {
  for (let i = 0; i < 60; i += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`backend server exited early with code ${serverProcess.exitCode}`)
    }
    try {
      const response = await fetch(`${baseUrl}/health`)
      const json = await response.json()
      if (json?.status === 'OK') return
    } catch {}
    await delay(500)
  }
  throw new Error('backend server did not become healthy in time')
}

function spawnServer() {
  return spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

async function main() {
  let server

  try {
    await ensureAdminUser()

    server = spawnServer()
    const stdout = []
    const stderr = []
    server.stdout.on('data', chunk => stdout.push(String(chunk)))
    server.stderr.on('data', chunk => stderr.push(String(chunk)))

    await waitForHealth(server)

    let response = await api('/health', { expectedStatus: 200 })
    record('健康检查', response.json?.status === 'OK', { status: response.status })

    response = await api('/api/auth/login', {
      method: 'POST',
      body: { username: adminUsername, password: adminPassword },
      expectedStatus: 200
    })
    const adminToken = response.json.data.token
    record('管理员登录', !!adminToken, { status: response.status })

    response = await api('/api/auth/me', { token: adminToken, expectedStatus: 200 })
    record('管理员身份读取', response.json?.data?.role?.code === 'admin', { status: response.status })

    response = await api('/api/auth/register', {
      method: 'POST',
      body: { username: testUser, email: `${testUser}@example.com`, password: 'User123456' },
      expectedStatus: 200
    })
    const userToken = response.json.data.token
    record('普通用户注册', !!userToken, { status: response.status })

    response = await api('/api/auth/me', { token: userToken, expectedStatus: 200 })
    record('普通用户身份读取', response.json?.data?.user?.username === testUser, { status: response.status })

    response = await api('/api/depts', {
      method: 'POST',
      token: adminToken,
      body: { name: `系统测试部门-${runId}` },
      expectedStatus: 200
    })
    const deptId = response.json.data.id
    record('创建部门', !!deptId, { status: response.status, deptId })

    response = await api('/api/users/import', {
      method: 'POST',
      token: adminToken,
      body: {
        users: [{
          username: importedUser,
          email: `${importedUser}@example.com`,
          password: 'Import123456',
          dept_id: deptId
        }]
      },
      expectedStatus: 200
    })
    record('成员导入', response.json?.data?.created === 1 && response.json?.data?.skipped === 0, { status: response.status })

    response = await api(`/api/users/${importedUser}`, { token: adminToken, expectedStatus: 200 })
    const importedUserId = response.json.data.id
    record('导入成员读取', Number(response.json?.data?.dept_id) === Number(deptId), { status: response.status, userId: importedUserId })

    response = await api('/api/folders', {
      method: 'POST',
      token: adminToken,
      body: { name: `系统测试父文件夹-${runId}` },
      expectedStatus: 200
    })
    const parentFolderId = response.json.data.id
    record('创建父文件夹', !!parentFolderId, { status: response.status })

    response = await api('/api/folders', {
      method: 'POST',
      token: adminToken,
      body: { name: `系统测试子文件夹-${runId}`, parentId: parentFolderId },
      expectedStatus: 200
    })
    const childFolderId = response.json.data.id
    record('创建子文件夹', !!childFolderId, { status: response.status })

    response = await api(`/api/folders/${parentFolderId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 409
    })
    record('父文件夹删除保护', response.json?.error?.code === 'FOLDER_HAS_CHILDREN', { status: response.status })

    response = await api('/api/folders', {
      method: 'POST',
      token: adminToken,
      body: { name: `系统测试工作文件夹-${runId}` },
      expectedStatus: 200
    })
    const workFolderId = response.json.data.id
    record('创建工作文件夹', !!workFolderId, { status: response.status })

    response = await api('/api/surveys', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `系统测试问卷-${runId}`,
        description: '系统测试自动创建',
        questions: [{
          id: 'q1',
          type: 'radio',
          title: '是否通过',
          options: [
            { label: '是', value: 'yes' },
            { label: '否', value: 'no' }
          ]
        }],
        settings: { allowMultipleSubmissions: false },
        style: { theme: 'default' }
      },
      expectedStatus: 200
    })
    const surveyId = response.json.data.id
    const shareCode = response.json.data.share_code || response.json.data.shareId
    record('创建问卷', !!surveyId, { status: response.status, surveyId })

    response = await api(`/api/surveys/${surveyId}/folder`, {
      method: 'PUT',
      token: adminToken,
      body: { folder_id: workFolderId },
      expectedStatus: 200
    })
    record('移动问卷到文件夹', Number(response.json?.data?.folderId) === Number(workFolderId), { status: response.status })

    response = await api(`/api/surveys/${surveyId}/publish`, {
      method: 'POST',
      token: adminToken,
      expectedStatus: 200
    })
    record('发布问卷', response.json?.data?.status === 'published', { status: response.status })

    response = await api(`/api/surveys/share/${shareCode}`, { expectedStatus: 200 })
    record('公开读取已发布问卷', Number(response.json?.data?.id) === Number(surveyId), { status: response.status })

    response = await api(`/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      body: { answers: [{ id: 'q1', value: 'yes' }], duration: 18 },
      expectedStatus: 200
    })
    record('提交问卷答案', !!response.json?.data?.id, { status: response.status })

    response = await api(`/api/surveys/${surveyId}/results`, {
      token: adminToken,
      expectedStatus: 200
    })
    record('读取问卷结果', Number(response.json?.data?.totalSubmissions) >= 1, { status: response.status })

    response = await api('/api/messages?types=audit,system', {
      token: adminToken,
      expectedStatus: 200
    })
    const messages = response.json?.data || []
    record('读取消息列表', Array.isArray(messages) && messages.length > 0, { status: response.status, count: messages.length })

    if (messages.length > 0) {
      const firstMessageId = messages[0].id
      const markRead = await api(`/api/messages/${firstMessageId}/read`, {
        method: 'POST',
        token: adminToken,
        expectedStatus: 200
      })
      record('标记消息已读', markRead.json?.data?.read === true, { status: markRead.status, messageId: firstMessageId })
    }

    response = await api('/api/audits?page=1&pageSize=20', {
      token: adminToken,
      expectedStatus: 200
    })
    record('读取审计日志', Array.isArray(response.json?.data) && response.json.data.length > 0, { status: response.status, total: response.json.total })

    response = await api(`/api/surveys/${surveyId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('删除问卷进入回收站', !!response.json?.data?.deletedAt, { status: response.status })

    response = await api('/api/surveys/trash', {
      token: adminToken,
      expectedStatus: 200
    })
    const trashList = response.json?.data || []
    record('读取回收站列表', trashList.some(item => Number(item.id) === Number(surveyId)), { status: response.status, count: trashList.length })

    response = await api(`/api/surveys/${surveyId}/restore`, {
      method: 'POST',
      token: adminToken,
      expectedStatus: 200
    })
    record('恢复回收站问卷', Number(response.json?.data?.id) === Number(surveyId) && !response.json?.data?.deletedAt, { status: response.status })

    response = await api('/api/surveys', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `系统测试回收站问卷-${runId}`,
        description: '待清空回收站',
        questions: [{
          id: 'q1',
          type: 'radio',
          title: '是否保留',
          options: [
            { label: '是', value: 'yes' },
            { label: '否', value: 'no' }
          ]
        }]
      },
      expectedStatus: 200
    })
    const trashSurveyId = response.json.data.id
    record('创建回收站测试问卷', !!trashSurveyId, { status: response.status })

    await api(`/api/surveys/${trashSurveyId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    response = await api('/api/surveys/trash', {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('清空回收站', Number(response.json?.data?.deleted) >= 1, { status: response.status, deleted: response.json?.data?.deleted })

    response = await api(`/api/folders/${workFolderId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('删除工作文件夹', response.json?.success === true, { status: response.status })

    await api(`/api/folders/${childFolderId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    response = await api(`/api/folders/${parentFolderId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('删除父子文件夹', response.json?.success === true, { status: response.status })

    response = await api(`/api/depts/${deptId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('删除部门并清理成员归属', Number(response.json?.data?.clearedUsers) === 1, { status: response.status, clearedUsers: response.json?.data?.clearedUsers })

    response = await api(`/api/users/${importedUser}`, {
      token: adminToken,
      expectedStatus: 200
    })
    record('成员部门归属已清空', response.json?.data?.dept_id == null, { status: response.status })

    await api(`/api/users/${importedUserId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('删除导入成员', true, { status: 200 })

    const passed = results.filter(item => item.ok).length
    const failed = results.filter(item => !item.ok).length
    const summary = { runId, environment: { dbHost: env.DB_HOST, dbPort: env.DB_PORT, dbName: env.DB_NAME, port: env.PORT }, passed, failed, results }
    console.log(JSON.stringify(summary, null, 2))
    if (failed > 0) process.exitCode = 1
  } catch (error) {
    const summary = {
      runId,
      environment: { dbHost: env.DB_HOST, dbPort: env.DB_PORT, dbName: env.DB_NAME, port: env.PORT },
      error: String(error),
      results
    }
    console.log(JSON.stringify(summary, null, 2))
    process.exitCode = 1
  } finally {
    if (server && server.exitCode === null) {
      server.kill('SIGTERM')
      await delay(1000)
      if (server.exitCode === null) server.kill('SIGKILL')
    }
    await knex.destroy()
  }
}

main()
