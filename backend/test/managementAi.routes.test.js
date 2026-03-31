import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import config from '../src/config/index.js'
import AuditLog from '../src/models/AuditLog.js'
import Flow from '../src/models/Flow.js'
import ManagementAiExecution from '../src/models/ManagementAiExecution.js'
import Message from '../src/models/Message.js'
import QuestionBankRepo from '../src/models/QuestionBankRepo.js'
import User from '../src/models/User.js'
import { registerApiRouteHarness } from './helpers/apiRouteHarness.js'

const { request, requestRaw, requestPublic } = registerApiRouteHarness()

function createToken(payload = {}) {
  return jwt.sign(
    { sub: 2, username: 'user', roleCode: 'user', ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

function stubAuthenticatedUsers() {
  User.findById = async id => {
    if (Number(id) === 1) return { id: 1, is_active: true, role_id: 1 }
    if (Number(id) === 2) return { id: 2, is_active: true, role_id: 2 }
    return null
  }
}

function stubAiBoundaryAudit() {
  AuditLog.create = async payload => ({ id: 1, ...payload })
}

function stubExecutionLedger() {
  const rows = new Map()
  let nextId = 1
  const filterRows = ({ action, status, actor_id, created_from, created_to } = {}) => {
    return [...rows.values()]
      .filter(item => !action || String(item.action).includes(String(action)))
      .filter(item => !status || String(item.status) === String(status))
      .filter(item => actor_id == null || Number(item.actorId) === Number(actor_id))
      .filter(item => !created_from || String(item.createdAt || '') >= String(created_from))
      .filter(item => !created_to || String(item.createdAt || '') <= String(created_to))
  }

  ManagementAiExecution.list = async ({ page = 1, pageSize = 20, action, status, actor_id, created_from, created_to } = {}) => {
    const filtered = filterRows({ action, status, actor_id, created_from, created_to })
    const list = filtered
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice((page - 1) * pageSize, page * pageSize)
    return {
      total: filtered.length,
      list
    }
  }
  ManagementAiExecution.listAll = async query => filterRows(query).sort((a, b) => Number(b.id) - Number(a.id))
  ManagementAiExecution.findByActorAndKey = async (actorId, idempotencyKey) => {
    return rows.get(`${actorId}:${idempotencyKey}`) || null
  }
  ManagementAiExecution.create = async payload => {
    const key = `${payload.actor_id}:${payload.idempotency_key}`
    if (rows.has(key)) {
      throw new Error('duplicate execution key')
    }
    const row = {
      id: nextId++,
      actorId: Number(payload.actor_id),
      idempotencyKey: String(payload.idempotency_key),
      action: String(payload.action),
      requestHash: String(payload.request_hash),
      status: String(payload.status || 'pending'),
      requestPayload: payload.request_payload ?? null,
      responsePayload: payload.response_payload ?? null,
      errorCode: payload.error_code ?? null,
      errorMessage: payload.error_message ?? null,
      createdAt: payload.created_at ?? '2026-03-31T00:00:00.000Z',
      updatedAt: payload.updated_at ?? '2026-03-31T00:00:00.000Z'
    }
    rows.set(key, row)
    return row
  }
  ManagementAiExecution.update = async (id, fields) => {
    const row = [...rows.values()].find(item => Number(item.id) === Number(id))
    if (!row) return null
    Object.assign(row, {
      status: fields.status ?? row.status,
      responsePayload: Object.prototype.hasOwnProperty.call(fields, 'response_payload') ? fields.response_payload : row.responsePayload,
      errorCode: Object.prototype.hasOwnProperty.call(fields, 'error_code') ? fields.error_code : row.errorCode,
      errorMessage: Object.prototype.hasOwnProperty.call(fields, 'error_message') ? fields.error_message : row.errorMessage
    })
    return row
  }
}

test('GET /api/management-ai/protocol returns the admin-only management action protocol', async () => {
  stubAuthenticatedUsers()
  const { response, json } = await request('/management-ai/protocol')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.kind, 'management.action.protocol')
  assert.equal(json.data.adminOnly, true)
  assert.ok(Array.isArray(json.data.actions))
  assert.ok(json.data.actions.some(item => item.action === 'flow.create'))
})

test('GET /api/management-ai/protocol rejects non-admin actors', async () => {
  stubAuthenticatedUsers()
  const { response, json } = await requestPublic('/management-ai/protocol', {
    headers: { Authorization: `Bearer ${createToken()}` }
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
})

test('GET /api/management-ai/executions returns paginated execution ledger for admins', async () => {
  stubAuthenticatedUsers()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-001',
    action: 'flow.create',
    request_hash: 'hash-1',
    status: 'completed',
    request_payload: { action: 'flow.create' },
    response_payload: { id: 11, name: 'Security review' }
  })

  const { response, json } = await request('/management-ai/executions?page=1&pageSize=5&action=flow')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 1)
  assert.equal(json.data.list[0].idempotencyKey, 'ledger-001')
  assert.equal(json.data.list[0].status, 'completed')
})

test('GET /api/management-ai/executions filters by actor and created time range', async () => {
  stubAuthenticatedUsers()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-actor-1',
    action: 'flow.create',
    request_hash: 'hash-a',
    status: 'completed',
    request_payload: { action: 'flow.create' },
    response_payload: { id: 21 },
    created_at: '2026-03-31T08:00:00.000Z'
  })
  await ManagementAiExecution.create({
    actor_id: 2,
    idempotency_key: 'ledger-actor-2',
    action: 'flow.update',
    request_hash: 'hash-b',
    status: 'failed',
    request_payload: { action: 'flow.update' },
    response_payload: null,
    created_at: '2026-03-29T08:00:00.000Z'
  })

  const { response, json } = await request('/management-ai/executions?actor_id=1&created_from=2026-03-31T00:00:00.000Z&created_to=2026-03-31T23:59:59.000Z')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 1)
  assert.equal(json.data.list[0].actorId, 1)
  assert.equal(json.data.list[0].idempotencyKey, 'ledger-actor-1')
})

test('GET /api/management-ai/executions/export downloads the filtered ledger as JSON', async () => {
  stubAuthenticatedUsers()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-export-json',
    action: 'flow.create',
    request_hash: 'hash-json',
    status: 'completed',
    request_payload: { action: 'flow.create', input: { name: 'Export flow' } },
    response_payload: { id: 31, name: 'Export flow' },
    created_at: '2026-03-31T08:00:00.000Z'
  })

  const { response, buffer } = await requestRaw('/management-ai/executions/export?format=json&action=flow.create')
  const body = JSON.parse(buffer.toString('utf8'))

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.match(String(response.headers.get('content-disposition')), /management-ai-executions-.*\.json/)
  assert.equal(body.total, 1)
  assert.equal(body.filters.action, 'flow.create')
  assert.equal(body.list[0].idempotencyKey, 'ledger-export-json')
})

test('GET /api/management-ai/executions/export downloads the filtered ledger as CSV', async () => {
  stubAuthenticatedUsers()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-export-csv',
    action: 'flow.update',
    request_hash: 'hash-csv',
    status: 'failed',
    request_payload: { action: 'flow.update', changes: { status: 'disabled' } },
    response_payload: null,
    error_code: 'FLOW_FAIL',
    error_message: 'flow update failed',
    created_at: '2026-03-31T10:00:00.000Z'
  })

  const { response, buffer } = await requestRaw('/management-ai/executions/export?format=csv&status=failed')
  const body = buffer.toString('utf8')

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8')
  assert.match(String(response.headers.get('content-disposition')), /management-ai-executions-.*\.csv/)
  assert.match(body, /id,actorId,action,status,idempotencyKey/)
  assert.match(body, /ledger-export-csv/)
  assert.match(body, /FLOW_FAIL/)
})

test('GET /api/management-ai/executions/export rejects unsupported export formats', async () => {
  stubAuthenticatedUsers()

  const { response, json } = await request('/management-ai/executions/export?format=xlsx')

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /format must be json or csv/i)
})

test('POST /api/management-ai/actions supports dry-run validation', async () => {
  stubAuthenticatedUsers()
  stubAiBoundaryAudit()
  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      dryRun: true,
      input: {
        name: 'Security review',
        status: 'active',
        description: '2-step'
      },
      reason: 'Validate AI-generated management JSON'
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.dryRun, true)
  assert.equal(json.data.executed, false)
  assert.equal(json.data.normalized.action, 'flow.create')
})

test('POST /api/management-ai/actions executes supported management actions through existing services', async () => {
  stubAuthenticatedUsers()
  stubExecutionLedger()
  const auditActions = []
  let messagePayload = null

  Flow.create = async payload => ({
    id: 11,
    ...payload,
    created_at: '2026-03-31T00:00:00.000Z',
    updated_at: '2026-03-31T00:00:00.000Z'
  })
  AuditLog.create = async payload => {
    auditActions.push(payload.action)
    return { id: 1 }
  }
  Message.create = async payload => {
    messagePayload = payload
    return { id: 2 }
  }

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      idempotencyKey: 'flow-create-001',
      input: {
        name: 'Security review',
        status: 'active',
        description: '2-step'
      },
      reason: 'Create a new admin flow'
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.executed, true)
  assert.equal(json.data.idempotencyKey, 'flow-create-001')
  assert.equal(json.data.result.name, 'Security review')
  assert.ok(auditActions.includes('flow.create'))
  assert.ok(auditActions.includes('management_ai.execute'))
  assert.equal(messagePayload.title, 'Flow created')
})

test('POST /api/management-ai/actions replays completed requests with the same idempotencyKey', async () => {
  stubAuthenticatedUsers()
  stubExecutionLedger()
  let createCount = 0

  Flow.create = async payload => {
    createCount += 1
    return {
      id: 21,
      ...payload,
      created_at: '2026-03-31T00:00:00.000Z',
      updated_at: '2026-03-31T00:00:00.000Z'
    }
  }
  AuditLog.create = async payload => ({ id: 1, ...payload })
  Message.create = async payload => ({ id: 2, ...payload })

  const payload = {
    kind: 'management.action',
    version: '2026-03-31',
    action: 'flow.create',
    idempotencyKey: 'flow-create-002',
    input: {
      name: 'Risk review',
      status: 'draft'
    }
  }

  const first = await request('/management-ai/actions', {
    method: 'POST',
    body: payload
  })
  const second = await request('/management-ai/actions', {
    method: 'POST',
    body: payload
  })

  assert.equal(first.response.status, 200)
  assert.equal(second.response.status, 200)
  assert.equal(createCount, 1)
  assert.equal(second.json.data.replayed, true)
  assert.equal(second.json.data.result.name, 'Risk review')
})

test('POST /api/management-ai/actions rejects execute requests without idempotencyKey', async () => {
  stubAuthenticatedUsers()
  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      input: { name: 'No key flow', status: 'draft' }
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_AI_IDEMPOTENCY_REQUIRED')
  assert.match(json.error.message, /idempotencyKey/i)
})

test('POST /api/management-ai/actions rejects reusing idempotencyKey with a different payload', async () => {
  stubAuthenticatedUsers()
  stubExecutionLedger()
  stubAiBoundaryAudit()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'conflict-001',
    action: 'flow.create',
    request_hash: 'hash-original',
    status: 'completed',
    request_payload: { action: 'flow.create' },
    response_payload: { id: 11 }
  })

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      idempotencyKey: 'conflict-001',
      input: { name: 'Different flow', status: 'draft' }
    }
  })

  assert.equal(response.status, 409)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_AI_IDEMPOTENCY_CONFLICT')
})

test('POST /api/management-ai/actions rejects unsupported actions', async () => {
  stubAuthenticatedUsers()
  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'survey.force_delete',
      target: { surveyId: 9 }
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
})

test('GET /api/repos rejects non-admin actors for management JSON related repo access', async () => {
  QuestionBankRepo.list = async () => [{ id: 1, name: 'Repo 1' }]

  const { response, json } = await requestPublic('/repos', {
    headers: { Authorization: `Bearer ${createToken()}` }
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
})
