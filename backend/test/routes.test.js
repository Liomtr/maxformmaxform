import test from 'node:test'
import assert from 'node:assert/strict'
import Dept from '../src/models/Dept.js'
import User from '../src/models/User.js'
import AuditLog from '../src/models/AuditLog.js'
import Message from '../src/models/Message.js'
import Position from '../src/models/Position.js'
import { registerApiRouteHarness } from './helpers/apiRouteHarness.js'

const { request } = registerApiRouteHarness()

test('DELETE /api/depts/:id rejects deleting a department with child departments', async () => {
  Dept.findById = async () => ({ id: 7, name: 'Ops' })
  Dept.countChildren = async () => 2
  Dept.countUsers = async () => {
    throw new Error('countUsers should not run when child departments exist')
  }

  const { response, json } = await request('/depts/7', { method: 'DELETE' })

  assert.equal(response.status, 409)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_DEPT_HAS_CHILDREN')
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
  assert.equal(cleared, 8)
  assert.equal(deleted, 8)
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

test('GET /api/users rejects invalid dept_id query structure', async () => {
  const { response, json } = await request('/users?dept_id=abc')

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /dept_id must be an integer/i)
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
    { id: 1, name: 'Manager', code: 'manager', is_virtual: false, isVirtual: false },
    { id: 2, name: 'Virtual Reviewer', code: 'virtual-reviewer', is_virtual: true, isVirtual: true }
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
  assert.equal(json.error.code, 'MGMT_POSITION_EXISTS')
})
