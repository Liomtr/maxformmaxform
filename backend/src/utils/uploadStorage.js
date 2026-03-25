import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import config from '../config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const UPLOAD_DIR = path.join(__dirname, '../../uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '')
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
  }
})

export const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'))
    }
  }
})

export function buildUploadedFileUrl(file) {
  return `/uploads/${file.filename}`
}

export function removeUploadedFile(fileOrUrl) {
  const filename = typeof fileOrUrl === 'string'
    ? path.basename(fileOrUrl)
    : path.basename(String(fileOrUrl?.path || fileOrUrl?.filename || fileOrUrl?.url || ''))

  if (!filename) return

  const targetPath = path.join(UPLOAD_DIR, filename)
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath)
  }
}
