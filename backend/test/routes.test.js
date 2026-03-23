import test, { after, afterEach, before } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import config from '../src/config/index.js'
import Dept from '../src/models/Dept.js'
import User from '../src/models/User.js'
import AuditLog from '../src/models/AuditLog.js'
import Message from '../src/models/Message.js'
import Survey from '../src/models/Survey.js'
import Answer from '../src/models/Answer.js'

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
  findByIdentifier: Survey.findByIdentifier,
  softDelete: Survey.softDelete,
  listTrash: Survey.listTrash,
  listTrashIds: Survey.listTrashIds,
  clearTrash: Survey.clearTrash
}
const originalAnswerDeleteBySurveyIds = Answer.deleteBySurveyIds

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

before(async () => {
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
  Survey.softDelete = originalSurveyMethods.softDelete
  Survey.listTrash = originalSurveyMethods.listTrash
  Survey.listTrashIds = originalSurveyMethods.listTrashIds
  Survey.clearTrash = originalSurveyMethods.clearTrash
  Answer.deleteBySurveyIds = originalAnswerDeleteBySurveyIds
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
