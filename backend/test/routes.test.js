import test, { after, afterEach, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import config from '../src/config/index.js'
import Dept from '../src/models/Dept.js'
import User from '../src/models/User.js'
import AuditLog from '../src/models/AuditLog.js'
import Message from '../src/models/Message.js'
import Survey from '../src/models/Survey.js'
import Answer from '../src/models/Answer.js'
import FileModel from '../src/models/File.js'
import Position from '../src/models/Position.js'
import { UPLOAD_DIR } from '../src/utils/uploadStorage.js'

let server
let baseUrl

const originalDeptMethods = {
  findById: Dept.findById,
  countChildren: Dept.countChildren,
  countUsers: Dept.countUsers,
  clearUsersDept: Dept.clearUsersDept,
  delete: Dept.delete
}

const originalUserMethods = {
  findById: User.findById,
  findByUsername: User.findByUsername,
  create: User.create
}

const originalAuditCreate = AuditLog.create
const originalMessageCreate = Message.create
const originalSurveyMethods = {
  findById: Survey.findById,
  findByIdentifier: Survey.findByIdentifier,
  incrementResponseCount: Survey.incrementResponseCount,
  softDelete: Survey.softDelete,
  listTrash: Survey.listTrash,
  listTrashIds: Survey.listTrashIds,
  clearTrash: Survey.clearTrash
}
const originalAnswerMethods = {
  create: Answer.create,
  countByIp: Answer.countByIp,
  deleteBySurveyIds: Answer.deleteBySurveyIds,
  findBySurveyId: Answer.findBySurveyId
}
const originalFileMethods = {
  create: FileModel.create,
  findByIds: FileModel.findByIds,
  listAnswerFilesBySurveyId: FileModel.listAnswerFilesBySurveyId,
  countPendingBySurveyQuestionSession: FileModel.countPendingBySurveyQuestionSession,
  attachToAnswer: FileModel.attachToAnswer,
  listExpiredPending: FileModel.listExpiredPending,
  listPendingBySubmission: FileModel.listPendingBySubmission,
  deleteByIds: FileModel.deleteByIds
}
const originalPositionMethods = {
  list: Position.list,
  findById: Position.findById,
  findByCode: Position.findByCode,
  create: Position.create,
  update: Position.update,
  delete: Position.delete
}

function applyDefaultFileStubs() {
  FileModel.listExpiredPending = async () => []
  FileModel.deleteByIds = async () => 0
  FileModel.attachToAnswer = async () => 0
  FileModel.listPendingBySubmission = async () => []
  FileModel.countPendingBySurveyQuestionSession = async () => 0
}

function adminToken() {
  return jwt.sign(
    { sub: 1, username: 'admin', roleCode: 'admin' },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${adminToken()}`,
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const json = await response.json()
  return { response, json }
}

async function requestRaw(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${adminToken()}`,
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  return { response, buffer }
}

async function requestPublic(path, { method = 'GET', body, headers } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body
  })
  const json = await response.json()
  return { response, json }
}

before(async () => {
  applyDefaultFileStubs()
  server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}/api`
})

after(async () => {
  await new Promise(resolve => server.close(resolve))
})

afterEach(() => {
  Dept.findById = originalDeptMethods.findById
  Dept.countChildren = originalDeptMethods.countChildren
  Dept.countUsers = originalDeptMethods.countUsers
  Dept.clearUsersDept = originalDeptMethods.clearUsersDept
  Dept.delete = originalDeptMethods.delete

  User.findById = originalUserMethods.findById
  User.findByUsername = originalUserMethods.findByUsername
  User.create = originalUserMethods.create

  AuditLog.create = originalAuditCreate
  Message.create = originalMessageCreate

  Survey.findByIdentifier = originalSurveyMethods.findByIdentifier
  Survey.findById = originalSurveyMethods.findById
  Survey.incrementResponseCount = originalSurveyMethods.incrementResponseCount
  Survey.softDelete = originalSurveyMethods.softDelete
  Survey.listTrash = originalSurveyMethods.listTrash
  Survey.listTrashIds = originalSurveyMethods.listTrashIds
  Survey.clearTrash = originalSurveyMethods.clearTrash
  Answer.create = originalAnswerMethods.create
  Answer.countByIp = originalAnswerMethods.countByIp
  Answer.deleteBySurveyIds = originalAnswerMethods.deleteBySurveyIds
  Answer.findBySurveyId = originalAnswerMethods.findBySurveyId
  FileModel.create = originalFileMethods.create
  FileModel.findByIds = originalFileMethods.findByIds
  FileModel.listAnswerFilesBySurveyId = originalFileMethods.listAnswerFilesBySurveyId
  FileModel.countPendingBySurveyQuestionSession = originalFileMethods.countPendingBySurveyQuestionSession
  FileModel.attachToAnswer = originalFileMethods.attachToAnswer
  FileModel.listExpiredPending = originalFileMethods.listExpiredPending
  FileModel.listPendingBySubmission = originalFileMethods.listPendingBySubmission
  FileModel.deleteByIds = originalFileMethods.deleteByIds
  Position.list = originalPositionMethods.list
  Position.findById = originalPositionMethods.findById
  Position.findByCode = originalPositionMethods.findByCode
  Position.create = originalPositionMethods.create
  Position.update = originalPositionMethods.update
  Position.delete = originalPositionMethods.delete
  applyDefaultFileStubs()
})

test('DELETE /api/depts/:id rejects deleting a department with child departments', async () => {
  Dept.findById = async () => ({ id: 7, name: 'Ops' })
  Dept.countChildren = async () => 2
  Dept.countUsers = async () => {
    throw new Error('countUsers should not run when child departments exist')
  }

  const { response, json } = await request('/depts/7', { method: 'DELETE' })

  assert.equal(response.status, 409)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'DEPT_HAS_CHILDREN')
})

test('DELETE /api/depts/:id clears member dept assignments before deleting', async () => {
  let cleared = 0
  let deleted = 0

  Dept.findById = async () => ({ id: 8, name: 'Sales' })
  Dept.countChildren = async () => 0
  Dept.countUsers = async () => 3
  Dept.clearUsersDept = async id => { cleared = id }
  Dept.delete = async id => { deleted = id }
  AuditLog.create = async () => ({ id: 1 })
  Message.create = async () => ({ id: 1 })

  const { response, json } = await request('/depts/8', { method: 'DELETE' })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.clearedUsers, 3)
  assert.equal(cleared, '8')
  assert.equal(deleted, '8')
})

test('POST /api/users/import reports created and skipped rows correctly', async () => {
  const createdUsers = []

  User.findByUsername = async username => {
    if (username === 'existing') return { id: 99, username }
    return null
  }
  User.create = async payload => {
    createdUsers.push(payload.username)
    return { id: createdUsers.length, ...payload }
  }
  AuditLog.create = async () => ({ id: 1 })
  Message.create = async () => ({ id: 1 })

  const { response, json } = await request('/users/import', {
    method: 'POST',
    body: {
      users: [
        { username: 'alice', password: 'p1', email: 'alice@example.com' },
        { username: '', password: 'p2' },
        { username: 'alice', password: 'p3' },
        { username: 'existing', password: 'p4' }
      ]
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data.created, 1)
  assert.deepEqual(json.data.skipped, 3)
  assert.equal(createdUsers.length, 1)
  assert.deepEqual(
    json.data.errors.map(item => item.reason),
    ['username is required', 'duplicate username in import payload', 'user already exists']
  )
})

test('GET /api/positions returns stored positions', async () => {
  Position.list = async () => ([
    { id: 1, name: 'Manager', code: 'manager', is_virtual: false },
    { id: 2, name: 'Virtual Reviewer', code: 'virtual-reviewer', is_virtual: true }
  ])

  const { response, json } = await request('/positions')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, [
    { id: 1, name: 'Manager', code: 'manager', is_virtual: false },
    { id: 2, name: 'Virtual Reviewer', code: 'virtual-reviewer', is_virtual: true }
  ])
})

test('POST /api/positions rejects duplicate codes', async () => {
  Position.findByCode = async code => code === 'manager' ? { id: 1, code } : null

  const { response, json } = await request('/positions', {
    method: 'POST',
    body: {
      name: 'Manager 2',
      code: 'manager'
    }
  })

  assert.equal(response.status, 409)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'POSITION_EXISTS')
})

test('DELETE /api/surveys/:id soft deletes a survey into trash', async () => {
  Survey.findByIdentifier = async () => ({ id: 11, creator_id: 1, title: 'Q1', deletedAt: null })
  Survey.softDelete = async () => ({ id: 11, deletedAt: '2026-03-23T10:00:00.000Z' })
  AuditLog.create = async () => ({ id: 1 })
  Message.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys/11', { method: 'DELETE' })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 11)
  assert.ok(json.data.deletedAt)
})

test('DELETE /api/surveys/trash clears trashed surveys and answer rows', async () => {
  let deletedSurveyIds = []

  Survey.listTrashIds = async () => [21, 22]
  Answer.deleteBySurveyIds = async ids => { deletedSurveyIds = ids; return ids.length }
  Survey.clearTrash = async () => 2
  AuditLog.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys/trash', { method: 'DELETE' })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.deleted, 2)
  assert.deepEqual(deletedSurveyIds, [21, 22])
})

test('GET /api/surveys/:id/results returns question level statistics', async () => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const toDateKey = value => {
    const date = new Date(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  Survey.findByIdentifier = async () => ({
    id: 51,
    creator_id: 1,
    title: 'Analytics Survey',
    questions: [
      { type: 'radio', title: '单选题', options: [{ label: '是', value: 'yes' }, { label: '否', value: 'no' }] },
      { type: 'checkbox', title: '多选题', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
      { type: 'input', title: '填空题' },
      { type: 'slider', title: '滑动条' },
      { type: 'rating', title: '评分题' },
      { type: 'scale', title: '量表题' },
      {
        type: 'matrix',
        title: '矩阵单选题',
        options: [{ label: '满意', value: '1' }, { label: '一般', value: '2' }, { label: '不满意', value: '3' }],
        matrix: {
          selectionType: 'single',
          rows: [{ label: '服务态度', value: '1' }, { label: '响应速度', value: '2' }]
        }
      },
      {
        type: 'matrix',
        title: '矩阵多选题',
        options: [{ label: '熟悉', value: '1' }, { label: '可独立完成', value: '2' }, { label: '需支持', value: '3' }],
        matrix: {
          selectionType: 'multiple',
          rows: [{ label: '产品知识', value: '1' }, { label: '系统操作', value: '2' }]
        }
      },
      {
        type: 'matrix',
        uiType: 24,
        title: '矩阵下拉题',
        options: [{ label: '高', value: '1' }, { label: '中', value: '2' }, { label: '低', value: '3' }],
        matrix: {
          selectionType: 'single',
          rows: [{ label: '交付质量', value: '1' }, { label: '协作效率', value: '2' }]
        }
      },
      { type: 'ratio', title: '比重题', options: [{ label: '品牌', value: '1' }, { label: '售价', value: '2' }, { label: '服务', value: '3' }] },
      { type: 'ranking', title: '排序题', options: [{ label: '甲', value: 'x' }, { label: '乙', value: 'y' }] },
      { type: 'upload', title: '上传题' },
      { type: 'date', title: '日期题' }
    ]
  })

  Answer.findBySurveyId = async () => ([
    {
      id: 1,
      status: 'completed',
      duration: 30,
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      submitted_at: now.toISOString(),
      answers_data: [
        { questionId: 1, questionType: 'radio', value: 'yes' },
        { questionId: 2, questionType: 'checkbox', value: ['a', 'b'] },
        { questionId: 3, questionType: 'input', value: '第一条' },
        { questionId: 4, questionType: 'slider', value: 5 },
        { questionId: 5, questionType: 'rating', value: 5 },
        { questionId: 6, questionType: 'scale', value: 9 },
        { questionId: 7, questionType: 'matrix', value: { 1: '1', 2: '2' } },
        { questionId: 8, questionType: 'matrix', value: { 1: ['1', '2'], 2: ['2'] } },
        { questionId: 9, questionType: 'matrix', value: { 1: '1', 2: '2' } },
        { questionId: 10, questionType: 'ratio', value: { 1: 50, 2: 30, 3: 20 } },
        { questionId: 11, questionType: 'ranking', value: ['x', 'y'] },
        { questionId: 12, questionType: 'upload', value: [{ id: 101, name: 'a.pdf', url: '/uploads/a.pdf', size: 123, type: 'application/pdf' }] },
        { questionId: 13, questionType: 'date', value: '2026-03-20' }
      ]
    },
    {
      id: 2,
      status: 'incomplete',
      duration: 90,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      submitted_at: yesterday.toISOString(),
      answers_data: [
        { questionId: 1, questionType: 'radio', value: 'no' },
        { questionId: 2, questionType: 'checkbox', value: ['b'] },
        { questionId: 3, questionType: 'input', value: '第二条' },
        { questionId: 4, questionType: 'slider', value: 3 },
        { questionId: 5, questionType: 'rating', value: 3 },
        { questionId: 6, questionType: 'scale', value: 7 },
        { questionId: 7, questionType: 'matrix', value: { 1: '2', 2: '1' } },
        { questionId: 8, questionType: 'matrix', value: { 1: ['2'], 2: ['1', '3'] } },
        { questionId: 9, questionType: 'matrix', value: { 1: '2', 2: '1' } },
        { questionId: 10, questionType: 'ratio', value: { 1: 40, 2: 40, 3: 20 } },
        { questionId: 11, questionType: 'ranking', value: ['y', 'x'] },
        {
          questionId: 12,
          questionType: 'upload',
          value: [
            { id: 102, name: 'b.pdf', url: '/uploads/b.pdf', size: 456, type: 'application/pdf' },
            { id: 103, name: 'c.pdf', url: '/uploads/c.pdf', size: 789, type: 'application/pdf' }
          ]
        },
        { questionId: 13, questionType: 'date', value: '2026-03-22' }
      ]
    }
  ])

  const { response, json } = await request('/surveys/51/results')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.totalSubmissions, 2)
  assert.equal(json.data.total, 2)
  assert.equal(json.data.today, 1)
  assert.equal(json.data.completed, 1)
  assert.equal(json.data.incomplete, 1)
  assert.equal(json.data.completionRate, 50)
  assert.ok(Array.isArray(json.data.questionStats))
  assert.equal(json.data.questionStats.length, 13)
  assert.deepEqual(json.data.systemStats.devices, [
    { label: 'Desktop', value: '1' },
    { label: 'Mobile', value: '1' }
  ])
  assert.deepEqual(json.data.systemStats.browsers, [
    { label: 'Chrome', value: '1' },
    { label: 'Safari', value: '1' }
  ])
  assert.deepEqual(json.data.systemStats.operatingSystems, [
    { label: 'iOS', value: '1' },
    { label: 'Windows', value: '1' }
  ])
  assert.equal(json.data.submissionTrend.length, 30)
  assert.equal(json.data.submissionTrend.at(-1).date, toDateKey(now))
  assert.equal(json.data.submissionTrend.at(-1).count, 1)
  assert.equal(json.data.submissionTrend.at(-2).date, toDateKey(yesterday))
  assert.equal(json.data.submissionTrend.at(-2).count, 1)
  assert.deepEqual(json.data.regionStats, {
    hasLocationData: false,
    scope: 'submission-origin',
    missingCount: 2,
    items: [],
    emptyReason: 'No province/city source is stored for submissions yet.'
  })

  const radioStat = json.data.questionStats.find(item => item.questionId === 1)
  assert.equal(radioStat.options[0].count, 1)
  assert.equal(radioStat.options[0].percentage, 50)
  assert.equal(radioStat.options[1].count, 1)

  const inputStat = json.data.questionStats.find(item => item.questionId === 3)
  assert.deepEqual(inputStat.sampleAnswers, ['第一条', '第二条'])

  const sliderStat = json.data.questionStats.find(item => item.questionId === 4)
  assert.equal(sliderStat.avgValue, 4)
  assert.equal(sliderStat.minValue, 3)
  assert.equal(sliderStat.maxValue, 5)

  const ratingStat = json.data.questionStats.find(item => item.questionId === 5)
  assert.equal(ratingStat.avgScore, 4)
  assert.equal(ratingStat.distribution['5'], 50)
  assert.equal(ratingStat.distribution['3'], 50)

  const scaleStat = json.data.questionStats.find(item => item.questionId === 6)
  assert.equal(scaleStat.avgScore, 8)
  assert.equal(scaleStat.distribution['9'], 50)
  assert.equal(scaleStat.distribution['7'], 50)

  const matrixStat = json.data.questionStats.find(item => item.questionId === 7)
  assert.equal(matrixStat.rows.length, 2)
  assert.equal(matrixStat.rows[0].options[0].count, 1)
  assert.equal(matrixStat.rows[0].options[1].count, 1)
  assert.equal(matrixStat.rows[1].options[0].count, 1)
  assert.equal(matrixStat.rows[1].options[1].count, 1)

  const matrixMultiStat = json.data.questionStats.find(item => item.questionId === 8)
  assert.equal(matrixMultiStat.matrixMode, 'multiple')
  assert.equal(matrixMultiStat.rows[0].options[0].count, 1)
  assert.equal(matrixMultiStat.rows[0].options[1].count, 2)
  assert.equal(matrixMultiStat.rows[1].options[0].count, 1)
  assert.equal(matrixMultiStat.rows[1].options[1].count, 1)
  assert.equal(matrixMultiStat.rows[1].options[2].count, 1)

  const matrixDropdownStat = json.data.questionStats.find(item => item.questionId === 9)
  assert.equal(matrixDropdownStat.matrixMode, 'single')
  assert.equal(matrixDropdownStat.rows[0].options[0].count, 1)
  assert.equal(matrixDropdownStat.rows[0].options[1].count, 1)
  assert.equal(matrixDropdownStat.rows[1].options[0].count, 1)
  assert.equal(matrixDropdownStat.rows[1].options[1].count, 1)

  const ratioStat = json.data.questionStats.find(item => item.questionId === 10)
  assert.equal(ratioStat.options[0].avgShare, 45)
  assert.equal(ratioStat.options[1].avgShare, 35)
  assert.equal(ratioStat.options[2].avgShare, 20)
  assert.equal(ratioStat.options[0].count, 2)

  const rankingStat = json.data.questionStats.find(item => item.questionId === 11)
  assert.equal(rankingStat.options[0].avgRank, 1.5)
  assert.equal(rankingStat.options[1].avgRank, 1.5)

  const uploadStat = json.data.questionStats.find(item => item.questionId === 12)
  assert.equal(uploadStat.totalAnswers, 2)
  assert.equal(uploadStat.totalFiles, 3)
  assert.equal(uploadStat.sampleFiles.length, 3)

  const dateStat = json.data.questionStats.find(item => item.questionId === 13)
  assert.equal(dateStat.earliestDate, '2026-03-20')
  assert.equal(dateStat.latestDate, '2026-03-22')
})

test('GET /api/surveys/:id/results aggregates available region data', async () => {
  Survey.findByIdentifier = async () => ({
    id: 52,
    creator_id: 1,
    title: 'Region Survey',
    questions: []
  })

  Answer.findBySurveyId = async () => ([
    {
      id: 11,
      province: 'Guangdong',
      city: 'Shenzhen',
      submitted_at: new Date().toISOString(),
      answers_data: []
    },
    {
      id: 12,
      province_name: 'Guangdong',
      city_name: 'Shenzhen',
      submitted_at: new Date().toISOString(),
      answers_data: []
    },
    {
      id: 13,
      geo_province: 'Zhejiang',
      geo_city: 'Hangzhou',
      submitted_at: new Date().toISOString(),
      answers_data: []
    }
  ])

  const { response, json } = await request('/surveys/52/results')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data.regionStats, {
    hasLocationData: true,
    scope: 'submission-origin',
    missingCount: 0,
    items: [
      { label: 'Guangdong / Shenzhen', value: '2' },
      { label: 'Zhejiang / Hangzhou', value: '1' }
    ],
    emptyReason: null
  })
})

test('POST /api/answers/download/attachments streams a zip for managed survey files', async () => {
  const fixtureName = 'attachments-fixture.txt'
  const fixturePath = `${UPLOAD_DIR}/${fixtureName}`
  fs.writeFileSync(fixturePath, 'attachment fixture')

  Survey.findById = async () => ({
    id: 61,
    creator_id: 1,
    title: 'Attachment Survey'
  })
  FileModel.listAnswerFilesBySurveyId = async () => ([
    {
      id: 7001,
      answer_id: 88,
      survey_id: 61,
      name: 'evidence.txt',
      url: `/uploads/${fixtureName}`
    }
  ])

  try {
    const { response, buffer } = await requestRaw('/answers/download/attachments', {
      method: 'POST',
      body: { survey_id: 61 }
    })

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/zip')
    assert.match(response.headers.get('content-disposition') || '', /survey-61-attachments\.zip/)
    assert.ok(buffer.length > 20)
    assert.equal(buffer.subarray(0, 2).toString(), 'PK')
  } finally {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath)
  }
})

test('POST /api/surveys/:id/uploads allows public uploads for published surveys', async () => {
  const beforeFiles = fs.existsSync(UPLOAD_DIR) ? new Set(fs.readdirSync(UPLOAD_DIR)) : new Set()
  let createdPayload = null

  Survey.findByIdentifier = async () => ({
    id: 31,
    creator_id: 1,
    title: 'Upload Survey',
    status: 'published',
    settings: {},
    questions: [{ type: 'upload', title: '附件', required: false, order: 1 }]
  })
  FileModel.create = async payload => {
    createdPayload = payload
    return { id: 501, ...payload }
  }

  const form = new FormData()
  form.append('file', new Blob(['hello public upload'], { type: 'application/pdf' }), 'public-upload.pdf')

  try {
    const { response, json } = await requestPublic('/surveys/31/uploads', {
      method: 'POST',
      body: form
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.id, 501)
    assert.equal(json.data.surveyId, 31)
    assert.ok(typeof json.data.uploadToken === 'string' && json.data.uploadToken.length >= 20)
    assert.equal(createdPayload.survey_id, 31)
    assert.equal(createdPayload.name, 'public-upload.pdf')
    assert.equal(createdPayload.type, 'application/pdf')
    assert.ok(createdPayload.public_token)
  } finally {
    const afterFiles = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []
    for (const file of afterFiles) {
      if (!beforeFiles.has(file)) {
        fs.unlinkSync(`${UPLOAD_DIR}/${file}`)
      }
    }
  }
})

test('POST /api/surveys/:id/uploads rejects files beyond the upload question limit', async () => {
  Survey.findByIdentifier = async () => ({
    id: 32,
    creator_id: 1,
    title: 'Limited Upload Survey',
    status: 'published',
    settings: {},
    questions: [{
      type: 'upload',
      title: '附件',
      required: false,
      order: 1,
      upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' }
    }]
  })

  let createCalled = false
  FileModel.create = async () => {
    createCalled = true
    return { id: 999 }
  }
  FileModel.countPendingBySurveyQuestionSession = async () => 1

  const form = new FormData()
  form.append('questionId', '1')
  form.append('submissionToken', 'session-32')
  form.append('file', new Blob(['hello again'], { type: 'application/pdf' }), 'limit.pdf')

  const { response, json } = await requestPublic('/surveys/32/uploads', {
    method: 'POST',
    body: form
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'UPLOAD_VALIDATION')
  assert.equal(createCalled, false)
})

test('POST /api/surveys/:id/responses rejects upload answers with invalid upload tokens', async () => {
  Survey.findByIdentifier = async () => ({
    id: 41,
    creator_id: 1,
    title: 'Upload Answer Survey',
    status: 'published',
    settings: {},
    questions: [{ type: 'upload', title: '附件', required: true, order: 1 }]
  })
  FileModel.findByIds = async () => ([
    { id: 9001, survey_id: 41, submission_token: 'session-41', public_token: 'correct-token', name: 'x.pdf', url: '/uploads/x.pdf', size: 123, type: 'application/pdf' }
  ])

  const { response, json } = await requestPublic('/surveys/41/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSubmissionToken: 'session-41',
      answers: [
        {
          questionId: 1,
          value: [{ id: 9001, uploadToken: 'wrong-token' }]
        }
      ]
    })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
})

test('POST /api/surveys/:id/responses accepts matrix multiple and dropdown answers', async () => {
  let createdPayload = null

  Survey.findByIdentifier = async () => ({
    id: 44,
    creator_id: 1,
    title: 'Matrix Submission Survey',
    status: 'published',
    settings: {},
    questions: [
      {
        type: 'matrix',
        title: '矩阵多选',
        required: true,
        order: 1,
        options: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }, { label: 'C', value: '3' }],
        matrix: {
          selectionType: 'multiple',
          rows: [{ label: '能力一', value: '1' }, { label: '能力二', value: '2' }]
        }
      },
      {
        type: 'matrix',
        uiType: 24,
        title: '矩阵下拉',
        required: true,
        order: 2,
        options: [{ label: '高', value: '1' }, { label: '中', value: '2' }],
        matrix: {
          selectionType: 'single',
          rows: [{ label: '质量', value: '1' }]
        }
      }
    ]
  })
  Answer.countByIp = async () => 0
  Answer.create = async payload => {
    createdPayload = payload
    return { id: 601, ...payload }
  }
  Survey.incrementResponseCount = async () => 1
  Message.create = async () => ({ id: 1 })

  const { response, json } = await requestPublic('/surveys/44/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: [
        { questionId: 1, value: { 1: ['1', '2'], 2: ['3'] } },
        { questionId: 2, value: { 1: '2' } }
      ]
    })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(createdPayload?.answers_data, [
    { questionId: 1, questionType: 'matrix', value: { 1: ['1', '2'], 2: ['3'] } },
    { questionId: 2, questionType: 'matrix', value: { 1: '2' } }
  ])
})

test('POST /api/surveys/:id/responses accepts ratio answers totaling 100', async () => {
  let createdPayload = null

  Survey.findByIdentifier = async () => ({
    id: 45,
    creator_id: 1,
    title: 'Ratio Submission Survey',
    status: 'published',
    settings: {},
    questions: [
      {
        type: 'ratio',
        title: '比重题',
        required: true,
        order: 1,
        options: [{ label: '品牌', value: '1' }, { label: '价格', value: '2' }, { label: '服务', value: '3' }]
      }
    ]
  })
  Answer.countByIp = async () => 0
  Answer.create = async payload => {
    createdPayload = payload
    return { id: 602, ...payload }
  }
  Survey.incrementResponseCount = async () => 1
  Message.create = async () => ({ id: 1 })

  const { response, json } = await requestPublic('/surveys/45/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: [
        { questionId: 1, value: { 1: 40, 2: 35, 3: 25 } }
      ]
    })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(createdPayload?.answers_data, [
    { questionId: 1, questionType: 'ratio', value: { 1: 40, 2: 35, 3: 25 } }
  ])
})

test('POST /api/surveys/:id/responses accepts upload answers with minimal file references', async () => {
  let createdPayload = null
  let attachedIds = null
  let incrementedSurveyId = null
  let systemMessageCreated = false

  Survey.findByIdentifier = async () => ({
    id: 40,
    creator_id: 1,
    title: 'Upload Answer Survey',
    status: 'published',
    settings: {},
    questions: [{
      type: 'upload',
      title: '闄勪欢',
      required: true,
      order: 1,
      upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' }
    }]
  })
  FileModel.findByIds = async () => ([
    {
      id: 9000,
      survey_id: 40,
      question_order: 1,
      submission_token: 'session-40',
      public_token: 'token-40',
      name: 'ok.pdf',
      url: '/uploads/ok.pdf',
      size: 123,
      type: 'application/pdf'
    }
  ])
  Answer.countByIp = async () => 0
  Answer.create = async payload => {
    createdPayload = payload
    return { id: 501, ...payload }
  }
  FileModel.attachToAnswer = async (ids, answerId) => {
    attachedIds = { ids, answerId }
    return ids.length
  }
  Survey.incrementResponseCount = async id => {
    incrementedSurveyId = id
  }
  Message.create = async () => {
    systemMessageCreated = true
    return { id: 1 }
  }

  const { response, json } = await requestPublic('/surveys/40/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSubmissionToken: 'session-40',
      answers: [
        {
          questionId: 1,
          value: [{ id: 9000, uploadToken: 'token-40' }]
        }
      ]
    })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 501)
  assert.deepEqual(createdPayload?.answers_data, [
    {
      questionId: 1,
      questionType: 'upload',
      value: [{
        id: 9000,
        name: 'ok.pdf',
        url: '/uploads/ok.pdf',
        size: 123,
        type: 'application/pdf'
      }]
    }
  ])
  assert.deepEqual(attachedIds, { ids: [9000], answerId: 501 })
  assert.equal(incrementedSurveyId, 40)
  assert.equal(systemMessageCreated, true)
})

test('POST /api/surveys/:id/responses rejects upload answers beyond the configured maxFiles', async () => {
  Survey.findByIdentifier = async () => ({
    id: 42,
    creator_id: 1,
    title: 'Upload Limit Survey',
    status: 'published',
    settings: {},
    questions: [{
      type: 'upload',
      title: '附件',
      required: true,
      order: 1,
      upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' }
    }]
  })
  FileModel.findByIds = async () => ([
    { id: 9101, survey_id: 42, submission_token: 'session-42', public_token: 'token-1', name: 'a.pdf', url: '/uploads/a.pdf', size: 123, type: 'application/pdf' },
    { id: 9102, survey_id: 42, submission_token: 'session-42', public_token: 'token-2', name: 'b.pdf', url: '/uploads/b.pdf', size: 456, type: 'application/pdf' }
  ])

  const { response, json } = await requestPublic('/surveys/42/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSubmissionToken: 'session-42',
      answers: [
        {
          questionId: 1,
          value: [
            { id: 9101, uploadToken: 'token-1' },
            { id: 9102, uploadToken: 'token-2' }
          ]
        }
      ]
    })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
})

test('POST /api/surveys/:id/responses rejects upload answers bound to another upload question', async () => {
  Survey.findByIdentifier = async () => ({
    id: 43,
    creator_id: 1,
    title: 'Upload Question Binding Survey',
    status: 'published',
    settings: {},
    questions: [
      { type: 'upload', title: '附件一', required: true, order: 1, upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' } },
      { type: 'upload', title: '附件二', required: false, order: 2, upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' } }
    ]
  })
  FileModel.findByIds = async () => ([
    { id: 9201, survey_id: 43, question_order: 2, submission_token: 'session-43', public_token: 'token-x', name: 'x.pdf', url: '/uploads/x.pdf', size: 123, type: 'application/pdf' }
  ])

  const { response, json } = await requestPublic('/surveys/43/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSubmissionToken: 'session-43',
      answers: [
        {
          questionId: 1,
          value: [{ id: 9201, uploadToken: 'token-x' }]
        }
      ]
    })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
})
