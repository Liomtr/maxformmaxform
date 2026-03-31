import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedPosition,
  deleteManagedPosition,
  listManagedPositions,
  updateManagedPosition
} from '../services/positionService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedPositions({ actor: req.user })
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const position = await createManagedPosition({ actor: req.user, body: req.body })
  res.json({ success: true, data: position })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const positionId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const position = await updateManagedPosition({ actor: req.user, positionId, body: req.body })
  res.json({ success: true, data: position })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const positionId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await deleteManagedPosition({ actor: req.user, positionId })
  res.json({ success: true })
}))

export default router
