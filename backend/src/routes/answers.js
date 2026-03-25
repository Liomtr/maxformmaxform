import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import ExcelJS from 'exceljs'
import Answer from '../models/Answer.js'
import Survey from '../models/Survey.js'
import FileModel from '../models/File.js'
import { authRequired } from '../middlewares/auth.js'
import { UPLOAD_DIR } from '../utils/uploadStorage.js'

const router = Router()

function isAdmin(user) {
  return user?.roleCode === 'admin'
}

function canManageSurvey(user, survey) {
  return isAdmin(user) || Number(user?.sub) === Number(survey?.creator_id)
}

async function loadManagedSurvey(req, res, surveyId) {
  const survey = await Survey.findById(surveyId)
  if (!survey) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    return null
  }
  if (!canManageSurvey(req.user, survey)) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '无权访问该问卷答卷' } })
    return null
  }
  return survey
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { survey_id, page = 1, pageSize = 20, startTime, endTime } = req.query
    if (!survey_id && !isAdmin(req.user)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '缺少 survey_id' } })
    }
    if (survey_id) {
      const survey = await loadManagedSurvey(req, res, survey_id)
      if (!survey) return
    }

    const result = await Answer.list({
      survey_id,
      page: Number(page),
      pageSize: Number(pageSize),
      startTime,
      endTime
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

router.get('/count', authRequired, async (req, res, next) => {
  try {
    const { survey_id } = req.query
    if (!survey_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '缺少 survey_id' } })
    }
    const survey = await loadManagedSurvey(req, res, survey_id)
    if (!survey) return

    const count = await Answer.count(survey.id)
    res.json({ success: true, data: { count } })
  } catch (e) { next(e) }
})

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id)
    if (!answer) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '答卷不存在' } })
    }

    const survey = await loadManagedSurvey(req, res, answer.survey_id)
    if (!survey) return

    res.json({ success: true, data: answer })
  } catch (e) { next(e) }
})

router.delete('/batch', authRequired, async (req, res, next) => {
  try {
    const { ids = [] } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '缺少要删除的 ID 列表' } })
    }

    const answers = await Promise.all(ids.map(id => Answer.findById(id)))
    const existingAnswers = answers.filter(Boolean)
    if (existingAnswers.length === 0) {
      return res.json({ success: true, data: { deleted: 0 } })
    }

    const surveyIds = [...new Set(existingAnswers.map(item => item.survey_id))]
    for (const surveyId of surveyIds) {
      const survey = await loadManagedSurvey(req, res, surveyId)
      if (!survey) return
    }

    const deleted = await Answer.deleteBatch(existingAnswers.map(item => item.id))
    res.json({ success: true, data: { deleted } })
  } catch (e) { next(e) }
})

router.post('/download/survey', authRequired, async (req, res, next) => {
  try {
    const { survey_id } = req.body || {}
    if (!survey_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '缺少 survey_id' } })
    }

    const survey = await loadManagedSurvey(req, res, survey_id)
    if (!survey) return

    const answers = await Answer.findBySurveyId(survey.id)
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('答卷数据')

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '提交时间', key: 'submitted_at', width: 20 },
      { header: 'IP', key: 'ip_address', width: 16 },
      { header: '耗时(秒)', key: 'duration', width: 10 },
      { header: '状态', key: 'status', width: 12 },
      { header: '答题数据', key: 'answers_data', width: 60 }
    ]
    for (const a of answers) {
      sheet.addRow({
        ...a,
        answers_data: JSON.stringify(a.answers_data)
      })
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="survey-${survey.id}.xlsx"`)
    const buffer = await workbook.xlsx.writeBuffer()
    res.send(buffer)
  } catch (e) { next(e) }
})

router.post('/download/attachments', authRequired, async (req, res, next) => {
  try {
    const { survey_id } = req.body || {}
    if (!survey_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '缺少 survey_id' } })
    }

    const survey = await loadManagedSurvey(req, res, survey_id)
    if (!survey) return

    const files = await FileModel.listAnswerFilesBySurveyId(survey.id)
    const existingFiles = files
      .map(file => {
        const filename = path.basename(String(file?.url || ''))
        const filePath = path.join(UPLOAD_DIR, filename)
        return {
          ...file,
          filePath
        }
      })
      .filter(file => file.answer_id && file.url && fs.existsSync(file.filePath))

    if (existingFiles.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NO_FILES', message: '当前问卷没有可打包下载的附件' } })
    }

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="survey-${survey.id}-attachments.zip"`)

    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', err => {
      if (!res.headersSent) {
        next(err)
        return
      }
      res.destroy(err)
    })

    archive.pipe(res)

    for (const file of existingFiles) {
      const safeName = String(file.name || path.basename(file.filePath))
        .replace(/[\\/:*?"<>|]/g, '_')
      archive.file(file.filePath, {
        name: `answer-${file.answer_id}/${file.id}-${safeName}`
      })
    }

    await archive.finalize()
  } catch (e) { next(e) }
})

export default router
