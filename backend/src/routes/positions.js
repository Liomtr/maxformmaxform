import { Router } from 'express'
import Position from '../models/Position.js'
import { authRequired, requireRole } from '../middlewares/auth.js'

const router = Router()

router.use(authRequired)

router.get('/', async (_req, res, next) => {
  try {
    const list = await Position.list()
    res.json({ success: true, data: list })
  } catch (e) { next(e) }
})

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, code, is_virtual, isVirtual, remark } = req.body || {}
    const normalizedName = String(name || '').trim()
    const normalizedCode = String(code || '').trim() || null
    if (!normalizedName) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Position name is required' } })
    }
    if (normalizedCode) {
      const existing = await Position.findByCode(normalizedCode)
      if (existing) {
        return res.status(409).json({ success: false, error: { code: 'POSITION_EXISTS', message: 'Position code already exists' } })
      }
    }

    const position = await Position.create({
      name: normalizedName,
      code: normalizedCode,
      is_virtual: Boolean(is_virtual ?? isVirtual),
      remark: remark == null ? null : String(remark)
    })
    res.json({ success: true, data: position })
  } catch (e) { next(e) }
})

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const existing = await Position.findById(req.params.id)
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Position not found' } })
    }

    const { name, code, is_virtual, isVirtual, remark } = req.body || {}
    const normalizedCode = code === undefined ? undefined : (String(code || '').trim() || null)
    if (normalizedCode) {
      const duplicate = await Position.findByCode(normalizedCode)
      if (duplicate && Number(duplicate.id) !== Number(existing.id)) {
        return res.status(409).json({ success: false, error: { code: 'POSITION_EXISTS', message: 'Position code already exists' } })
      }
    }

    const position = await Position.update(req.params.id, {
      name: name === undefined ? undefined : String(name || '').trim(),
      code: normalizedCode,
      is_virtual: is_virtual === undefined && isVirtual === undefined
        ? undefined
        : Boolean(is_virtual ?? isVirtual),
      remark: remark === undefined ? undefined : (remark == null ? null : String(remark))
    })

    res.json({ success: true, data: position })
  } catch (e) { next(e) }
})

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const existing = await Position.findById(req.params.id)
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Position not found' } })
    }
    await Position.delete(req.params.id)
    res.json({ success: true })
  } catch (e) { next(e) }
})

export default router
