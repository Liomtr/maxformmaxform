import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import User from '../models/User.js'
import { AUTH_ERROR_CODES } from '../../../shared/auth.contract.js'

function createAuthFailure(code, message) {
  return { success: false, error: { code, message } }
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json(createAuthFailure(AUTH_ERROR_CODES.NO_TOKEN, 'Authentication required'))
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret)
    req.user = payload
    next()
  } catch (error) {
    const code = error.name === 'TokenExpiredError' ? AUTH_ERROR_CODES.TOKEN_EXPIRED : AUTH_ERROR_CODES.INVALID_TOKEN
    return res.status(401).json(createAuthFailure(code, 'Token is invalid or expired'))
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    req.user = null
    return next()
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret)
    req.user = payload
  } catch {
    req.user = null
  }

  next()
}

export async function authRequiredStrict(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json(createAuthFailure(AUTH_ERROR_CODES.NO_TOKEN, 'Authentication required'))
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret)
    const user = await User.findById(payload.sub)
    if (!user || !user.is_active) {
      return res.status(401).json(createAuthFailure(AUTH_ERROR_CODES.USER_DISABLED, 'User account is disabled'))
    }
    req.user = { ...payload, role_id: user.role_id }
    next()
  } catch (error) {
    const code = error.name === 'TokenExpiredError' ? AUTH_ERROR_CODES.TOKEN_EXPIRED : AUTH_ERROR_CODES.INVALID_TOKEN
    return res.status(401).json(createAuthFailure(code, 'Token is invalid or expired'))
  }
}

export function requireRole(...codes) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(createAuthFailure(AUTH_ERROR_CODES.NO_TOKEN, 'Authentication required'))
    }
    if (codes.length === 0) return next()

    const userRoleCode = req.user.roleCode
    if (!userRoleCode || !codes.includes(userRoleCode)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } })
    }
    next()
  }
}
