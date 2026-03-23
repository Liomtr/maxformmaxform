import { Router } from 'express'
import Folder from '../models/Folder.js'
import { authRequired } from '../middlewares/auth.js'
import { createAuditMessage, recordAudit } from '../services/activity.js'

const router = Router()

router.use(authRequired)

async function ensureParentFolder(parentId, creatorId) {
  if (parentId == null) return null
  const parent = await Folder.findById(parentId, creatorId)
  if (!parent) {
    throw Object.assign(new Error('Folder parent not found'), { status: 404, code: 'PARENT_FOLDER_NOT_FOUND' })
  }
  return parent
}

router.get('/', async (req, res, next) => {
  try {
    const hasParent = Object.prototype.hasOwnProperty.call(req.query, 'parentId')
    const parent_id = hasParent
      ? (req.query.parentId === '' || req.query.parentId === 'null' ? null : Number(req.query.parentId))
      : undefined
    const list = await Folder.list({ creator_id: req.user.sub, parent_id })
    res.json({ success: true, data: list })
  } catch (e) { next(e) }
})

router.get('/all', async (req, res, next) => {
  try {
    const list = await Folder.list({ creator_id: req.user.sub })
    res.json({ success: true, data: list })
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const parent_id = req.body?.parentId ?? req.body?.parent_id ?? null
    if (!name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Folder name is required' } })
    }

    await ensureParentFolder(parent_id, req.user.sub)
    const folder = await Folder.create({ creator_id: req.user.sub, name, parent_id })
    await recordAudit({ actor: req.user, action: 'folder.create', targetType: 'folder', targetId: folder.id, detail: `Created folder ${name}` })
    await createAuditMessage({
      recipientId: req.user.sub,
      createdBy: req.user.sub,
      title: 'Folder created',
      content: `Folder "${name}" is ready.`,
      entityType: 'folder',
      entityId: folder.id
    })
    res.json({ success: true, data: folder })
  } catch (e) { next(e) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await Folder.findById(req.params.id, req.user.sub)
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Folder not found' } })
    }

    const hasParent = Object.prototype.hasOwnProperty.call(req.body || {}, 'parentId') || Object.prototype.hasOwnProperty.call(req.body || {}, 'parent_id')
    const parent_id = hasParent ? (req.body?.parentId ?? req.body?.parent_id ?? null) : undefined
    if (parent_id !== undefined && parent_id !== null && Number(parent_id) === Number(existing.id)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Folder cannot be its own parent' } })
    }

    if (parent_id !== undefined) await ensureParentFolder(parent_id, req.user.sub)

    const name = req.body?.name === undefined ? undefined : String(req.body.name || '').trim()
    if (name !== undefined && !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Folder name is required' } })
    }

    const folder = await Folder.update(existing.id, req.user.sub, { name, parent_id })
    await recordAudit({ actor: req.user, action: 'folder.update', targetType: 'folder', targetId: folder?.id || existing.id, detail: `Updated folder ${folder?.name || existing.name}` })
    res.json({ success: true, data: folder })
  } catch (e) { next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await Folder.findById(req.params.id, req.user.sub)
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Folder not found' } })
    }

    const childCount = await Folder.countChildren(existing.id, req.user.sub)
    if (childCount > 0) {
      return res.status(409).json({ success: false, error: { code: 'FOLDER_HAS_CHILDREN', message: 'Delete child folders first' } })
    }

    const movedSurveys = await Folder.moveSurveysToRoot(existing.id, req.user.sub)
    await Folder.delete(existing.id, req.user.sub)
    await recordAudit({ actor: req.user, action: 'folder.delete', targetType: 'folder', targetId: existing.id, detail: `Deleted folder ${existing.name}` })
    await createAuditMessage({
      recipientId: req.user.sub,
      createdBy: req.user.sub,
      title: 'Folder deleted',
      content: movedSurveys > 0
        ? `Folder "${existing.name}" was deleted and ${movedSurveys} surveys were moved to root.`
        : `Folder "${existing.name}" was deleted.`,
      entityType: 'folder',
      entityId: existing.id
    })
    res.json({ success: true, data: { movedSurveys } })
  } catch (e) { next(e) }
})

export default router
