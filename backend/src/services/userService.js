import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import userRepository from '../repositories/userRepository.js'
import {
  ensurePlainObjectPayload,
  isPlainObject,
  normalizeOptionalBoolean,
  normalizeOptionalId,
  normalizeOptionalTrimmedString,
  normalizeRequiredTrimmedString
} from '../utils/managementPayload.js'
import {
  ensureQueryObject,
  normalizeOptionalBooleanQuery as normalizeOptionalBooleanQueryParam,
  normalizeOptionalIntegerQuery,
  normalizeStrictPagination
} from '../utils/queryValidation.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
import {
  createUserDto,
  createUserImportResult,
  createUserPageResult,
  MANAGEMENT_ERROR_CODES,
  normalizeUserListQuery
} from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function throwInvalidQuery(message) {
  throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
}

export async function listManagedUsers({ actor, query = {} }) {
  ensureAdmin(actor)

  ensureQueryObject(query, throwInvalidQuery)
  const pagination = normalizeStrictPagination(query, { page: 1, pageSize: 20 }, throwInvalidQuery)
  const normalized = normalizeUserListQuery({
    ...query,
    ...pagination,
    dept_id: normalizeOptionalIntegerQuery(query.dept_id, 'dept_id', throwInvalidQuery, { positive: true }),
    is_active: normalizeOptionalBooleanQueryParam(query.is_active, 'is_active', throwInvalidQuery)
  })
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
    throwManagementError(404, MANAGEMENT_ERROR_CODES.USER_NOT_FOUND, 'User not found')
  }

  return createUserDto(userRepository.toSafe(user))
}

export async function createManagedUser({ actor, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)

  return runManagementTransaction(async db => {
    const username = normalizeRequiredTrimmedString(body.username, {
      field: 'username',
      code: MANAGEMENT_ERROR_CODES.USER_REQUIRED_FIELDS,
      message: 'Username and password are required'
    })
    const password = normalizeRequiredTrimmedString(body.password, {
      field: 'password',
      code: MANAGEMENT_ERROR_CODES.USER_REQUIRED_FIELDS,
      message: 'Username and password are required'
    })
    const email = normalizeOptionalTrimmedString(body.email, {
      field: 'email',
      allowNull: true,
      emptyToNull: true
    })
    const role_id = normalizeOptionalId(body.role_id, { field: 'role_id' })
    const dept_id = normalizeOptionalId(body.dept_id, { field: 'dept_id' })
    const position_id = normalizeOptionalId(body.position_id, { field: 'position_id', allowNull: true })

    const existing = await userRepository.findByUsername(username, { db })
    if (existing) {
      throwManagementError(409, MANAGEMENT_ERROR_CODES.USER_EXISTS, 'Username already exists')
    }

    const user = await userRepository.create({ username, email, password, role_id, dept_id, position_id }, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'user.create',
        targetType: 'user',
        targetId: user.id,
        detail: `Created user ${user.username}`
      },
      message: {
        recipientId: actor.sub,
        title: 'User created',
        content: `User "${user.username}" was created.`,
        entityType: 'user',
        entityId: user.id
      }
    }, { db })

    return createUserDto(userRepository.toSafe(user))
  })
}

export async function importManagedUsers({ actor, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)

  const users = Array.isArray(body.users) ? body.users : null
  if (!users) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.USER_IMPORT_PAYLOAD_INVALID, 'users must be an array')
  }

  const result = {
    created: 0,
    skipped: 0,
    errors: []
  }
  const seen = new Set()

  for (let index = 0; index < users.length; index += 1) {
    const row = users[index]
    if (!isPlainObject(row)) {
      result.skipped += 1
      result.errors.push({ index, row: index + 1, username: '', reason: 'row must be an object' })
      continue
    }

    const username = typeof row.username === 'string' ? row.username.trim() : ''
    const email = typeof row.email === 'string' ? row.email.trim() : undefined
    const password = typeof row.password === 'string' ? row.password.trim() : ''
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

  await runManagementTransaction(async db => {
    await recordManagementAction({
      actor,
      audit: {
        action: 'user.import',
        targetType: 'user',
        targetId: null,
        detail: `Imported users: created=${result.created}, skipped=${result.skipped}`
      },
      message: {
        recipientId: actor.sub,
        title: 'User import completed',
        content: `Created ${result.created} users and skipped ${result.skipped}.`,
        entityType: 'user',
        entityId: null
      }
    }, { db })
  })

  return createUserImportResult(result)
}

export async function updateManagedUser({ actor, userId, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)

  return runManagementTransaction(async db => {
    const email = normalizeOptionalTrimmedString(body.email, {
      field: 'email',
      allowNull: true,
      emptyToNull: true
    })
    const is_active = normalizeOptionalBoolean(body.is_active, { field: 'is_active' })
    const dept_id = normalizeOptionalId(body.dept_id, { field: 'dept_id', allowNull: true })
    const role_id = normalizeOptionalId(body.role_id, { field: 'role_id', allowNull: true })
    const position_id = normalizeOptionalId(body.position_id, { field: 'position_id', allowNull: true })
    const user = await userRepository.update(userId, { email, is_active, dept_id, role_id, position_id }, { db })

    if (!user) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.USER_NOT_FOUND, 'User not found')
    }

    await recordManagementAction({
      actor,
      audit: {
        action: 'user.update',
        targetType: 'user',
        targetId: user.id,
        detail: `Updated user ${user.username}`
      },
      message: {
        recipientId: actor.sub,
        title: 'User updated',
        content: `User "${user.username}" was updated.`,
        entityType: 'user',
        entityId: user.id
      }
    }, { db })

    return createUserDto(userRepository.toSafe(user))
  })
}

export async function resetManagedUserPassword({ actor, userId, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)

  await runManagementTransaction(async db => {
    const password = normalizeRequiredTrimmedString(body.password, {
      field: 'password',
      code: MANAGEMENT_ERROR_CODES.USER_PASSWORD_REQUIRED,
      message: 'Password is required'
    })

    const user = await userRepository.findById(userId, { db })
    if (!user) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.USER_NOT_FOUND, 'User not found')
    }

    await userRepository.updatePassword(userId, password, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'user.password.reset',
        targetType: 'user',
        targetId: user.id,
        detail: `Reset password for user ${user.username}`
      },
      message: {
        recipientId: actor.sub,
        title: 'User password reset',
        content: `Password for user "${user.username}" was reset.`,
        entityType: 'user',
        entityId: user.id
      }
    }, { db })
  })
}

export async function deleteManagedUser({ actor, userId }) {
  ensureAdmin(actor)

  await runManagementTransaction(async db => {
    const user = await userRepository.findById(userId, { db })
    if (!user) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.USER_NOT_FOUND, 'User not found')
    }

    await userRepository.delete(userId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'user.delete',
        targetType: 'user',
        targetId: user.id,
        detail: `Deleted user ${user.username}`
      },
      message: {
        recipientId: actor.sub,
        title: 'User deleted',
        content: `User "${user.username}" was deleted.`,
        entityType: 'user',
        entityId: user.id
      }
    }, { db })
  })
}
