import { createResponseError, throwPolicyError } from '../http/errors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import positionRepository from '../repositories/positionRepository.js'
import { createPositionDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwPolicyError(getAdminPolicy(actor))
}

export async function listManagedPositions() {
  const positions = await positionRepository.list()
  return positions.map(item => createPositionDto(item))
}

export async function createManagedPosition({ actor, body = {} }) {
  ensureAdmin(actor)

  const normalizedName = String(body.name || '').trim()
  const normalizedCode = String(body.code || '').trim() || null

  if (!normalizedName) {
    throw createResponseError(400, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.VALIDATION, message: 'Position name is required' }
    })
  }

  if (normalizedCode) {
    const existing = await positionRepository.findByCode(normalizedCode)
    if (existing) {
      throw createResponseError(409, {
        success: false,
        error: { code: MANAGEMENT_ERROR_CODES.POSITION_EXISTS, message: 'Position code already exists' }
      })
    }
  }

  const position = await positionRepository.create({
    name: normalizedName,
    code: normalizedCode,
    is_virtual: Boolean(body.is_virtual ?? body.isVirtual),
    remark: body.remark == null ? null : String(body.remark)
  })
  return createPositionDto(position)
}

export async function updateManagedPosition({ actor, positionId, body = {} }) {
  ensureAdmin(actor)

  const existing = await positionRepository.findById(positionId)
  if (!existing) {
    throw createResponseError(404, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.NOT_FOUND, message: 'Position not found' }
    })
  }

  const normalizedCode = body.code === undefined ? undefined : (String(body.code || '').trim() || null)
  if (normalizedCode) {
    const duplicate = await positionRepository.findByCode(normalizedCode)
    if (duplicate && Number(duplicate.id) !== Number(existing.id)) {
      throw createResponseError(409, {
        success: false,
        error: { code: MANAGEMENT_ERROR_CODES.POSITION_EXISTS, message: 'Position code already exists' }
      })
    }
  }

  const position = await positionRepository.update(positionId, {
    name: body.name === undefined ? undefined : String(body.name || '').trim(),
    code: normalizedCode,
    is_virtual: body.is_virtual === undefined && body.isVirtual === undefined
      ? undefined
      : Boolean(body.is_virtual ?? body.isVirtual),
    remark: body.remark === undefined ? undefined : (body.remark == null ? null : String(body.remark))
  })
  return createPositionDto(position)
}

export async function deleteManagedPosition({ actor, positionId }) {
  ensureAdmin(actor)

  const existing = await positionRepository.findById(positionId)
  if (!existing) {
    throw createResponseError(404, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.NOT_FOUND, message: 'Position not found' }
    })
  }

  await positionRepository.delete(positionId)
}
