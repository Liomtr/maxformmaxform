export function createHttpError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

export function createResponseError(status, body) {
  const error = Object.assign(new Error(body?.error?.message || 'Request failed'), {
    status,
    body
  })

  if (body?.error?.code) {
    error.code = body.error.code
  }

  return error
}

export function throwPolicyError(policy) {
  if (policy?.allowed) return

  throw createResponseError(policy?.status || 403, policy?.body || {
    success: false,
    error: { code: 'FORBIDDEN', message: 'Forbidden' }
  })
}
