import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUser,
  importManagedUsers,
  listManagedUsers,
  resetManagedUserPassword,
  updateManagedUser
} from '../services/userService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()

router.use(authRequired)

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
  const userId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const user = await updateManagedUser({ actor: req.user, userId, body: req.body })
  res.json({ success: true, data: user })
}))

router.put('/:id/password', asyncRoute(async (req, res) => {
  const userId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await resetManagedUserPassword({ actor: req.user, userId, body: req.body })
  res.json({ success: true })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const userId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await deleteManagedUser({ actor: req.user, userId })
  res.json({ success: true })
}))

export default router
