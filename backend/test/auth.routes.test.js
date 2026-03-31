import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import config from '../src/config/index.js'
import Role from '../src/models/Role.js'
import User from '../src/models/User.js'
import { registerApiRouteHarness } from './helpers/apiRouteHarness.js'
import { AUTH_ERROR_CODES } from '../../shared/auth.contract.js'

const { requestPublic } = registerApiRouteHarness()

function createToken(payload = {}) {
  return jwt.sign(
    { sub: 1, username: 'alice', roleCode: 'user', ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

test('POST /api/auth/register creates a user through the auth service flow', async () => {
  let createPayload = null

  User.findByUsername = async () => null
  User.findByEmail = async () => null
  Role.findByCode = async code => (code === 'user' ? { id: 3, code } : null)
  User.create = async payload => {
    createPayload = payload
    return { id: 9, ...payload, password: 'hashed' }
  }

  const { response, json } = await requestPublic('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', email: 'alice@example.com', password: 'secret' })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.user.username, 'alice')
  assert.equal(json.data.user.password, undefined)
  assert.equal(typeof json.data.token, 'string')
  assert.deepEqual(createPayload, {
    username: 'alice',
    email: 'alice@example.com',
    password: 'secret',
    role_id: 3
  })
})

test('POST /api/auth/register validates required fields through the auth contract error code', async () => {
  const { response, json } = await requestPublic('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '', password: '' })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, AUTH_ERROR_CODES.MISSING_FIELDS)
})

test('POST /api/auth/register rejects invalid payload structure', async () => {
  const { response, json } = await requestPublic('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: { text: 'alice' }, password: 'secret' })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, AUTH_ERROR_CODES.INVALID_PAYLOAD)
})

test('POST /api/auth/login updates last-login and returns a signed token through the auth service flow', async () => {
  let updatedUserId = null

  User.findByUsername = async username => ({
    id: 12,
    username,
    password: 'stored-hash',
    role_id: 4,
    is_active: true
  })
  User.verifyPassword = async (password, hashed) => password === 'secret' && hashed === 'stored-hash'
  User.updateLastLogin = async userId => {
    updatedUserId = userId
  }
  Role.findById = async id => ({ id, code: 'manager' })

  const { response, json } = await requestPublic('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'secret' })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.user.username, 'alice')
  assert.equal(json.data.user.password, undefined)
  assert.equal(updatedUserId, 12)

  const payload = jwt.verify(json.data.token, config.jwt.secret)
  assert.equal(payload.sub, 12)
  assert.equal(payload.roleCode, 'manager')
})

test('POST /api/auth/login rejects non-object payloads', async () => {
  const { response, json } = await requestPublic('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(['alice', 'secret'])
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, AUTH_ERROR_CODES.INVALID_PAYLOAD)
})

test('GET /api/auth/me loads the current user session through the auth service flow', async () => {
  User.findById = async id => ({
    id,
    username: 'alice',
    email: 'alice@example.com',
    password: 'stored-hash',
    role_id: 7,
    is_active: true
  })
  Role.findById = async id => ({ id, code: 'editor', name: 'Editor' })

  const { response, json } = await requestPublic('/auth/me', {
    headers: { Authorization: `Bearer ${createToken({ sub: 18 })}` }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.user.id, 18)
  assert.equal(json.data.user.password, undefined)
  assert.equal(json.data.role.code, 'editor')
})

test('GET /api/auth/me returns auth contract user-not-found code when token user is missing', async () => {
  User.findById = async () => null

  const { response, json } = await requestPublic('/auth/me', {
    headers: { Authorization: `Bearer ${createToken({ sub: 404 })}` }
  })

  assert.equal(response.status, 401)
  assert.equal(json.success, false)
  assert.equal(json.error.code, AUTH_ERROR_CODES.USER_NOT_FOUND)
})
