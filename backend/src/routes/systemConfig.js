import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired } from '../middlewares/auth.js'
import {
  getManagedSystemConfig,
  testManagedSystemConfigConnection,
  updateManagedSystemConfig
} from '../services/systemConfigService.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const data = await getManagedSystemConfig({ actor: req.user })
  res.json({ success: true, data })
}))

router.put('/', asyncRoute(async (req, res) => {
  const data = await updateManagedSystemConfig({ actor: req.user, body: req.body })
  res.json({ success: true, data })
}))

router.post('/test', asyncRoute(async (req, res) => {
  const data = await testManagedSystemConfigConnection({ actor: req.user, body: req.body })
  res.json({ success: true, data })
}))

export default router
