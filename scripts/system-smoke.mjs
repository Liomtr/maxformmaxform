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
const [{ migrate }, { ensureBaseRoles }, { default: knex }, { default: User }, { default: Role }] = await Promise.all([
  import('../backend/src/db/migrate.js'),
  import('../backend/src/db/seed.js'),
  import('../backend/src/db/knex.js'),
  import('../backend/src/models/User.js'),
  import('../backend/src/models/Role.js')
])

const baseUrl = `http://127.0.0.1:${env.PORT}`
const runId = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`
const adminUsername = `sys_admin_${runId}`
const adminPassword = `Admin!${runId}`
const basicUsername = `sys_user_${runId}`
const importedUsername = `sys_import_${runId}`
const positionCode = `smoke-pos-${runId}`
const updatedPositionCode = `${positionCode}-v2`
const results = []
const deletedFileIds = new Set()

const SAFARI_IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const CHROME_WINDOWS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'

function record(name, ok, detail = {}) {
  results.push({ name, ok, ...detail })
}

function isFormDataBody(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

async function request(pathname, { method = 'GET', token, body, expectedStatus, headers = {}, parse = 'json' } = {}) {
  const requestHeaders = { ...headers }
  if (token) requestHeaders.Authorization = `Bearer ${token}`

  let requestBody
  if (body !== undefined) {
    if (isFormDataBody(body)) {
      requestBody = body
    } else {
      requestHeaders['Content-Type'] = 'application/json'
      requestBody = JSON.stringify(body)
    }
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: requestHeaders,
    body: requestBody
  })

  if (expectedStatus !== undefined && response.status !== expectedStatus) {
    const text = await response.text()
    throw new Error(`${method} ${pathname} expected ${expectedStatus}, got ${response.status}: ${text}`)
  }

  if (parse === 'buffer') {
    return {
      status: response.status,
      headers: response.headers,
      buffer: Buffer.from(await response.arrayBuffer())
    }
  }

  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  return {
    status: response.status,
    headers: response.headers,
    json
  }
}

function createUploadForm(fields, filename, contents, type = 'application/pdf') {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, String(value))
  }
  form.append('file', new Blob([contents], { type }), filename)
  return form
}

function buildUploadValidationQuestions() {
  return [
    {
      type: 'upload',
      title: 'Identity document',
      required: false,
      upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf,application/pdf,application/octet-stream' }
    },
    {
      type: 'upload',
      title: 'Supporting document',
      required: false,
      upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf,application/pdf,application/octet-stream' }
    }
  ]
}

function buildAnalyticsQuestions() {
  return [
    {
      type: 'radio',
      title: 'Did the workflow pass?',
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    },
    {
      type: 'checkbox',
      title: 'Which channels were used?',
      options: [
        { label: 'API', value: 'api' },
        { label: 'UI', value: 'ui' }
      ]
    },
    {
      type: 'input',
      title: 'Notes'
    },
    {
      type: 'slider',
      title: 'Slider score'
    },
    {
      type: 'rating',
      title: 'Rating score',
      validation: { min: 1, max: 5 }
    },
    {
      type: 'scale',
      title: 'Scale score',
      validation: { min: 1, max: 10 }
    },
    {
      type: 'matrix',
      title: 'Matrix feedback',
      options: [
        { label: 'Good', value: '1' },
        { label: 'Average', value: '2' },
        { label: 'Bad', value: '3' }
      ],
      matrix: {
        selectionType: 'single',
        rows: [
          { label: 'Service', value: '1' },
          { label: 'Speed', value: '2' }
        ]
      }
    },
    {
      type: 'ratio',
      title: 'Ratio allocation',
      options: [
        { label: 'Brand', value: 'brand' },
        { label: 'Price', value: 'price' },
        { label: 'Service', value: 'service' }
      ]
    },
    {
      type: 'ranking',
      title: 'Rank the priorities',
      options: [
        { label: 'Quality', value: 'quality' },
        { label: 'Speed', value: 'speed' }
      ]
    },
    {
      type: 'upload',
      title: 'Upload evidence',
      required: true,
      upload: { maxFiles: 2, maxSizeMb: 10, accept: '.pdf,application/pdf,application/octet-stream' }
    },
    {
      type: 'date',
      title: 'Completed on'
    }
  ]
}

function findQuestionStat(questionStats, questionId) {
  return (questionStats || []).find(item => Number(item?.questionId) === Number(questionId))
}

function countListHas(list, label, count) {
  return Array.isArray(list) && list.some(item => item?.label === label && Number(item?.value) === Number(count))
}

function markFileDeleted(fileId) {
  const numericId = Number(fileId)
  if (Number.isFinite(numericId) && numericId > 0) deletedFileIds.add(numericId)
}

async function deleteManagedFile(fileId, token) {
  const numericId = Number(fileId)
  if (!Number.isFinite(numericId) || numericId <= 0 || deletedFileIds.has(numericId)) return

  await request(`/api/files/${numericId}`, {
    method: 'DELETE',
    token,
    expectedStatus: 200
  })
  markFileDeleted(numericId)
}

async function ensureAdminUser() {
  await migrate()
  await ensureBaseRoles()

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
  const stdout = []
  const stderr = []

  try {
    await ensureAdminUser()

    server = spawnServer()
    server.stdout.on('data', chunk => stdout.push(String(chunk)))
    server.stderr.on('data', chunk => stderr.push(String(chunk)))

    await waitForHealth(server)

    let response = await request('/health', { expectedStatus: 200 })
    record('health check', response.json?.status === 'OK', { status: response.status })

    response = await request('/api/auth/login', {
      method: 'POST',
      body: { username: adminUsername, password: adminPassword },
      expectedStatus: 200
    })
    const adminToken = response.json?.data?.token
    record('admin login', !!adminToken, { status: response.status })

    response = await request('/api/auth/me', {
      token: adminToken,
      expectedStatus: 200
    })
    record('admin profile', response.json?.data?.role?.code === 'admin', { status: response.status })

    response = await request('/api/auth/register', {
      method: 'POST',
      body: {
        username: basicUsername,
        email: `${basicUsername}@example.com`,
        password: 'User123456'
      },
      expectedStatus: 200
    })
    const basicUserToken = response.json?.data?.token
    record('basic user register', !!basicUserToken, { status: response.status })

    response = await request('/api/auth/me', {
      token: basicUserToken,
      expectedStatus: 200
    })
    record('basic user profile', response.json?.data?.user?.username === basicUsername, { status: response.status })

    response = await request('/api/depts', {
      method: 'POST',
      token: adminToken,
      body: { name: `Smoke Dept ${runId}` },
      expectedStatus: 200
    })
    const deptId = response.json?.data?.id
    record('create department', !!deptId, { status: response.status, deptId })

    response = await request('/api/positions', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Smoke Position ${runId}`,
        code: positionCode,
        remark: 'system smoke position'
      },
      expectedStatus: 200
    })
    const positionId = response.json?.data?.id
    record('create position', !!positionId, { status: response.status, positionId })

    response = await request('/api/positions', {
      token: adminToken,
      expectedStatus: 200
    })
    record('list positions', Array.isArray(response.json?.data) && response.json.data.some(item => Number(item.id) === Number(positionId)), { status: response.status })

    response = await request(`/api/positions/${positionId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        name: `Smoke Position Updated ${runId}`,
        code: updatedPositionCode,
        isVirtual: true,
        remark: 'updated by system smoke'
      },
      expectedStatus: 200
    })
    record('update position', response.json?.data?.code === updatedPositionCode && Boolean(response.json?.data?.is_virtual) === true, { status: response.status })

    response = await request('/api/users/import', {
      method: 'POST',
      token: adminToken,
      body: {
        users: [{
          username: importedUsername,
          email: `${importedUsername}@example.com`,
          password: 'Import123456',
          dept_id: deptId,
          position_id: positionId
        }]
      },
      expectedStatus: 200
    })
    record('import member', response.json?.data?.created === 1 && response.json?.data?.skipped === 0, { status: response.status })

    response = await request(`/api/users/${importedUsername}`, {
      token: adminToken,
      expectedStatus: 200
    })
    const importedUserId = response.json?.data?.id
    record(
      'read imported member',
      Number(response.json?.data?.dept_id) === Number(deptId) && Number(response.json?.data?.position_id) === Number(positionId),
      { status: response.status, userId: importedUserId }
    )

    response = await request('/api/folders', {
      method: 'POST',
      token: adminToken,
      body: { name: `Smoke Parent Folder ${runId}` },
      expectedStatus: 200
    })
    const parentFolderId = response.json?.data?.id
    record('create parent folder', !!parentFolderId, { status: response.status })

    response = await request('/api/folders', {
      method: 'POST',
      token: adminToken,
      body: { name: `Smoke Child Folder ${runId}`, parentId: parentFolderId },
      expectedStatus: 200
    })
    const childFolderId = response.json?.data?.id
    record('create child folder', !!childFolderId, { status: response.status })

    response = await request(`/api/folders/${parentFolderId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 409
    })
    record('parent folder delete guard', response.json?.error?.code === 'FOLDER_HAS_CHILDREN', { status: response.status })

    response = await request('/api/folders', {
      method: 'POST',
      token: adminToken,
      body: { name: `Smoke Work Folder ${runId}` },
      expectedStatus: 200
    })
    const workFolderId = response.json?.data?.id
    record('create work folder', !!workFolderId, { status: response.status })

    response = await request('/api/surveys', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Smoke Upload Validation ${runId}`,
        description: 'upload validation smoke survey',
        questions: buildUploadValidationQuestions(),
        settings: { allowMultipleSubmissions: true },
        style: { theme: 'default' }
      },
      expectedStatus: 200
    })
    const uploadValidationSurveyId = response.json?.data?.id
    record('create upload validation survey', !!uploadValidationSurveyId, { status: response.status, surveyId: uploadValidationSurveyId })

    response = await request(`/api/surveys/${uploadValidationSurveyId}/publish`, {
      method: 'POST',
      token: adminToken,
      expectedStatus: 200
    })
    record('publish upload validation survey', response.json?.data?.status === 'published', { status: response.status })

    const uploadValidationSessionA = `upload-guard-${runId}-a`
    response = await request(`/api/surveys/${uploadValidationSurveyId}/uploads`, {
      method: 'POST',
      body: createUploadForm(
        { questionId: 1, submissionToken: uploadValidationSessionA },
        `upload-guard-a-${runId}.pdf`,
        'upload validation A'
      ),
      expectedStatus: 200
    })
    const uploadGuardFileA = response.json?.data
    record('public upload accepted', Number(uploadGuardFileA?.id) > 0 && Number(uploadGuardFileA?.surveyId) === Number(uploadValidationSurveyId), { status: response.status, fileId: uploadGuardFileA?.id })

    response = await request(`/api/surveys/${uploadValidationSurveyId}/uploads`, {
      method: 'POST',
      body: createUploadForm(
        { questionId: 1, submissionToken: uploadValidationSessionA },
        `upload-guard-a-overflow-${runId}.pdf`,
        'upload validation overflow'
      ),
      expectedStatus: 400
    })
    record('upload maxFiles enforced', response.json?.error?.code === 'UPLOAD_VALIDATION', { status: response.status })

    response = await request(`/api/surveys/${uploadValidationSurveyId}/responses`, {
      method: 'POST',
      body: {
        clientSubmissionToken: uploadValidationSessionA,
        answers: [{
          questionId: 1,
          value: [{ id: uploadGuardFileA?.id, uploadToken: 'wrong-token' }]
        }]
      },
      expectedStatus: 400
    })
    record('invalid upload token rejected', response.json?.error?.code === 'VALIDATION', { status: response.status })

    const uploadValidationSessionB = `upload-guard-${runId}-b`
    response = await request(`/api/surveys/${uploadValidationSurveyId}/uploads`, {
      method: 'POST',
      body: createUploadForm(
        { questionId: 2, submissionToken: uploadValidationSessionB },
        `upload-guard-b-${runId}.pdf`,
        'upload validation B'
      ),
      expectedStatus: 200
    })
    const uploadGuardFileB = response.json?.data
    record('second upload question accepted', Number(uploadGuardFileB?.id) > 0 && Number(uploadGuardFileB?.surveyId) === Number(uploadValidationSurveyId), { status: response.status, fileId: uploadGuardFileB?.id })

    response = await request(`/api/surveys/${uploadValidationSurveyId}/responses`, {
      method: 'POST',
      body: {
        clientSubmissionToken: uploadValidationSessionB,
        answers: [{
          questionId: 1,
          value: [{ id: uploadGuardFileB?.id, uploadToken: uploadGuardFileB?.uploadToken }]
        }]
      },
      expectedStatus: 400
    })
    record('upload question binding enforced', response.json?.error?.code === 'VALIDATION', { status: response.status })

    response = await request('/api/surveys', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Smoke Analytics ${runId}`,
        description: 'analytics smoke survey',
        questions: buildAnalyticsQuestions(),
        settings: { allowMultipleSubmissions: true },
        style: { theme: 'default' }
      },
      expectedStatus: 200
    })
    const analyticsSurveyId = response.json?.data?.id
    const analyticsShareCode = response.json?.data?.share_code || response.json?.data?.shareId
    record('create analytics survey', !!analyticsSurveyId, { status: response.status, surveyId: analyticsSurveyId })

    response = await request('/api/surveys?page=1&pageSize=20', {
      token: adminToken,
      expectedStatus: 200
    })
    const surveyList = response.json?.data
    record(
      'list surveys',
      Array.isArray(surveyList?.list) &&
      surveyList.list.some(item => Number(item.id) === Number(analyticsSurveyId)) &&
      Number(surveyList?.total) >= 1,
      { status: response.status, total: surveyList?.total }
    )

    response = await request(`/api/surveys/${analyticsSurveyId}/folder`, {
      method: 'PUT',
      token: adminToken,
      body: { folder_id: workFolderId },
      expectedStatus: 200
    })
    record('move analytics survey to folder', Number(response.json?.data?.folderId) === Number(workFolderId), { status: response.status })

    response = await request(`/api/surveys/${analyticsSurveyId}/publish`, {
      method: 'POST',
      token: adminToken,
      expectedStatus: 200
    })
    record('publish analytics survey', response.json?.data?.status === 'published', { status: response.status })

    response = await request(`/api/surveys/share/${analyticsShareCode}`, {
      expectedStatus: 200
    })
    record('public read analytics survey', Number(response.json?.data?.id) === Number(analyticsSurveyId), { status: response.status })

    const analyticsSessionA = `analytics-${runId}-a`
    response = await request(`/api/surveys/${analyticsSurveyId}/uploads`, {
      method: 'POST',
      body: createUploadForm(
        { questionId: 10, submissionToken: analyticsSessionA },
        `analytics-a-${runId}.pdf`,
        'analytics upload A'
      ),
      expectedStatus: 200
    })
    const analyticsUploadA = response.json?.data
    record('analytics upload A', Number(analyticsUploadA?.id) > 0, { status: response.status, fileId: analyticsUploadA?.id })

    response = await request(`/api/surveys/${analyticsSurveyId}/responses`, {
      method: 'POST',
      headers: {
        'User-Agent': SAFARI_IOS_UA,
        'X-Forwarded-For': '10.10.10.1'
      },
      body: {
        clientSubmissionToken: analyticsSessionA,
        duration: 30,
        answers: [
          { questionId: 1, value: 'yes' },
          { questionId: 2, value: ['api', 'ui'] },
          { questionId: 3, value: 'first note' },
          { questionId: 4, value: 5 },
          { questionId: 5, value: 5 },
          { questionId: 6, value: 9 },
          { questionId: 7, value: { 1: '1', 2: '2' } },
          { questionId: 8, value: { brand: 50, price: 30, service: 20 } },
          { questionId: 9, value: ['quality', 'speed'] },
          {
            questionId: 10,
            value: [{
              id: analyticsUploadA?.id,
              uploadToken: analyticsUploadA?.uploadToken
            }]
          },
          { questionId: 11, value: '2026-03-20' }
        ]
      },
      expectedStatus: 200
    })
    const analyticsAnswerAId = response.json?.data?.id
    record('submit analytics response A', !!analyticsAnswerAId, { status: response.status, answerId: analyticsAnswerAId })

    const analyticsSessionB = `analytics-${runId}-b`
    response = await request(`/api/surveys/${analyticsSurveyId}/uploads`, {
      method: 'POST',
      body: createUploadForm(
        { questionId: 10, submissionToken: analyticsSessionB },
        `analytics-b1-${runId}.pdf`,
        'analytics upload B1'
      ),
      expectedStatus: 200
    })
    const analyticsUploadB1 = response.json?.data
    record('analytics upload B1', Number(analyticsUploadB1?.id) > 0, { status: response.status, fileId: analyticsUploadB1?.id })

    response = await request(`/api/surveys/${analyticsSurveyId}/uploads`, {
      method: 'POST',
      body: createUploadForm(
        { questionId: 10, submissionToken: analyticsSessionB },
        `analytics-b2-${runId}.pdf`,
        'analytics upload B2'
      ),
      expectedStatus: 200
    })
    const analyticsUploadB2 = response.json?.data
    record('analytics upload B2', Number(analyticsUploadB2?.id) > 0, { status: response.status, fileId: analyticsUploadB2?.id })

    response = await request(`/api/surveys/${analyticsSurveyId}/responses`, {
      method: 'POST',
      headers: {
        'User-Agent': CHROME_WINDOWS_UA,
        'X-Forwarded-For': '10.10.10.2'
      },
      body: {
        clientSubmissionToken: analyticsSessionB,
        duration: 90,
        answers: [
          { questionId: 1, value: 'no' },
          { questionId: 2, value: ['ui'] },
          { questionId: 3, value: 'second note' },
          { questionId: 4, value: 3 },
          { questionId: 5, value: 3 },
          { questionId: 6, value: 7 },
          { questionId: 7, value: { 1: '2', 2: '1' } },
          { questionId: 8, value: { brand: 40, price: 40, service: 20 } },
          { questionId: 9, value: ['speed', 'quality'] },
          {
            questionId: 10,
            value: [
              {
                id: analyticsUploadB1?.id,
                uploadToken: analyticsUploadB1?.uploadToken
              },
              {
                id: analyticsUploadB2?.id,
                uploadToken: analyticsUploadB2?.uploadToken
              }
            ]
          },
          { questionId: 11, value: '2026-03-22' }
        ]
      },
      expectedStatus: 200
    })
    const analyticsAnswerBId = response.json?.data?.id
    record('submit analytics response B', !!analyticsAnswerBId, { status: response.status, answerId: analyticsAnswerBId })

    response = await request(`/api/answers?survey_id=${analyticsSurveyId}&page=1&pageSize=20`, {
      token: adminToken,
      expectedStatus: 200
    })
    const answerList = response.json?.data
    record(
      'list survey answers',
      Number(answerList?.total) >= 2 &&
      Array.isArray(answerList?.list) &&
      answerList.list.some(item => Number(item.id) === Number(analyticsAnswerAId)) &&
      answerList.list.some(item => Number(item.id) === Number(analyticsAnswerBId)),
      { status: response.status, total: answerList?.total }
    )

    response = await request(`/api/answers/count?survey_id=${analyticsSurveyId}`, {
      token: adminToken,
      expectedStatus: 200
    })
    record('count survey answers', Number(response.json?.data?.count) >= 2, { status: response.status, count: response.json?.data?.count })

    response = await request(`/api/answers/${analyticsAnswerAId}`, {
      token: adminToken,
      expectedStatus: 200
    })
    record(
      'read answer detail',
      Number(response.json?.data?.id) === Number(analyticsAnswerAId) &&
      Number(response.json?.data?.survey_id) === Number(analyticsSurveyId),
      { status: response.status, answerId: response.json?.data?.id }
    )

    let binaryResponse = await request('/api/answers/download/survey', {
      method: 'POST',
      token: adminToken,
      body: { survey_id: analyticsSurveyId },
      expectedStatus: 200,
      parse: 'buffer'
    })
    record(
      'download survey excel',
      String(binaryResponse.headers.get('content-type') || '').includes('spreadsheetml') &&
      String(binaryResponse.headers.get('content-disposition') || '').includes(`survey-${analyticsSurveyId}.xlsx`) &&
      binaryResponse.buffer.length > 100,
      { status: binaryResponse.status, bytes: binaryResponse.buffer.length }
    )

    binaryResponse = await request('/api/answers/download/attachments', {
      method: 'POST',
      token: adminToken,
      body: { survey_id: analyticsSurveyId },
      expectedStatus: 200,
      parse: 'buffer'
    })
    record(
      'download attachment zip',
      String(binaryResponse.headers.get('content-type') || '') === 'application/zip' &&
      String(binaryResponse.headers.get('content-disposition') || '').includes(`survey-${analyticsSurveyId}-attachments.zip`) &&
      binaryResponse.buffer.length > 20 &&
      binaryResponse.buffer.subarray(0, 2).toString() === 'PK',
      { status: binaryResponse.status, bytes: binaryResponse.buffer.length }
    )

    response = await request(`/api/surveys/${analyticsSurveyId}/results`, {
      token: adminToken,
      expectedStatus: 200
    })
    const resultsData = response.json?.data || {}
    const radioStat = findQuestionStat(resultsData.questionStats, 1)
    const ratingStat = findQuestionStat(resultsData.questionStats, 5)
    const ratioStat = findQuestionStat(resultsData.questionStats, 8)
    const uploadStat = findQuestionStat(resultsData.questionStats, 10)

    record(
      'results summary',
      Number(resultsData.totalSubmissions) === 2 &&
      Number(resultsData.total) === 2 &&
      Number(resultsData.today) === 2 &&
      Array.isArray(resultsData.questionStats) &&
      resultsData.questionStats.length === 11,
      { status: response.status }
    )
    record(
      'results ratio stats',
      ratioStat?.options?.some(option => option.value === 'brand' && Number(option.avgShare) === 45) &&
      ratioStat?.options?.some(option => option.value === 'price' && Number(option.avgShare) === 35) &&
      ratioStat?.options?.some(option => option.value === 'service' && Number(option.avgShare) === 20),
      { status: response.status }
    )
    record(
      'results radio stats',
      radioStat?.options?.some(option => option.value === 'yes' && Number(option.count) === 1 && Number(option.percentage) === 50) &&
      radioStat?.options?.some(option => option.value === 'no' && Number(option.count) === 1 && Number(option.percentage) === 50),
      { status: response.status }
    )
    record(
      'results rating stats',
      Number(ratingStat?.avgScore) === 4 &&
      Number(ratingStat?.distribution?.['5']) === 50 &&
      Number(ratingStat?.distribution?.['3']) === 50,
      { status: response.status }
    )
    record(
      'results upload stats',
      Number(uploadStat?.totalAnswers) === 2 &&
      Number(uploadStat?.totalFiles) === 3 &&
      Array.isArray(uploadStat?.sampleFiles) &&
      uploadStat.sampleFiles.length === 3,
      { status: response.status }
    )
    record(
      'results system stats',
      countListHas(resultsData?.systemStats?.devices, 'Desktop', 1) &&
      countListHas(resultsData?.systemStats?.devices, 'Mobile', 1) &&
      countListHas(resultsData?.systemStats?.browsers, 'Chrome', 1) &&
      countListHas(resultsData?.systemStats?.browsers, 'Safari', 1) &&
      countListHas(resultsData?.systemStats?.operatingSystems, 'Windows', 1) &&
      countListHas(resultsData?.systemStats?.operatingSystems, 'iOS', 1),
      { status: response.status }
    )
    record(
      'results region empty state',
      resultsData?.regionStats?.hasLocationData === false &&
      Number(resultsData?.regionStats?.missingCount) === 2 &&
      Array.isArray(resultsData?.regionStats?.items) &&
      resultsData.regionStats.items.length === 0,
      { status: response.status }
    )

    response = await request('/api/answers/batch', {
      method: 'DELETE',
      token: adminToken,
      body: { ids: [analyticsAnswerAId] },
      expectedStatus: 200
    })
    record('delete answer batch', Number(response.json?.data?.deleted) === 1, { status: response.status, deleted: response.json?.data?.deleted })
    markFileDeleted(analyticsUploadA?.id)

    response = await request(`/api/answers/count?survey_id=${analyticsSurveyId}`, {
      token: adminToken,
      expectedStatus: 200
    })
    record('answer count sync after delete', Number(response.json?.data?.count) === 1, { status: response.status, count: response.json?.data?.count })

    response = await request(`/api/surveys/${analyticsSurveyId}/results`, {
      token: adminToken,
      expectedStatus: 200
    })
    record(
      'results sync after delete',
      Number(response.json?.data?.totalSubmissions) === 1 &&
      Number(response.json?.data?.total) === 1,
      { status: response.status, total: response.json?.data?.total }
    )

    response = await request('/api/messages?types=audit,system', {
      token: adminToken,
      expectedStatus: 200
    })
    const messages = response.json?.data || []
    record('list messages', Array.isArray(messages) && messages.length > 0, { status: response.status, count: messages.length })

    if (messages.length > 0) {
      const firstMessageId = messages[0].id
      const markRead = await request(`/api/messages/${firstMessageId}/read`, {
        method: 'POST',
        token: adminToken,
        expectedStatus: 200
      })
      record('mark message read', markRead.json?.data?.read === true, { status: markRead.status, messageId: firstMessageId })
    }

    response = await request('/api/audits?page=1&pageSize=20', {
      token: adminToken,
      expectedStatus: 200
    })
    record(
      'list audits',
      Array.isArray(response.json?.data?.list) && response.json.data.list.length > 0 && Number(response.json?.data?.total) >= 1,
      { status: response.status, total: response.json?.data?.total }
    )

    response = await request(`/api/surveys/${analyticsSurveyId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('move analytics survey to trash', !!response.json?.data?.deletedAt, { status: response.status })

    response = await request('/api/surveys/trash', {
      token: adminToken,
      expectedStatus: 200
    })
    const trashList = response.json?.data
    record(
      'list trash',
      Array.isArray(trashList?.list) &&
      trashList.list.some(item => Number(item.id) === Number(analyticsSurveyId)) &&
      Number(trashList?.total) >= 1,
      { status: response.status, count: trashList?.total }
    )

    response = await request(`/api/surveys/${analyticsSurveyId}/restore`, {
      method: 'POST',
      token: adminToken,
      expectedStatus: 200
    })
    record('restore analytics survey', Number(response.json?.data?.id) === Number(analyticsSurveyId) && !response.json?.data?.deletedAt, { status: response.status })

    response = await request(`/api/surveys/${analyticsSurveyId}/close`, {
      method: 'POST',
      token: adminToken,
      expectedStatus: 200
    })
    record('close analytics survey', response.json?.data?.status === 'closed', { status: response.status })

    response = await request(`/api/surveys/${analyticsSurveyId}/responses`, {
      method: 'POST',
      body: {
        clientSubmissionToken: `analytics-${runId}-closed`,
        answers: [{ questionId: 1, value: 'yes' }]
      },
      expectedStatus: 400
    })
    record('closed survey blocks submissions', response.json?.error?.code === 'NOT_PUBLISHED', { status: response.status })

    response = await request('/api/surveys', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Smoke Trash ${runId}`,
        description: 'trash cleanup smoke survey',
        questions: [{
          type: 'radio',
          title: 'Keep this survey?',
          options: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' }
          ]
        }]
      },
      expectedStatus: 200
    })
    const trashSurveyId = response.json?.data?.id
    record('create trash cleanup survey', !!trashSurveyId, { status: response.status, surveyId: trashSurveyId })

    response = await request(`/api/surveys/${trashSurveyId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('trash cleanup survey delete', !!response.json?.data?.deletedAt, { status: response.status })

    await deleteManagedFile(uploadGuardFileA?.id, adminToken)
    await deleteManagedFile(uploadGuardFileB?.id, adminToken)
    await deleteManagedFile(analyticsUploadA?.id, adminToken)
    await deleteManagedFile(analyticsUploadB1?.id, adminToken)
    await deleteManagedFile(analyticsUploadB2?.id, adminToken)
    await request(`/api/surveys/${uploadValidationSurveyId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    await request(`/api/surveys/${analyticsSurveyId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })

    response = await request('/api/surveys/trash', {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('clear trash', Number(response.json?.data?.deleted) >= 1, { status: response.status, deleted: response.json?.data?.deleted })

    response = await request(`/api/folders/${workFolderId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('delete work folder', response.json?.success === true, { status: response.status })

    await request(`/api/folders/${childFolderId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    response = await request(`/api/folders/${parentFolderId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('delete parent and child folders', response.json?.success === true, { status: response.status })

    response = await request(`/api/depts/${deptId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('delete department and clear members', Number(response.json?.data?.clearedUsers) === 1, { status: response.status, clearedUsers: response.json?.data?.clearedUsers })

    response = await request(`/api/users/${importedUsername}`, {
      token: adminToken,
      expectedStatus: 200
    })
    record('imported member dept cleared', response.json?.data?.dept_id == null, { status: response.status })

    await request(`/api/users/${basicUsername}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    await request(`/api/users/${importedUserId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('delete imported member', true, { status: 200 })

    response = await request(`/api/positions/${positionId}`, {
      method: 'DELETE',
      token: adminToken,
      expectedStatus: 200
    })
    record('delete position', response.json?.success === true, { status: response.status })

    const passed = results.filter(item => item.ok).length
    const failed = results.filter(item => !item.ok).length
    const summary = {
      runId,
      environment: {
        dbHost: env.DB_HOST,
        dbPort: env.DB_PORT,
        dbName: env.DB_NAME,
        port: env.PORT
      },
      passed,
      failed,
      results
    }
    console.log(JSON.stringify(summary, null, 2))
    if (failed > 0) process.exitCode = 1
  } catch (error) {
    const summary = {
      runId,
      environment: {
        dbHost: env.DB_HOST,
        dbPort: env.DB_PORT,
        dbName: env.DB_NAME,
        port: env.PORT
      },
      error: String(error),
      results,
      serverLogs: {
        stdout: stdout.slice(-20),
        stderr: stderr.slice(-20)
      }
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
