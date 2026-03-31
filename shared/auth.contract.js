import { createRoleDto, createUserDto } from './management.contract.js'

export const AUTH_ERROR_CODES = Object.freeze({
  NO_TOKEN: 'NO_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  MISSING_FIELDS: 'MISSING_FIELDS',
  USER_EXISTS: 'USER_EXISTS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  AUTH_FAILED: 'AUTH_FAILED',
  USER_DISABLED: 'USER_DISABLED',
  USER_NOT_FOUND: 'USER_NOT_FOUND'
})

export function normalizeAuthCredentials(body = {}) {
  return {
    username: String(body.username || '').trim(),
    email: body.email ? String(body.email).trim() : '',
    password: String(body.password || '')
  }
}

export function createAuthTokenDto(payload = {}) {
  return {
    token: payload?.token ? String(payload.token) : '',
    user: createUserDto(payload?.user)
  }
}

export function createAuthSessionDto(payload = {}) {
  return {
    user: createUserDto(payload?.user),
    role: createRoleDto(payload?.role)
  }
}
