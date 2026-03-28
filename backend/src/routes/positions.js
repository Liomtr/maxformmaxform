import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired, requireRole } from '../middlewares/auth.js'
import {
  createManagedPosition,
  deleteManagedPosition,
  listManagedPositions,
  updateManagedPosition
} from '../services/positionService.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (_req, res) => {
  const list = await listManagedPositions()
  res.json({ success: true, data: list })
}))

router.post('/', requireRole('admin'), asyncRoute(async (req, res) => {
  const position = await createManagedPosition({ actor: req.user, body: req.body })
  res.json({ success: true, data: position })
}))

router.put('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const position = await updateManagedPosition({ actor: req.user, positionId: req.params.id, body: req.body })
  res.json({ success: true, data: position })
}))

router.delete('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  await deleteManagedPosition({ actor: req.user, positionId: req.params.id })
  res.json({ success: true })
}))

export default router
