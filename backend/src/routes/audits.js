import { Router } from 'express'
import AuditLog from '../models/AuditLog.js'
import { authRequired, requireRole } from '../middlewares/auth.js'

const router = Router()

router.use(authRequired, requireRole('admin'))

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, username, action, targetType } = req.query
    const result = await AuditLog.list({
      page: Number(page),
      pageSize: Number(pageSize),
      username: username ? String(username) : undefined,
      action: action ? String(action) : undefined,
      targetType: targetType ? String(targetType) : undefined
    })
    res.json({
      success: true,
      data: result.list,
      total: result.total,
      page: Number(page),
      pageSize: Number(pageSize)
    })
  } catch (e) { next(e) }
})

export default router
