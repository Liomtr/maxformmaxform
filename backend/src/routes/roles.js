import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedRole,
  deleteManagedRole,
  listManagedRoles,
  updateManagedRole
} from '../services/roleService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedRoles({ actor: req.user })
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const role = await createManagedRole({ actor: req.user, body: req.body })
  res.json({ success: true, data: role })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const roleId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const role = await updateManagedRole({ actor: req.user, roleId, body: req.body })
  res.json({ success: true, data: role })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const roleId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await deleteManagedRole({ actor: req.user, roleId })
  res.json({ success: true })
}))

export default router
