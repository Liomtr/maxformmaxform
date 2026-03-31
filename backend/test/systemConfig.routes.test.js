import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import config from '../src/config/index.js'
import AuditLog from '../src/models/AuditLog.js'
import Message from '../src/models/Message.js'
import SystemConfig from '../src/models/SystemConfig.js'
import { registerApiRouteHarness } from './helpers/apiRouteHarness.js'

const { request, requestPublic } = registerApiRouteHarness()

function createToken(payload = {}) {
  return jwt.sign(
    { sub: 2, username: 'user', roleCode: 'user', ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

test('GET /api/system-config returns the saved AI provider config for admins', { concurrency: false }, async () => {
  SystemConfig.findByKey = async key => ({
    id: 1,
    configKey: key,
    configValue: {
      providerId: 'deepseek',
      providerLabel: 'DeepSeek',
      apiKey: 'sk-test-deepseek-001',
      apiBase: 'https://api.deepseek.com',
      endpoint: '/chat/completions',
      model: 'deepseek-chat',
      note: 'saved note'
    },
    updatedBy: 1,
    updatedAt: '2026-03-31T10:00:00.000Z'
  })

  const { response, json } = await request('/system-config')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, {
    provider: {
      providerId: 'deepseek',
      providerLabel: 'DeepSeek',
      apiKey: '',
      apiKeyMasked: 'sk-tes...-001',
      hasApiKey: true,
      apiBase: 'https://api.deepseek.com',
      endpoint: '/chat/completions',
      model: 'deepseek-chat',
      note: 'saved note'
    },
    updatedAt: '2026-03-31T10:00:00.000Z',
    updatedBy: 1
  })
})

test('PUT /api/system-config updates AI provider config for admins', { concurrency: false }, async () => {
  let savedPayload = null
  const auditActions = []
  let messagePayload = null

  SystemConfig.findByKey = async () => null
  SystemConfig.upsert = async payload => {
    savedPayload = payload
    return {
      id: 1,
      configKey: payload.config_key,
      configValue: payload.config_value,
      updatedBy: payload.updated_by,
      updatedAt: '2026-03-31T12:00:00.000Z'
    }
  }
  AuditLog.create = async payload => {
    auditActions.push(payload.action)
    return { id: 1, ...payload }
  }
  Message.create = async payload => {
    messagePayload = payload
    return { id: 2, ...payload }
  }

  const { response, json } = await request('/system-config', {
    method: 'PUT',
    body: {
      provider: {
        providerId: 'openai',
        providerLabel: 'OpenAI',
        apiKey: 'sk-proj-test-001',
        apiBase: 'https://api.openai.com',
        endpoint: '/v1/chat/completions',
        model: 'gpt-4o-mini',
        note: 'primary config'
      }
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(savedPayload.config_key, 'ai_provider')
  assert.equal(savedPayload.updated_by, 1)
  assert.equal(savedPayload.config_value.providerId, 'openai')
  assert.equal(savedPayload.config_value.apiKey, 'sk-proj-test-001')
  assert.ok(auditActions.includes('system_config.ai_provider.update'))
  assert.equal(messagePayload.title, 'System config updated')
  assert.equal(json.data.provider.model, 'gpt-4o-mini')
})

test('PUT /api/system-config keeps the saved API key when the incoming payload omits it', { concurrency: false }, async () => {
  SystemConfig.findByKey = async () => ({
    id: 1,
    configKey: 'ai_provider',
    configValue: {
      providerId: 'openai',
      providerLabel: 'OpenAI',
      apiKey: 'sk-proj-existing-001',
      apiBase: 'https://api.openai.com',
      endpoint: '/v1/chat/completions',
      model: 'gpt-4o-mini',
      note: ''
    },
    updatedBy: 1,
    updatedAt: '2026-03-31T10:00:00.000Z'
  })

  let savedPayload = null
  SystemConfig.upsert = async payload => {
    savedPayload = payload
    return {
      id: 1,
      configKey: payload.config_key,
      configValue: payload.config_value,
      updatedBy: payload.updated_by,
      updatedAt: '2026-03-31T12:00:00.000Z'
    }
  }
  AuditLog.create = async payload => ({ id: 1, ...payload })
  Message.create = async payload => ({ id: 2, ...payload })

  const { response, json } = await request('/system-config', {
    method: 'PUT',
    body: {
      provider: {
        providerId: 'openai',
        providerLabel: 'OpenAI',
        apiBase: 'https://api.openai.com',
        endpoint: '/v1/chat/completions',
        model: 'gpt-4.1-mini',
        note: 'updated without key'
      }
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(savedPayload.config_value.apiKey, 'sk-proj-existing-001')
  assert.equal(json.data.provider.hasApiKey, true)
})

test('POST /api/system-config/test returns the connectivity probe result for admins', { concurrency: false }, async () => {
  const originalFetch = global.fetch
  SystemConfig.findByKey = async () => null

  global.fetch = async (url, init) => {
    const normalizedUrl = String(url)
    if (normalizedUrl.startsWith('http://127.0.0.1:')) {
      return originalFetch(url, init)
    }

    return {
      ok: true,
      status: 200,
      url: normalizedUrl,
      json: async () => ({})
    }
  }

  try {
    const { response, json } = await request('/system-config/test', {
      method: 'POST',
      body: {
        provider: {
          providerId: 'openai',
          apiKey: 'sk-proj-test-001',
          apiBase: 'https://api.openai.com'
        }
      }
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.ok, true)
    assert.equal(json.data.status, 200)
    assert.equal(json.data.requestUrl, 'https://api.openai.com/v1/models')
  } finally {
    global.fetch = originalFetch
  }
})

test('GET /api/system-config rejects non-admin actors', { concurrency: false }, async () => {
  const { response, json } = await requestPublic('/system-config', {
    headers: { Authorization: `Bearer ${createToken()}` }
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
})
