import { Router } from 'express'
import Message from '../models/Message.js'
import { authRequired } from '../middlewares/auth.js'

const router = Router()

router.use(authRequired)

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50, unread, types } = req.query
    const list = await Message.list({
      recipient_id: req.user.sub,
      page: Number(page),
      pageSize: Number(pageSize),
      unread: unread === undefined ? undefined : unread === 'true' || unread === '1',
      types: typeof types === 'string'
        ? types.split(',').map(item => item.trim()).filter(Boolean)
        : undefined
    })
    res.json({ success: true, data: list })
  } catch (e) { next(e) }
})

router.post('/:id/read', async (req, res, next) => {
  try {
    const message = await Message.markRead(req.params.id, req.user.sub)
    if (!message) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found' } })
    }
    res.json({ success: true, data: message })
  } catch (e) { next(e) }
})

export default router
