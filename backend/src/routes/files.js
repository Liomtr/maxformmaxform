import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired } from '../middlewares/auth.js'
import {
  deleteManagedFile,
  uploadManagedFile,
  uploadManagedImage
} from '../services/fileCommandService.js'
import { listManagedFiles } from '../services/fileQueryService.js'
import { upload } from '../utils/uploadStorage.js'

const router = Router()

router.get('/', authRequired, asyncRoute(async (req, res) => {
  const result = await listManagedFiles({ actor: req.user, query: req.query })
  res.json({ success: true, data: result })
}))

router.post('/upload', authRequired, upload.single('file'), asyncRoute(async (req, res) => {
  const saved = await uploadManagedFile({ actor: req.user, file: req.file })
  res.json({ success: true, data: saved })
}))

router.post('/upload/image', authRequired, upload.single('file'), asyncRoute(async (req, res) => {
  const saved = await uploadManagedImage({ actor: req.user, file: req.file })
  res.json({ success: true, data: saved })
}))

router.delete('/:id', authRequired, asyncRoute(async (req, res) => {
  await deleteManagedFile({ actor: req.user, fileId: req.params.id })
  res.json({ success: true })
}))

export default router
