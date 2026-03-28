import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired, requireRole } from '../middlewares/auth.js'
import {
  createManagedRole,
  deleteManagedRole,
  listManagedRoles,
  updateManagedRole
} from '../services/roleService.js'

const router = Router()

router.use(authRequired, requireRole('admin'))

router.get('/', asyncRoute(async (_req, res) => {
  const list = await listManagedRoles()
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const role = await createManagedRole({ actor: req.user, body: req.body })
  res.json({ success: true, data: role })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const role = await updateManagedRole({ actor: req.user, roleId: req.params.id, body: req.body })
  res.json({ success: true, data: role })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  await deleteManagedRole({ actor: req.user, roleId: req.params.id })
  res.json({ success: true })
}))

export default router
