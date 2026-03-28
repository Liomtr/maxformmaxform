import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired } from '../middlewares/auth.js'
import { listActorMessages, markActorMessageRead } from '../services/messageService.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listActorMessages({ actor: req.user, query: req.query })
  res.json({ success: true, data: list })
}))

router.post('/:id/read', asyncRoute(async (req, res) => {
  const message = await markActorMessageRead({ actor: req.user, messageId: req.params.id })
  res.json({ success: true, data: message })
}))

export default router
