import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import flowRepository from '../repositories/flowRepository.js'
import {
  ensurePlainObjectPayload,
  normalizeOptionalTrimmedString,
  normalizeRequiredTrimmedString
} from '../utils/managementPayload.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
import { createFlowDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const FLOW_STATUSES = new Set(['draft', 'active', 'disabled'])

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function normalizeFlowName(name, { required = false } = {}) {
  if (name === undefined) {
    if (required) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.FLOW_NAME_REQUIRED, 'Flow name is required')
    }
    return undefined
  }
  return normalizeRequiredTrimmedString(name, {
    field: 'name',
    code: MANAGEMENT_ERROR_CODES.FLOW_NAME_REQUIRED,
    message: 'Flow name is required'
  })
}

function normalizeFlowStatus(status, { required = false, defaultValue } = {}) {
  if (status === undefined) {
    if (defaultValue !== undefined) return defaultValue
    if (required) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.FLOW_STATUS_REQUIRED, 'Flow status is required')
    }
    return undefined
  }

  const normalized = normalizeRequiredTrimmedString(status, {
    field: 'status',
    code: MANAGEMENT_ERROR_CODES.FLOW_STATUS_REQUIRED,
    message: 'Flow status is required'
  })
  if (!FLOW_STATUSES.has(normalized)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.FLOW_STATUS_INVALID, 'Flow status is invalid')
  }

  return normalized
}

function normalizeFlowDescription(description) {
  return normalizeOptionalTrimmedString(description, {
    field: 'description',
    allowNull: true,
    emptyToNull: true
  })
}

async function getManagedFlowOrThrow(flowId, options = {}) {
  const flow = await flowRepository.findById(flowId, options)
  if (!flow) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.FLOW_NOT_FOUND, 'Flow not found')
  }
  return flow
}

export async function listManagedFlows({ actor }) {
  ensureAdmin(actor)
  const flows = await flowRepository.list()
  return flows.map(item => createFlowDto(item))
}

export async function createManagedFlow({ actor, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)

  return runManagementTransaction(async db => {
    const flow = await flowRepository.create({
      name: normalizeFlowName(body.name, { required: true }),
      status: normalizeFlowStatus(body.status, { defaultValue: 'draft' }),
      description: normalizeFlowDescription(body.description)
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'flow.create',
        targetType: 'flow',
        targetId: flow.id,
        detail: `Created flow ${flow.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Flow created',
        content: `Flow "${flow.name}" was created.`,
        entityType: 'flow',
        entityId: flow.id
      }
    }, { db })

    return createFlowDto(flow)
  })
}

export async function updateManagedFlow({ actor, flowId, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)
  return runManagementTransaction(async db => {
    await getManagedFlowOrThrow(flowId, { db })

    const flow = await flowRepository.update(flowId, {
      name: normalizeFlowName(body.name),
      status: normalizeFlowStatus(body.status),
      description: normalizeFlowDescription(body.description)
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'flow.update',
        targetType: 'flow',
        targetId: flow.id,
        detail: `Updated flow ${flow.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Flow updated',
        content: `Flow "${flow.name}" was updated.`,
        entityType: 'flow',
        entityId: flow.id
      }
    }, { db })

    return createFlowDto(flow)
  })
}

export async function deleteManagedFlow({ actor, flowId }) {
  ensureAdmin(actor)
  await runManagementTransaction(async db => {
    const flow = await getManagedFlowOrThrow(flowId, { db })
    await flowRepository.delete(flowId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'flow.delete',
        targetType: 'flow',
        targetId: flow.id,
        detail: `Deleted flow ${flow.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Flow deleted',
        content: `Flow "${flow.name}" was deleted.`,
        entityType: 'flow',
        entityId: flow.id
      }
    }, { db })
  })
}
