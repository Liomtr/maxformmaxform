import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import positionRepository from '../repositories/positionRepository.js'
import {
  ensurePlainObjectPayload,
  normalizeOptionalBoolean,
  normalizeOptionalTrimmedString,
  normalizeRequiredTrimmedString
} from '../utils/managementPayload.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
import { createPositionDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function ensureAuthenticated(actor) {
  throwManagementPolicyError(getAuthenticatedActorPolicy(actor))
}

export async function listManagedPositions({ actor }) {
  ensureAuthenticated(actor)
  const positions = await positionRepository.list()
  return positions.map(item => createPositionDto(item))
}

export async function createManagedPosition({ actor, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)

  return runManagementTransaction(async db => {
    const normalizedName = normalizeRequiredTrimmedString(body.name, {
      field: 'name',
      code: MANAGEMENT_ERROR_CODES.POSITION_NAME_REQUIRED,
      message: 'Position name is required'
    })
    const normalizedCode = normalizeOptionalTrimmedString(body.code, {
      field: 'code',
      allowNull: true,
      emptyToNull: true
    })

    if (normalizedCode) {
      const existing = await positionRepository.findByCode(normalizedCode, { db })
      if (existing) {
        throwManagementError(409, MANAGEMENT_ERROR_CODES.POSITION_EXISTS, 'Position code already exists')
      }
    }

    const position = await positionRepository.create({
      name: normalizedName,
      code: normalizedCode,
      is_virtual: normalizeOptionalBoolean(body.is_virtual ?? body.isVirtual, { field: 'is_virtual' }) ?? false,
      remark: normalizeOptionalTrimmedString(body.remark, {
        field: 'remark',
        allowNull: true,
        emptyToNull: true
      })
    }, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'position.create',
        targetType: 'position',
        targetId: position.id,
        detail: `Created position ${position.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Position created',
        content: `Position "${position.name}" was created.`,
        entityType: 'position',
        entityId: position.id
      }
    }, { db })
    return createPositionDto(position)
  })
}

export async function updateManagedPosition({ actor, positionId, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)

  return runManagementTransaction(async db => {
    const existing = await positionRepository.findById(positionId, { db })
    if (!existing) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.POSITION_NOT_FOUND, 'Position not found')
    }

    const normalizedCode = normalizeOptionalTrimmedString(body.code, {
      field: 'code',
      allowNull: true,
      emptyToNull: true
    })
    if (normalizedCode) {
      const duplicate = await positionRepository.findByCode(normalizedCode, { db })
      if (duplicate && Number(duplicate.id) !== Number(existing.id)) {
        throwManagementError(409, MANAGEMENT_ERROR_CODES.POSITION_EXISTS, 'Position code already exists')
      }
    }

    const position = await positionRepository.update(positionId, {
      name: body.name === undefined
        ? undefined
        : normalizeRequiredTrimmedString(body.name, {
            field: 'name',
            code: MANAGEMENT_ERROR_CODES.POSITION_NAME_REQUIRED,
            message: 'Position name is required'
          }),
      code: normalizedCode,
      is_virtual: body.is_virtual === undefined && body.isVirtual === undefined
        ? undefined
        : normalizeOptionalBoolean(body.is_virtual ?? body.isVirtual, { field: 'is_virtual' }),
      remark: normalizeOptionalTrimmedString(body.remark, {
        field: 'remark',
        allowNull: true,
        emptyToNull: true
      })
    }, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'position.update',
        targetType: 'position',
        targetId: position.id,
        detail: `Updated position ${position.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Position updated',
        content: `Position "${position.name}" was updated.`,
        entityType: 'position',
        entityId: position.id
      }
    }, { db })
    return createPositionDto(position)
  })
}

export async function deleteManagedPosition({ actor, positionId }) {
  ensureAdmin(actor)

  await runManagementTransaction(async db => {
    const existing = await positionRepository.findById(positionId, { db })
    if (!existing) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.POSITION_NOT_FOUND, 'Position not found')
    }

    await positionRepository.delete(positionId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'position.delete',
        targetType: 'position',
        targetId: existing.id,
        detail: `Deleted position ${existing.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Position deleted',
        content: `Position "${existing.name}" was deleted.`,
        entityType: 'position',
        entityId: existing.id
      }
    }, { db })
  })
}
