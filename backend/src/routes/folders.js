import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedFolder,
  deleteManagedFolder,
  listAllManagedFolders,
  listManagedFolders,
  updateManagedFolder
} from '../services/folderService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedFolders({ actor: req.user, query: req.query })
  res.json({ success: true, data: list })
}))

router.get('/all', asyncRoute(async (req, res) => {
  const list = await listAllManagedFolders({ actor: req.user })
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const folder = await createManagedFolder({ actor: req.user, body: req.body })
  res.json({ success: true, data: folder })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const folderId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const folder = await updateManagedFolder({ actor: req.user, folderId, body: req.body })
  res.json({ success: true, data: folder })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const folderId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const result = await deleteManagedFolder({ actor: req.user, folderId })
  res.json({ success: true, data: result })
}))

export default router
