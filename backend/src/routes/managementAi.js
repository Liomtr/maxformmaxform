import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { sendDownloadBuffer } from '../http/downloadResponse.js'
import { authRequiredStrict } from '../middlewares/auth.js'
import {
  exportManagementAiExecutions,
  getManagementAiProtocol,
  listManagementAiExecutions,
  runManagementAiAction
} from '../services/managementAiService.js'

const router = Router()

router.use(authRequiredStrict)

router.get('/protocol', asyncRoute(async (req, res) => {
  const protocol = await getManagementAiProtocol({ actor: req.user })
  res.json({ success: true, data: protocol })
}))

router.get('/executions', asyncRoute(async (req, res) => {
  const result = await listManagementAiExecutions({ actor: req.user, query: req.query })
  res.json({ success: true, data: result })
}))

router.get('/executions/export', asyncRoute(async (req, res) => {
  const file = await exportManagementAiExecutions({ actor: req.user, query: req.query })
  sendDownloadBuffer(res, file)
}))

router.post('/actions', asyncRoute(async (req, res) => {
  const result = await runManagementAiAction({ actor: req.user, body: req.body })
  res.json({ success: true, data: result })
}))

export default router
