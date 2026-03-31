import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedDept,
  deleteManagedDept,
  getManagedDeptTree,
  listManagedDepts,
  updateManagedDept
} from '../services/deptService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedDepts({ actor: req.user })
  res.json({ success: true, data: list })
}))

router.get('/tree', asyncRoute(async (req, res) => {
  const tree = await getManagedDeptTree({ actor: req.user })
  res.json({ success: true, data: tree })
}))

router.post('/', asyncRoute(async (req, res) => {
  const dept = await createManagedDept({ actor: req.user, body: req.body })
  res.json({ success: true, data: dept })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const deptId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const dept = await updateManagedDept({ actor: req.user, deptId, body: req.body })
  res.json({ success: true, data: dept })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const deptId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const result = await deleteManagedDept({ actor: req.user, deptId })
  res.json({ success: true, data: result })
}))

export default router
