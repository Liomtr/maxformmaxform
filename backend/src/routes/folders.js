import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedFolder,
  deleteManagedFolder,
  listAllManagedFolders,
  listManagedFolders,
  updateManagedFolder
} from '../services/folderService.js'

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
  const folder = await updateManagedFolder({ actor: req.user, folderId: req.params.id, body: req.body })
  res.json({ success: true, data: folder })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const result = await deleteManagedFolder({ actor: req.user, folderId: req.params.id })
  res.json({ success: true, data: result })
}))

export default router
