import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import FileModel from '../models/File.js'
import { authRequired } from '../middlewares/auth.js'
import { UPLOAD_DIR, buildUploadedFileUrl, upload } from '../utils/uploadStorage.js'

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const router = Router()

function isAdmin(user) {
  return user?.roleCode === 'admin'
}

function canManageFile(user, file) {
  return isAdmin(user) || Number(user?.sub) === Number(file?.uploader_id)
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, uploader_id } = req.query
    const result = await FileModel.list({
      page: Number(page),
      pageSize: Number(pageSize),
      uploader_id: isAdmin(req.user)
        ? (uploader_id !== undefined ? Number(uploader_id) : undefined)
        : req.user.sub
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

router.post('/upload', authRequired, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '缺少文件' } })
    }
    const url = buildUploadedFileUrl(req.file)
    const saved = await FileModel.create({
      name: req.file.originalname || req.file.filename,
      url,
      size: req.file.size,
      type: req.file.mimetype,
      uploader_id: req.user.sub
    })
    res.json({ success: true, data: saved })
  } catch (e) { next(e) }
})

router.post('/upload/image', authRequired, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '缺少文件' } })
    }
    const url = buildUploadedFileUrl(req.file)
    const saved = await FileModel.create({
      name: req.file.originalname || req.file.filename,
      url,
      size: req.file.size,
      type: req.file.mimetype,
      uploader_id: req.user.sub
    })
    res.json({ success: true, data: { id: saved.id, url, filename: saved.name } })
  } catch (e) { next(e) }
})

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const file = await FileModel.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '文件不存在' } })
    }
    if (!canManageFile(req.user, file)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权删除该文件' } })
    }

    const filePath = path.join(UPLOAD_DIR, path.basename(file.url))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await FileModel.delete(req.params.id)
    res.json({ success: true })
  } catch (e) { next(e) }
})

export default router
