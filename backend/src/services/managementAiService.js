import { createHash } from 'crypto'
import {
  createManagementActionProtocol,
  createManagementAiExecutionPageResult,
  listManagementActionDefinitions,
  MANAGEMENT_ACTION_BOUNDARIES,
  MANAGEMENT_ACTION_KIND,
  MANAGEMENT_ACTION_PROTOCOL_VERSION,
  MANAGEMENT_ERROR_CODES,
  normalizeManagementAiExecutionListQuery
} from '../../../shared/management.contract.js'
import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import {
  ensurePlainObjectPayload,
  normalizeOptionalBoolean,
  normalizeOptionalId,
  normalizeOptionalTrimmedString,
  normalizeRequiredTrimmedString
} from '../utils/managementPayload.js'
import managementAiExecutionRepository from '../repositories/managementAiExecutionRepository.js'
import {
  createManagedDept,
  deleteManagedDept,
  updateManagedDept
} from './deptService.js'
import {
  createManagedFlow,
  deleteManagedFlow,
  updateManagedFlow
} from './flowService.js'
import {
  createManagedPosition,
  deleteManagedPosition,
  updateManagedPosition
} from './positionService.js'
import {
  createManagedQuestionBankQuestion,
  createManagedQuestionBankRepo,
  deleteManagedQuestionBankQuestion,
  deleteManagedQuestionBankRepo,
  updateManagedQuestionBankRepo
} from './questionBankService.js'
import {
  createManagedRole,
  deleteManagedRole,
  updateManagedRole
} from './roleService.js'
import {
  createManagedUser,
  deleteManagedUser,
  resetManagedUserPassword,
  updateManagedUser
} from './userService.js'
import { recordAudit, runManagementTransaction } from './activity.js'

const ACTION_DEFINITION_MAP = new Map(
  listManagementActionDefinitions().map(definition => [definition.action, definition])
)
const MANAGEMENT_AI_EXPORT_FORMATS = new Set(['json', 'csv'])

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function normalizeTarget(target) {
  if (target === undefined) return {}
  return ensurePlainObjectPayload(target, 'target')
}

function normalizePayloadObject(value, label) {
  if (value === undefined) return undefined
  return ensurePlainObjectPayload(value, label)
}

function normalizeActionEnvelope(body = {}) {
  const payload = ensurePlainObjectPayload(body)
  const kind = payload.kind === undefined
    ? MANAGEMENT_ACTION_KIND
    : normalizeRequiredTrimmedString(payload.kind, {
        field: 'kind',
        code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
        message: 'kind is required'
      })

  if (kind !== MANAGEMENT_ACTION_KIND) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'kind must be management.action')
  }

  const version = payload.version === undefined
    ? MANAGEMENT_ACTION_PROTOCOL_VERSION
    : normalizeRequiredTrimmedString(payload.version, {
        field: 'version',
        code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
        message: 'version is required'
      })

  const action = normalizeRequiredTrimmedString(payload.action, {
    field: 'action',
    code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
    message: 'action is required'
  })
  const definition = ACTION_DEFINITION_MAP.get(action)
  if (!definition) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `Unsupported management action: ${action}`)
  }

  const target = normalizeTarget(payload.target)
  const input = normalizePayloadObject(payload.input, 'input')
  const changes = normalizePayloadObject(payload.changes, 'changes')
  const reason = normalizeOptionalTrimmedString(payload.reason, {
    field: 'reason',
    allowNull: true,
    emptyToNull: true
  })
  const meta = payload.meta === undefined ? undefined : ensurePlainObjectPayload(payload.meta, 'meta')
  const dryRun = normalizeOptionalBoolean(payload.dryRun, { field: 'dryRun' }) ?? false
  const idempotencyKey = normalizeOptionalTrimmedString(payload.idempotencyKey, {
    field: 'idempotencyKey',
    allowNull: false,
    emptyToNull: false
  })

  if (version !== MANAGEMENT_ACTION_PROTOCOL_VERSION) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `version must be ${MANAGEMENT_ACTION_PROTOCOL_VERSION}`)
  }

  definition.targetKeys.forEach(key => {
    target[key] = normalizeOptionalId(target[key], { field: `target.${key}` })
    if (!Number.isInteger(target[key]) || target[key] <= 0) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `target.${key} must be a positive integer`)
    }
  })

  if (definition.payloadField === 'input' && !input) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'input is required for this action')
  }
  if (definition.payloadField === 'changes' && !changes) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'changes is required for this action')
  }
  if (!dryRun && !idempotencyKey) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_REQUIRED, 'idempotencyKey is required when dryRun is false')
  }

  return {
    kind,
    version,
    action,
    dryRun,
    idempotencyKey,
    target,
    input,
    changes,
    reason,
    meta,
    definition
  }
}

function toSummary({ action, target = {}, reason }) {
  const targetPairs = Object.keys(target).map(key => `${key}=${target[key]}`)
  const targetText = targetPairs.length ? ` (${targetPairs.join(', ')})` : ''
  const reasonText = reason ? `, reason: ${reason}` : ''
  return `${action}${targetText}${reasonText}`
}

function stableJsonStringify(value) {
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(item => stableJsonStringify(item)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJsonStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

function createRequestHash(normalized) {
  return createHash('sha256').update(stableJsonStringify(normalized)).digest('hex')
}

function getActionTargetId(envelope) {
  const targetValues = Object.values(envelope.target || {})
  if (!targetValues.length) return null
  const first = targetValues[0]
  return first == null ? null : String(first)
}

function createBoundaryMetadata() {
  return {
    ...MANAGEMENT_ACTION_BOUNDARIES,
    serviceDispatch: true,
    batchAllowed: false
  }
}

function normalizeExecutionExportFormat(value) {
  const normalized = value == null || value === ''
    ? 'json'
    : String(value).trim().toLowerCase()

  if (!MANAGEMENT_AI_EXPORT_FORMATS.has(normalized)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'format must be json or csv')
  }

  return normalized
}

function createExportTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function sanitizeExecutionExportFilters(query = {}) {
  return Object.fromEntries(
    Object.entries({
      action: query.action,
      status: query.status,
      actor_id: query.actor_id,
      created_from: query.created_from,
      created_to: query.created_to
    }).filter(([, value]) => value !== undefined)
  )
}

function escapeCsvValue(value) {
  const normalized = value == null ? '' : String(value)
  if (!/[",\r\n]/.test(normalized)) return normalized
  return `"${normalized.replace(/"/g, '""')}"`
}

function toCsvJson(value) {
  if (value == null) return ''
  return stableJsonStringify(value)
}

function createManagementAiExecutionsCsvBuffer(rows = []) {
  const columns = [
    'id',
    'actorId',
    'action',
    'status',
    'idempotencyKey',
    'errorCode',
    'errorMessage',
    'createdAt',
    'updatedAt',
    'requestPayload',
    'responsePayload'
  ]

  const lines = [
    columns.join(','),
    ...rows.map(row => columns.map(column => {
      if (column === 'requestPayload') return escapeCsvValue(toCsvJson(row.requestPayload))
      if (column === 'responsePayload') return escapeCsvValue(toCsvJson(row.responsePayload))
      return escapeCsvValue(row[column])
    }).join(','))
  ]

  return Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf8')
}

async function recordManagementAiAudit({ actor, action, envelope, outcome, detail }) {
  await recordAudit({
    actor,
    action,
    targetType: envelope.action,
    targetId: envelope.idempotencyKey || getActionTargetId(envelope),
    detail: detail || `${outcome}: ${toSummary(envelope)}`
  })
}

async function createExecutionRecord({ actor, envelope, requestHash, normalized }) {
  return runManagementTransaction(async db => {
    return managementAiExecutionRepository.create({
      actor_id: actor.sub,
      idempotency_key: envelope.idempotencyKey,
      action: envelope.action,
      request_hash: requestHash,
      status: 'pending',
      request_payload: normalized
    }, { db })
  })
}

async function updateExecutionRecord(executionId, fields) {
  return runManagementTransaction(async db => {
    return managementAiExecutionRepository.update(executionId, fields, { db })
  })
}

async function findExecutionRecord(actorId, idempotencyKey) {
  return managementAiExecutionRepository.findByActorAndKey(actorId, idempotencyKey)
}

function buildResultEnvelope({ envelope, normalized, result, dryRun, executed, replayed = false, executionId = null }) {
  return {
    adminOnly: true,
    dryRun,
    executed,
    replayed,
    idempotencyKey: normalized.idempotencyKey || null,
    executionId,
    boundaries: createBoundaryMetadata(),
    summary: toSummary(envelope),
    normalized,
    ...(result !== undefined ? { result } : {})
  }
}

async function resolveIdempotentExecution({ actor, envelope, normalized, requestHash }) {
  const existing = await findExecutionRecord(actor.sub, envelope.idempotencyKey)
  if (!existing) return null

  if (existing.requestHash !== requestHash) {
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey has already been used for a different management action payload')
  }

  if (existing.status === 'completed') {
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.replay',
      envelope,
      outcome: 'replayed',
      detail: `replayed: ${toSummary(envelope)}`
    })
    return buildResultEnvelope({
      envelope,
      normalized,
      result: existing.responsePayload ?? null,
      dryRun: false,
      executed: true,
      replayed: true,
      executionId: existing.id
    })
  }

  if (existing.status === 'failed') {
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, `idempotencyKey previously failed: ${existing.errorMessage || 'request failed'}`)
  }

  throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey is already in progress or outcome is not yet finalized')
}

async function executeAction(actor, envelope) {
  switch (envelope.action) {
    case 'user.create':
      return createManagedUser({ actor, body: envelope.input })
    case 'user.update':
      return updateManagedUser({ actor, userId: envelope.target.userId, body: envelope.changes })
    case 'user.delete':
      await deleteManagedUser({ actor, userId: envelope.target.userId })
      return { deleted: true, userId: envelope.target.userId }
    case 'user.password.reset':
      await resetManagedUserPassword({ actor, userId: envelope.target.userId, body: envelope.input })
      return { reset: true, userId: envelope.target.userId }
    case 'role.create':
      return createManagedRole({ actor, body: envelope.input })
    case 'role.update':
      return updateManagedRole({ actor, roleId: envelope.target.roleId, body: envelope.changes })
    case 'role.delete':
      await deleteManagedRole({ actor, roleId: envelope.target.roleId })
      return { deleted: true, roleId: envelope.target.roleId }
    case 'dept.create':
      return createManagedDept({ actor, body: envelope.input })
    case 'dept.update':
      return updateManagedDept({ actor, deptId: envelope.target.deptId, body: envelope.changes })
    case 'dept.delete':
      return deleteManagedDept({ actor, deptId: envelope.target.deptId })
    case 'position.create':
      return createManagedPosition({ actor, body: envelope.input })
    case 'position.update':
      return updateManagedPosition({ actor, positionId: envelope.target.positionId, body: envelope.changes })
    case 'position.delete':
      await deleteManagedPosition({ actor, positionId: envelope.target.positionId })
      return { deleted: true, positionId: envelope.target.positionId }
    case 'flow.create':
      return createManagedFlow({ actor, body: envelope.input })
    case 'flow.update':
      return updateManagedFlow({ actor, flowId: envelope.target.flowId, body: envelope.changes })
    case 'flow.delete':
      await deleteManagedFlow({ actor, flowId: envelope.target.flowId })
      return { deleted: true, flowId: envelope.target.flowId }
    case 'question_bank.repo.create':
      return createManagedQuestionBankRepo({ actor, body: envelope.input })
    case 'question_bank.repo.update':
      return updateManagedQuestionBankRepo({ actor, repoId: envelope.target.repoId, body: envelope.changes })
    case 'question_bank.repo.delete':
      await deleteManagedQuestionBankRepo({ actor, repoId: envelope.target.repoId })
      return { deleted: true, repoId: envelope.target.repoId }
    case 'question_bank.question.create':
      return createManagedQuestionBankQuestion({ actor, repoId: envelope.target.repoId, body: envelope.input })
    case 'question_bank.question.delete':
      await deleteManagedQuestionBankQuestion({
        actor,
        repoId: envelope.target.repoId,
        questionId: envelope.target.questionId
      })
      return {
        deleted: true,
        repoId: envelope.target.repoId,
        questionId: envelope.target.questionId
      }
    default:
      throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `Unsupported management action: ${envelope.action}`)
  }
}

export async function getManagementAiProtocol({ actor }) {
  ensureAdmin(actor)
  return createManagementActionProtocol()
}

export async function listManagementAiExecutions({ actor, query = {} }) {
  ensureAdmin(actor)
  const normalized = normalizeManagementAiExecutionListQuery(query)
  const result = await managementAiExecutionRepository.list(normalized)
  return createManagementAiExecutionPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}

export async function exportManagementAiExecutions({ actor, query = {} }) {
  ensureAdmin(actor)

  const format = normalizeExecutionExportFormat(query?.format)
  const normalized = normalizeManagementAiExecutionListQuery(query)
  const rows = await managementAiExecutionRepository.listAll(normalized)
  const exportedAt = new Date().toISOString()
  const filenameBase = `management-ai-executions-${createExportTimestamp()}`

  if (format === 'csv') {
    return {
      filename: `${filenameBase}.csv`,
      contentType: 'text/csv; charset=utf-8',
      buffer: createManagementAiExecutionsCsvBuffer(rows)
    }
  }

  return {
    filename: `${filenameBase}.json`,
    contentType: 'application/json; charset=utf-8',
    buffer: Buffer.from(JSON.stringify({
      exportedAt,
      total: rows.length,
      filters: sanitizeExecutionExportFilters(normalized),
      list: rows
    }, null, 2), 'utf8')
  }
}

export async function runManagementAiAction({ actor, body = {} }) {
  ensureAdmin(actor)
  const envelope = normalizeActionEnvelope(body)

  const normalized = {
    kind: envelope.kind,
    version: envelope.version,
    action: envelope.action,
    dryRun: envelope.dryRun,
    idempotencyKey: envelope.idempotencyKey,
    target: envelope.target,
    input: envelope.input,
    changes: envelope.changes,
    reason: envelope.reason,
    meta: envelope.meta
  }

  if (envelope.dryRun) {
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.dry_run',
      envelope,
      outcome: 'validated'
    })
    return buildResultEnvelope({
      envelope,
      normalized,
      dryRun: true,
      executed: false
    })
  }

  const requestHash = createRequestHash(normalized)
  const replay = await resolveIdempotentExecution({ actor, envelope, normalized, requestHash })
  if (replay) {
    return replay
  }

  let execution
  try {
    execution = await createExecutionRecord({ actor, envelope, requestHash, normalized })
  } catch {
    const raceReplay = await resolveIdempotentExecution({ actor, envelope, normalized, requestHash })
    if (raceReplay) return raceReplay
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey is already reserved')
  }

  try {
    const result = await executeAction(actor, envelope)
    await updateExecutionRecord(execution.id, {
      status: 'completed',
      response_payload: result ?? null,
      error_code: null,
      error_message: null
    })
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.execute',
      envelope,
      outcome: 'completed'
    })
    return buildResultEnvelope({
      envelope,
      normalized,
      result: result ?? null,
      dryRun: false,
      executed: true,
      executionId: execution.id
    })
  } catch (error) {
    await updateExecutionRecord(execution.id, {
      status: 'failed',
      error_code: error?.code || 'INTERNAL_ERROR',
      error_message: error?.message || 'Management AI action failed',
      response_payload: null
    }).catch(() => {})
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.failed',
      envelope,
      outcome: 'failed',
      detail: `failed: ${toSummary(envelope)}; error=${error?.code || 'INTERNAL_ERROR'}`
    }).catch(() => {})
    throw error
  }
}
