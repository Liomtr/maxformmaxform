import { Router } from 'express'
import Dept from '../models/Dept.js'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { createAuditMessage, recordAudit } from '../services/activity.js'

const router = Router()

router.use(authRequired)

router.get('/', async (_req, res, next) => {
  try {
    const list = await Dept.list()
    res.json({ success: true, data: list })
  } catch (e) { next(e) }
})

router.get('/tree', async (_req, res, next) => {
  try {
    const tree = await Dept.tree()
    res.json({ success: true, data: tree })
  } catch (e) { next(e) }
})

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, parent_id, sort_order } = req.body || {}
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Department name is required' } })
    }
    const dept = await Dept.create({ name: String(name).trim(), parent_id, sort_order })
    await recordAudit({ actor: req.user, action: 'dept.create', targetType: 'dept', targetId: dept.id, detail: `Created department ${dept.name}` })
    await createAuditMessage({
      recipientId: req.user.sub,
      createdBy: req.user.sub,
      title: 'Department created',
      content: `Department "${dept.name}" was created.`,
      entityType: 'dept',
      entityId: dept.id
    })
    res.json({ success: true, data: dept })
  } catch (e) { next(e) }
})

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, parent_id, sort_order } = req.body || {}
    const dept = await Dept.update(req.params.id, {
      name: name === undefined ? undefined : String(name).trim(),
      parent_id,
      sort_order
    })
    if (!dept) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Department not found' } })
    }
    await recordAudit({ actor: req.user, action: 'dept.update', targetType: 'dept', targetId: dept.id, detail: `Updated department ${dept.name}` })
    res.json({ success: true, data: dept })
  } catch (e) { next(e) }
})

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const dept = await Dept.findById(req.params.id)
    if (!dept) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Department not found' } })
    }

    const childCount = await Dept.countChildren(req.params.id)
    if (childCount > 0) {
      return res.status(409).json({ success: false, error: { code: 'DEPT_HAS_CHILDREN', message: 'Delete child departments first' } })
    }

    const userCount = await Dept.countUsers(req.params.id)
    if (userCount > 0) {
      await Dept.clearUsersDept(req.params.id)
    }

    await Dept.delete(req.params.id)
    await recordAudit({ actor: req.user, action: 'dept.delete', targetType: 'dept', targetId: dept.id, detail: `Deleted department ${dept.name}` })
    await createAuditMessage({
      recipientId: req.user.sub,
      createdBy: req.user.sub,
      title: 'Department deleted',
      content: userCount > 0
        ? `Department "${dept.name}" was deleted and ${userCount} users were detached.`
        : `Department "${dept.name}" was deleted.`,
      entityType: 'dept',
      entityId: dept.id
    })
    res.json({ success: true, data: { clearedUsers: userCount } })
  } catch (e) { next(e) }
})

export default router
