import { createResponseError, throwPolicyError } from '../http/errors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import userRepository from '../repositories/userRepository.js'
import { createAuditMessage, recordAudit } from './activity.js'
import {
  createUserDto,
  createUserImportResult,
  createUserPageResult,
  MANAGEMENT_ERROR_CODES,
  normalizeUserListQuery
} from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwPolicyError(getAdminPolicy(actor))
}

export async function listManagedUsers({ actor, query = {} }) {
  ensureAdmin(actor)

  const normalized = normalizeUserListQuery(query)
  const result = await userRepository.list(normalized)
  return createUserPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}

export async function getManagedUser({ actor, identity }) {
  ensureAdmin(actor)

  const user = await userRepository.findByIdentity(identity)
  if (!user) {
    throw createResponseError(404, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.NOT_FOUND, message: 'User not found' }
    })
  }

  return createUserDto(userRepository.toSafe(user))
}

export async function createManagedUser({ actor, body = {} }) {
  ensureAdmin(actor)

  const { username, email, password, role_id, dept_id, position_id } = body
  if (!username || !password) {
    throw createResponseError(400, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.VALIDATION, message: 'Username and password are required' }
    })
  }

  const existing = await userRepository.findByUsername(username)
  if (existing) {
    throw createResponseError(409, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.USER_EXISTS, message: 'Username already exists' }
    })
  }

  const user = await userRepository.create({ username, email, password, role_id, dept_id, position_id })
  await recordAudit({
    actor,
    action: 'user.create',
    targetType: 'user',
    targetId: user.id,
    detail: `Created user ${user.username}`
  })

  return createUserDto(userRepository.toSafe(user))
}

export async function importManagedUsers({ actor, body = {} }) {
  ensureAdmin(actor)

  const users = Array.isArray(body.users) ? body.users : null
  if (!users) {
    throw createResponseError(400, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.VALIDATION, message: 'users must be an array' }
    })
  }

  const result = {
    created: 0,
    skipped: 0,
    errors: []
  }
  const seen = new Set()

  for (let index = 0; index < users.length; index += 1) {
    const row = users[index] || {}
    const username = String(row.username || '').trim()
    const email = row.email ? String(row.email).trim() : undefined
    const password = String(row.password || '').trim()
    const role_id = row.role_id !== undefined && row.role_id !== null && row.role_id !== '' ? Number(row.role_id) : undefined
    const dept_id = row.dept_id !== undefined && row.dept_id !== null && row.dept_id !== '' ? Number(row.dept_id) : undefined
    const position_id = row.position_id !== undefined && row.position_id !== null && row.position_id !== '' ? Number(row.position_id) : undefined

    if (!username) {
      result.skipped += 1
      result.errors.push({ index, row: index + 1, username, reason: 'username is required' })
      continue
    }
    if (!password) {
      result.skipped += 1
      result.errors.push({ index, row: index + 1, username, reason: 'password is required' })
      continue
    }
    if (seen.has(username)) {
      result.skipped += 1
      result.errors.push({ index, row: index + 1, username, reason: 'duplicate username in import payload' })
      continue
    }
    seen.add(username)

    try {
      const existing = await userRepository.findByUsername(username)
      if (existing) {
        result.skipped += 1
        result.errors.push({ index, row: index + 1, username, reason: 'user already exists' })
        continue
      }

      await userRepository.create({ username, email, password, role_id, dept_id, position_id })
      result.created += 1
    } catch (error) {
      result.skipped += 1
      result.errors.push({
        index,
        row: index + 1,
        username,
        reason: error?.message || 'create failed'
      })
    }
  }

  await recordAudit({
    actor,
    action: 'user.import',
    targetType: 'user',
    targetId: null,
    detail: `Imported users: created=${result.created}, skipped=${result.skipped}`
  })
  await createAuditMessage({
    recipientId: actor.sub,
    createdBy: actor.sub,
    title: 'User import completed',
    content: `Created ${result.created} users and skipped ${result.skipped}.`,
    entityType: 'user',
    entityId: null
  })

  return createUserImportResult(result)
}

export async function updateManagedUser({ actor, userId, body = {} }) {
  ensureAdmin(actor)

  const { email, is_active, dept_id, role_id, position_id } = body
  const user = await userRepository.update(userId, { email, is_active, dept_id, role_id, position_id })

  if (!user) {
    throw createResponseError(404, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.NOT_FOUND, message: 'User not found' }
    })
  }

  await recordAudit({
    actor,
    action: 'user.update',
    targetType: 'user',
    targetId: user.id,
    detail: `Updated user ${user.username}`
  })

  return createUserDto(userRepository.toSafe(user))
}

export async function resetManagedUserPassword({ actor, userId, body = {} }) {
  ensureAdmin(actor)

  const { password } = body
  if (!password) {
    throw createResponseError(400, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.VALIDATION, message: 'Password is required' }
    })
  }

  await userRepository.updatePassword(userId, password)
  await recordAudit({
    actor,
    action: 'user.password.reset',
    targetType: 'user',
    targetId: userId,
    detail: `Reset password for user ${userId}`
  })
}

export async function deleteManagedUser({ actor, userId }) {
  ensureAdmin(actor)

  await userRepository.delete(userId)
  await recordAudit({
    actor,
    action: 'user.delete',
    targetType: 'user',
    targetId: userId,
    detail: `Deleted user ${userId}`
  })
}
