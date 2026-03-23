import { Router } from 'express'
import User from '../models/User.js'
import { authRequired, requireRole } from '../middlewares/auth.js'

const router = Router()

router.use(authRequired, requireRole('admin'))

async function findUserByIdentity(identity) {
  if (/^\d+$/.test(String(identity))) {
    const byId = await User.findById(identity)
    if (byId) return byId
  }
  return User.findByUsername(String(identity))
}

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, dept_id, is_active } = req.query
    const result = await User.list({
      page: Number(page),
      pageSize: Number(pageSize),
      dept_id: dept_id ? Number(dept_id) : undefined,
      is_active: is_active !== undefined ? is_active === 'true' || is_active === '1' : undefined
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const user = await findUserByIdentity(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '用户不存在' } })
    }
    res.json({ success: true, data: User.toSafe(user) })
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const { username, email, password, role_id, dept_id } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '用户名和密码为必填项' } })
    }
    const existing = await User.findByUsername(username)
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: '用户名已存在' } })
    }

    const user = await User.create({ username, email, password, role_id, dept_id })
    res.json({ success: true, data: User.toSafe(user) })
  } catch (e) { next(e) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { email, is_active, dept_id, role_id } = req.body || {}
    const user = await User.update(req.params.id, { email, is_active, dept_id, role_id })
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '用户不存在' } })
    }
    res.json({ success: true, data: User.toSafe(user) })
  } catch (e) { next(e) }
})

router.put('/:id/password', async (req, res, next) => {
  try {
    const { password } = req.body || {}
    if (!password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '密码不能为空' } })
    }
    await User.updatePassword(req.params.id, password)
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await User.delete(req.params.id)
    res.json({ success: true })
  } catch (e) { next(e) }
})

export default router
