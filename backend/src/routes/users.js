import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired, requireRole } from '../middlewares/auth.js'
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUser,
  importManagedUsers,
  listManagedUsers,
  resetManagedUserPassword,
  updateManagedUser
} from '../services/userService.js'

const router = Router()

router.use(authRequired, requireRole('admin'))

router.get('/', asyncRoute(async (req, res) => {
  const result = await listManagedUsers({ actor: req.user, query: req.query })
  res.json({ success: true, data: result })
}))

router.get('/:id', asyncRoute(async (req, res) => {
  const user = await getManagedUser({ actor: req.user, identity: req.params.id })
  res.json({ success: true, data: user })
}))

router.post('/', asyncRoute(async (req, res) => {
  const user = await createManagedUser({ actor: req.user, body: req.body })
  res.json({ success: true, data: user })
}))

router.post('/import', asyncRoute(async (req, res) => {
  const result = await importManagedUsers({ actor: req.user, body: req.body })
  res.json({ success: true, data: result })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const user = await updateManagedUser({ actor: req.user, userId: req.params.id, body: req.body })
  res.json({ success: true, data: user })
}))

router.put('/:id/password', asyncRoute(async (req, res) => {
  await resetManagedUserPassword({ actor: req.user, userId: req.params.id, body: req.body })
  res.json({ success: true })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  await deleteManagedUser({ actor: req.user, userId: req.params.id })
  res.json({ success: true })
}))

export default router
