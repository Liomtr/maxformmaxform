import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { listManagedAudits } from '../services/auditService.js'

const router = Router()

router.use(authRequired, requireRole('admin'))

router.get('/', asyncRoute(async (req, res) => {
  const result = await listManagedAudits({ actor: req.user, query: req.query })
  res.json({ success: true, data: result })
}))

export default router
