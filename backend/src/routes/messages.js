import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import { listActorMessages, markActorMessageRead } from '../services/messageService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listActorMessages({ actor: req.user, query: req.query })
  res.json({ success: true, data: list })
}))

router.post('/:id/read', asyncRoute(async (req, res) => {
  const messageId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const message = await markActorMessageRead({ actor: req.user, messageId })
  res.json({ success: true, data: message })
}))

export default router
