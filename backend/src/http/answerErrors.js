import { createResponseError, throwPolicyError } from './errors.js'

export function createAnswerError(status, code, message) {
  return createResponseError(status, {
    success: false,
    error: { code, message }
  })
}

export function throwAnswerError(status, code, message) {
  throw createAnswerError(status, code, message)
}

export function throwAnswerPolicyError(policy) {
  if (policy?.allowed) return
  throwPolicyError(policy)
}
