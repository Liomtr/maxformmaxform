import { throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import systemConfigRepository from '../repositories/systemConfigRepository.js'
import {
  ensurePlainObjectPayload,
  normalizeOptionalTrimmedString
} from '../utils/managementPayload.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'

const AI_PROVIDER_CONFIG_KEY = 'ai_provider'
const OPENAI_COMPATIBLE_PROVIDER_IDS = new Set(['openai', 'openrouter', 'deepseek', 'moonshot', 'qwen', 'siliconflow'])

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function normalizeOptionalSecret(value, field) {
  return normalizeOptionalTrimmedString(value, {
    field,
    allowNull: true,
    emptyToNull: true
  })
}

function normalizeAiProviderConfig(body = {}) {
  body = ensurePlainObjectPayload(body)
  const provider = ensurePlainObjectPayload(body.provider || {})

  return {
    providerId: normalizeOptionalSecret(provider.providerId ?? body.providerId, 'providerId'),
    providerLabel: normalizeOptionalSecret(provider.providerLabel ?? body.providerLabel, 'providerLabel'),
    apiKey: normalizeOptionalSecret(provider.apiKey ?? body.apiKey, 'apiKey'),
    apiBase: normalizeOptionalSecret(provider.apiBase ?? body.apiBase, 'apiBase'),
    endpoint: normalizeOptionalSecret(provider.endpoint ?? body.endpoint, 'endpoint'),
    model: normalizeOptionalSecret(provider.model ?? body.model, 'model'),
    note: normalizeOptionalSecret(provider.note ?? body.note, 'note')
  }
}

function maskSecret(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  if (normalized.length <= 10) return normalized
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
}

function createSystemConfigDto(row) {
  const value = row?.configValue && typeof row.configValue === 'object' ? row.configValue : {}
  return {
    provider: {
      providerId: value.providerId || '',
      providerLabel: value.providerLabel || '',
      apiKey: '',
      apiKeyMasked: maskSecret(value.apiKey),
      hasApiKey: Boolean(value.apiKey),
      apiBase: value.apiBase || '',
      endpoint: value.endpoint || '',
      model: value.model || '',
      note: value.note || ''
    },
    updatedAt: row?.updatedAt || null,
    updatedBy: row?.updatedBy ?? null
  }
}

function createProviderRuntimeConfig(input = {}) {
  return {
    providerId: String(input.providerId || '').trim(),
    providerLabel: String(input.providerLabel || '').trim(),
    apiKey: String(input.apiKey || '').trim(),
    apiBase: String(input.apiBase || '').trim(),
    endpoint: String(input.endpoint || '').trim(),
    model: String(input.model || '').trim(),
    note: String(input.note || '').trim()
  }
}

function buildConnectivityRequest(provider = {}) {
  const providerId = provider.providerId
  const base = String(provider.apiBase || '').replace(/\/+$/, '')
  if (!base) return null

  if (providerId === 'gemini') {
    return {
      url: `${base}/v1beta/models?key=${encodeURIComponent(provider.apiKey)}`,
      init: { method: 'GET' }
    }
  }

  if (providerId === 'anthropic') {
    return {
      url: `${base}/v1/models`,
      init: {
        method: 'GET',
        headers: {
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    }
  }

  if (providerId === 'zhipu') {
    return {
      url: `${base}/api/paas/v4/models`,
      init: {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`
        }
      }
    }
  }

  if (providerId === 'baidu') {
    return {
      url: `${base}/v2/models`,
      init: {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`
        }
      }
    }
  }

  if (OPENAI_COMPATIBLE_PROVIDER_IDS.has(providerId) || provider.apiKey) {
    return {
      url: `${base}/v1/models`,
      init: {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`
        }
      }
    }
  }

  return {
    url: base,
    init: { method: 'GET' }
  }
}

export async function getManagedSystemConfig({ actor }) {
  ensureAdmin(actor)
  const row = await systemConfigRepository.findByKey(AI_PROVIDER_CONFIG_KEY)
  return createSystemConfigDto(row)
}

export async function updateManagedSystemConfig({ actor, body = {} }) {
  ensureAdmin(actor)
  const row = await systemConfigRepository.findByKey(AI_PROVIDER_CONFIG_KEY)
  const existing = createProviderRuntimeConfig(row?.configValue || {})
  const provider = normalizeAiProviderConfig(body)
  const mergedProvider = {
    ...existing,
    ...provider,
    apiKey: provider.apiKey || existing.apiKey || ''
  }

  return runManagementTransaction(async db => {
    const row = await systemConfigRepository.upsert({
      config_key: AI_PROVIDER_CONFIG_KEY,
      config_value: mergedProvider,
      updated_by: actor?.sub ?? null
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'system_config.ai_provider.update',
        targetType: 'system_config',
        targetId: AI_PROVIDER_CONFIG_KEY,
        detail: `Updated AI provider config (${mergedProvider.providerId || 'custom'})`
      },
      message: {
        recipientId: actor.sub,
        title: 'System config updated',
        content: `AI provider config was updated to ${mergedProvider.providerLabel || mergedProvider.providerId || 'custom'}.`,
        entityType: 'system_config',
        entityId: 0
      }
    }, { db })

    return createSystemConfigDto(row)
  })
}

export async function testManagedSystemConfigConnection({ actor, body = {} }) {
  ensureAdmin(actor)
  const row = await systemConfigRepository.findByKey(AI_PROVIDER_CONFIG_KEY)
  const existing = createProviderRuntimeConfig(row?.configValue || {})
  const normalized = normalizeAiProviderConfig(body)
  const provider = {
    ...existing,
    ...normalized,
    apiKey: normalized.apiKey || existing.apiKey || ''
  }

  if (!provider.apiBase) {
    return {
      ok: false,
      status: null,
      message: 'API Base is required for connection test',
      requestUrl: null
    }
  }
  if (!provider.apiKey) {
    return {
      ok: false,
      status: null,
      message: 'API Key is required for connection test',
      requestUrl: null
    }
  }

  const request = buildConnectivityRequest(provider)
  if (!request) {
    return {
      ok: false,
      status: null,
      message: 'Unable to build connectivity request for the current provider',
      requestUrl: null
    }
  }

  try {
    const response = await fetch(request.url, request.init)
    const ok = response.ok
    return {
      ok,
      status: response.status,
      message: ok
        ? 'Connection test succeeded'
        : `Connection test failed with status ${response.status}`,
      requestUrl: request.url
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      message: error?.message || 'Connection test failed',
      requestUrl: request.url
    }
  }
}
