import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import config from './src/config/index.js'
import { errorHandler, notFound } from './src/middlewares/errorHandler.js'

import authRoutes from './src/routes/auth.js'
import surveyRoutes from './src/routes/surveys.js'
import answerRoutes from './src/routes/answers.js'
import userRoutes from './src/routes/users.js'
import fileRoutes from './src/routes/files.js'
import deptRoutes from './src/routes/depts.js'
import roleRoutes from './src/routes/roles.js'
import folderRoutes from './src/routes/folders.js'
import messageRoutes from './src/routes/messages.js'
import auditRoutes from './src/routes/audits.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// --- Security ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }))

// --- Body parsing ---
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// --- Static: uploaded files ---
const UPLOAD_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR))

// --- Routes ---
app.use('/api/auth', authRoutes)
app.use('/api/surveys', surveyRoutes)
app.use('/api/answers', answerRoutes)
app.use('/api/users', userRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/depts', deptRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api/messages', messageRoutes)
app.get('/api/positions', (_req, res) => res.json({ success: true, data: [] }))
app.use('/api/audits', auditRoutes)

// --- Health check ---
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() })
})

// --- Error handling ---
app.use(notFound)
app.use(errorHandler)

export default app
