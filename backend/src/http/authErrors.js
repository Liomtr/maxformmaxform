import { AUTH_ERROR_CODES } from '../../../shared/auth.contract.js'
import { createResponseError, throwPolicyError } from './errors.js'

export function createAuthError(status, code, message) {
  return createResponseError(status, {
    success: false,
    error: { code, message }
  })
}

export function throwAuthError(status, code, message) {
  throw createAuthError(status, code, message)
}

export function throwAuthPolicyError(policy) {
  if (policy?.allowed) return

  const status = Number(policy?.status) || 403
  if (status === 401) {
    throwPolicyError(policy)
  }

  throwAuthError(
    status,
    AUTH_ERROR_CODES.INVALID_TOKEN,
    policy?.body?.error?.message || 'Forbidden'
  )
}
