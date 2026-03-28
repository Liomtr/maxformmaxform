import { isAdmin } from './accessPolicy.js'

export function getAdminPolicy(user, options = {}) {
  if (isAdmin(user)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    status: 403,
    body: {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: options.message || 'Admin access required'
      }
    }
  }
}
