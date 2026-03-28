import test from 'node:test'
import assert from 'node:assert/strict'
import AuditLog from '../src/models/AuditLog.js'
import Folder from '../src/models/Folder.js'
import Message from '../src/models/Message.js'
import Role from '../src/models/Role.js'
import User from '../src/models/User.js'
import { registerApiRouteHarness } from './helpers/apiRouteHarness.js'

const { request } = registerApiRouteHarness()

test('GET /api/audits lists audit records through the service flow', async () => {
  let listPayload = null

  AuditLog.list = async payload => {
    listPayload = payload
    return {
      total: 2,
      list: [{ id: 1, action: 'survey.create' }, { id: 2, action: 'user.delete' }]
    }
  }

  const { response, json } = await request('/audits?page=2&pageSize=5&username=alice&action=survey&targetType=user')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 2)
  assert.equal(json.data.page, 2)
  assert.equal(json.data.pageSize, 5)
  assert.deepEqual(json.data.list, [
    {
      id: 1,
      actorId: null,
      actor: '-',
      username: '',
      action: 'survey.create',
      targetType: '',
      targetId: '',
      detail: '',
      time: null
    },
    {
      id: 2,
      actorId: null,
      actor: '-',
      username: '',
      action: 'user.delete',
      targetType: '',
      targetId: '',
      detail: '',
      time: null
    }
  ])
  assert.deepEqual(listPayload, {
    page: 2,
    pageSize: 5,
    username: 'alice',
    action: 'survey',
    targetType: 'user'
  })
})

test('GET /api/messages normalizes unread and types filters through the service flow', async () => {
  let listPayload = null

  Message.list = async payload => {
    listPayload = payload
    return [{ id: 5, title: 'Inbox item' }]
  }

  const { response, json } = await request('/messages?page=3&pageSize=10&unread=1&types=audit,system')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, [{
    id: 5,
    title: 'Inbox item',
    entityId: null,
    read: false,
    readAt: null,
    createdAt: null
  }])
  assert.deepEqual(listPayload, {
    recipient_id: 1,
    page: 3,
    pageSize: 10,
    unread: true,
    types: ['audit', 'system']
  })
})

test('POST /api/messages/:id/read returns not found when the message is missing', async () => {
  Message.markRead = async () => null

  const { response, json } = await request('/messages/18/read', { method: 'POST' })

  assert.equal(response.status, 404)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'NOT_FOUND')
})

test('POST /api/folders creates folders through the service flow after parent validation', async () => {
  let createPayload = null

  Folder.findById = async (id, creatorId) => {
    if (Number(id) === 5 && Number(creatorId) === 1) {
      return { id: 5, creator_id: 1, name: 'Parent', parentId: null }
    }
    return null
  }
  Folder.create = async payload => {
    createPayload = payload
    return { id: 9, ...payload, parentId: payload.parent_id ?? null, surveyCount: 0 }
  }
  AuditLog.create = async () => ({ id: 1 })
  Message.create = async () => ({ id: 1 })

  const { response, json } = await request('/folders', {
    method: 'POST',
    body: { name: 'Child', parentId: 5 }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 9)
  assert.deepEqual(createPayload, {
    creator_id: 1,
    name: 'Child',
    parent_id: 5
  })
})

test('PUT /api/folders/:id rejects assigning a folder as its own parent', async () => {
  Folder.findById = async () => ({ id: 7, creator_id: 1, name: 'Self', parentId: null })

  const { response, json } = await request('/folders/7', {
    method: 'PUT',
    body: { parentId: 7 }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
})

test('POST /api/roles rejects duplicate role codes through the service flow', async () => {
  Role.findByCode = async code => (code === 'admin' ? { id: 1, code } : null)

  const { response, json } = await request('/roles', {
    method: 'POST',
    body: { name: 'Admin Copy', code: 'admin' }
  })

  assert.equal(response.status, 409)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'ROLE_EXISTS')
})

test('GET /api/users/:id falls back to username lookup through the service flow', async () => {
  User.findById = async () => null
  User.findByUsername = async username => (
    username === 'alice'
      ? { id: 12, username: 'alice', email: 'alice@example.com', password: 'secret' }
      : null
  )

  const { response, json } = await request('/users/alice')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.username, 'alice')
  assert.equal(json.data.password, undefined)
})
