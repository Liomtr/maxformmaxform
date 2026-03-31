import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import { throwAuthError, throwAuthPolicyError } from '../http/authErrors.js'
import { getCurrentAuthSessionPolicy } from '../policies/authPolicy.js'
import roleRepository from '../repositories/roleRepository.js'
import userRepository from '../repositories/userRepository.js'
import {
  AUTH_ERROR_CODES,
  createAuthSessionDto,
  createAuthTokenDto,
  normalizeAuthCredentials
} from '../../../shared/auth.contract.js'

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeValidatedAuthCredentials(body = {}) {
  if (!isPlainObject(body)) {
    throwAuthError(400, AUTH_ERROR_CODES.INVALID_PAYLOAD, 'Request body must be an object')
  }

  if (body.username !== undefined && typeof body.username !== 'string') {
    throwAuthError(400, AUTH_ERROR_CODES.INVALID_PAYLOAD, 'username must be a string')
  }
  if (body.email !== undefined && body.email !== null && typeof body.email !== 'string') {
    throwAuthError(400, AUTH_ERROR_CODES.INVALID_PAYLOAD, 'email must be a string')
  }
  if (body.password !== undefined && typeof body.password !== 'string') {
    throwAuthError(400, AUTH_ERROR_CODES.INVALID_PAYLOAD, 'password must be a string')
  }

  return normalizeAuthCredentials(body)
}

function signToken(user, roleCode) {
  return jwt.sign(
    { sub: user.id, username: user.username, roleCode },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

function ensureAuthenticated(actor) {
  throwAuthPolicyError(getCurrentAuthSessionPolicy(actor))
}

export async function registerAuthUser({ body = {} }) {
  const { username, email, password } = normalizeValidatedAuthCredentials(body)
  if (!username || !password) {
    throwAuthError(400, AUTH_ERROR_CODES.MISSING_FIELDS, 'Username and password are required')
  }

  const existing = await userRepository.findByUsername(username)
  if (existing) {
    throwAuthError(409, AUTH_ERROR_CODES.USER_EXISTS, 'Username already exists')
  }

  if (email) {
    const emailTaken = await userRepository.findByEmail(email)
    if (emailTaken) {
      throwAuthError(409, AUTH_ERROR_CODES.EMAIL_EXISTS, 'Email already exists')
    }
  }

  const defaultRole = await roleRepository.findByCode('user')
  const user = await userRepository.create({
    username,
    email: email || undefined,
    password,
    role_id: defaultRole?.id
  })

  return createAuthTokenDto({
    token: signToken(user, 'user'),
    user: userRepository.toSafe(user)
  })
}

export async function loginAuthUser({ body = {} }) {
  const { username, password } = normalizeValidatedAuthCredentials(body)
  if (!username || !password) {
    throwAuthError(400, AUTH_ERROR_CODES.MISSING_FIELDS, 'Username and password are required')
  }

  const user = await userRepository.findByUsername(username)
  if (!user) {
    throwAuthError(401, AUTH_ERROR_CODES.AUTH_FAILED, 'Username or password is incorrect')
  }

  if (!user.is_active) {
    throwAuthError(403, AUTH_ERROR_CODES.USER_DISABLED, 'User account is disabled')
  }

  const verified = await userRepository.verifyPassword(password, user.password)
  if (!verified) {
    throwAuthError(401, AUTH_ERROR_CODES.AUTH_FAILED, 'Username or password is incorrect')
  }

  await userRepository.updateLastLogin(user.id)
  const role = user.role_id ? await roleRepository.findById(user.role_id) : null

  return createAuthTokenDto({
    token: signToken(user, role?.code || 'user'),
    user: userRepository.toSafe(user)
  })
}

export async function getCurrentAuthSession({ actor }) {
  ensureAuthenticated(actor)

  const user = await userRepository.findById(actor.sub)
  if (!user) {
    throwAuthError(401, AUTH_ERROR_CODES.USER_NOT_FOUND, 'User not found')
  }

  const role = user.role_id ? await roleRepository.findById(user.role_id) : null
  return createAuthSessionDto({
    user: userRepository.toSafe(user),
    role
  })
}
