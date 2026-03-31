import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedFlow,
  deleteManagedFlow,
  listManagedFlows,
  updateManagedFlow
} from '../services/flowService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedFlows({ actor: req.user })
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const flow = await createManagedFlow({ actor: req.user, body: req.body })
  res.json({ success: true, data: flow })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const flowId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const flow = await updateManagedFlow({ actor: req.user, flowId, body: req.body })
  res.json({ success: true, data: flow })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const flowId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await deleteManagedFlow({ actor: req.user, flowId })
  res.json({ success: true })
}))

export default router
