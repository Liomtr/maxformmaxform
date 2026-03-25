import { Router } from 'express'
import User from '../models/User.js'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { createAuditMessage, recordAudit } from '../services/activity.js'

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
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } })
    }
    res.json({ success: true, data: User.toSafe(user) })
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const { username, email, password, role_id, dept_id, position_id } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Username and password are required' } })
    }
    const existing = await User.findByUsername(username)
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: 'Username already exists' } })
    }

    const user = await User.create({ username, email, password, role_id, dept_id, position_id })
    await recordAudit({ actor: req.user, action: 'user.create', targetType: 'user', targetId: user.id, detail: `Created user ${user.username}` })
    res.json({ success: true, data: User.toSafe(user) })
  } catch (e) { next(e) }
})

router.post('/import', async (req, res, next) => {
  try {
    const users = Array.isArray(req.body?.users) ? req.body.users : null
    if (!users) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'users must be an array' } })
    }

    const result = {
      created: 0,
      skipped: 0,
      errors: []
    }
    const seen = new Set()

    for (let index = 0; index < users.length; index += 1) {
      const row = users[index] || {}
      const username = String(row.username || '').trim()
      const email = row.email ? String(row.email).trim() : undefined
      const password = String(row.password || '').trim()
      const role_id = row.role_id !== undefined && row.role_id !== null && row.role_id !== '' ? Number(row.role_id) : undefined
      const dept_id = row.dept_id !== undefined && row.dept_id !== null && row.dept_id !== '' ? Number(row.dept_id) : undefined
      const position_id = row.position_id !== undefined && row.position_id !== null && row.position_id !== '' ? Number(row.position_id) : undefined

      if (!username) {
        result.skipped += 1
        result.errors.push({ index, row: index + 1, username, reason: 'username is required' })
        continue
      }
      if (!password) {
        result.skipped += 1
        result.errors.push({ index, row: index + 1, username, reason: 'password is required' })
        continue
      }
      if (seen.has(username)) {
        result.skipped += 1
        result.errors.push({ index, row: index + 1, username, reason: 'duplicate username in import payload' })
        continue
      }
      seen.add(username)

      try {
        const existing = await User.findByUsername(username)
        if (existing) {
          result.skipped += 1
          result.errors.push({ index, row: index + 1, username, reason: 'user already exists' })
          continue
        }

        await User.create({ username, email, password, role_id, dept_id, position_id })
        result.created += 1
      } catch (error) {
        result.skipped += 1
        result.errors.push({
          index,
          row: index + 1,
          username,
          reason: error?.message || 'create failed'
        })
      }
    }

    await recordAudit({
      actor: req.user,
      action: 'user.import',
      targetType: 'user',
      targetId: null,
      detail: `Imported users: created=${result.created}, skipped=${result.skipped}`
    })
    await createAuditMessage({
      recipientId: req.user.sub,
      createdBy: req.user.sub,
      title: 'User import completed',
      content: `Created ${result.created} users and skipped ${result.skipped}.`,
      entityType: 'user',
      entityId: null
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { email, is_active, dept_id, role_id, position_id } = req.body || {}
    const user = await User.update(req.params.id, { email, is_active, dept_id, role_id, position_id })
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } })
    }
    await recordAudit({ actor: req.user, action: 'user.update', targetType: 'user', targetId: user.id, detail: `Updated user ${user.username}` })
    res.json({ success: true, data: User.toSafe(user) })
  } catch (e) { next(e) }
})

router.put('/:id/password', async (req, res, next) => {
  try {
    const { password } = req.body || {}
    if (!password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Password is required' } })
    }
    await User.updatePassword(req.params.id, password)
    await recordAudit({ actor: req.user, action: 'user.password.reset', targetType: 'user', targetId: req.params.id, detail: `Reset password for user ${req.params.id}` })
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await User.delete(req.params.id)
    await recordAudit({ actor: req.user, action: 'user.delete', targetType: 'user', targetId: req.params.id, detail: `Deleted user ${req.params.id}` })
    res.json({ success: true })
  } catch (e) { next(e) }
})

export default router
