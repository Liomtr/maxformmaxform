import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import User from '../models/User.js'

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: '未登录' } })
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret)
    req.user = payload
    next()
  } catch (e) {
    const code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    return res.status(401).json({ success: false, error: { code, message: '令牌无效或已过期' } })
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
    return res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: '未登录' } })
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret)
    const user = await User.findById(payload.sub)
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: { code: 'USER_DISABLED', message: '用户已被禁用' } })
    }
    req.user = { ...payload, role_id: user.role_id }
    next()
  } catch (e) {
    const code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    return res.status(401).json({ success: false, error: { code, message: '令牌无效或已过期' } })
  }
}

export function requireRole(...codes) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: '未登录' } })
    }
    if (codes.length === 0) return next()

    const userRoleCode = req.user.roleCode
    if (!userRoleCode || !codes.includes(userRoleCode)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权限执行此操作' } })
    }
    next()
  }
}
