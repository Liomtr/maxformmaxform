import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired, requireRole } from '../middlewares/auth.js'
import {
  createManagedDept,
  deleteManagedDept,
  getManagedDeptTree,
  listManagedDepts,
  updateManagedDept
} from '../services/deptService.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (_req, res) => {
  const list = await listManagedDepts()
  res.json({ success: true, data: list })
}))

router.get('/tree', asyncRoute(async (_req, res) => {
  const tree = await getManagedDeptTree()
  res.json({ success: true, data: tree })
}))

router.post('/', requireRole('admin'), asyncRoute(async (req, res) => {
  const dept = await createManagedDept({ actor: req.user, body: req.body })
  res.json({ success: true, data: dept })
}))

router.put('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const dept = await updateManagedDept({ actor: req.user, deptId: req.params.id, body: req.body })
  res.json({ success: true, data: dept })
}))

router.delete('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const result = await deleteManagedDept({ actor: req.user, deptId: req.params.id })
  res.json({ success: true, data: result })
}))

export default router
