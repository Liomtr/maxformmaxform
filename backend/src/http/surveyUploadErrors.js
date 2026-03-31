import { createResponseError, throwPolicyError } from './errors.js'

export function createSurveyUploadError(status, code, message) {
  return createResponseError(status, {
    success: false,
    error: { code, message }
  })
}

export function throwSurveyUploadError(status, code, message) {
  throw createSurveyUploadError(status, code, message)
}

export function throwSurveyUploadPolicyError(policy) {
  if (policy?.allowed) return
  throwPolicyError(policy)
}
