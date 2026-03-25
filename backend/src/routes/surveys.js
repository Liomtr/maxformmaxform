import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { randomBytes } from 'crypto'
import Survey from '../models/Survey.js'
import Answer from '../models/Answer.js'
import User from '../models/User.js'
import Folder from '../models/Folder.js'
import FileModel from '../models/File.js'
import { authRequired, optionalAuth } from '../middlewares/auth.js'
import { createAuditMessage, createSystemMessage, recordAudit } from '../services/activity.js'
import {
  normalizeSurveyQuestions,
  normalizeUploadQuestionConfig,
  validateUploadFilesAgainstQuestion,
  validateSubmissionAnswers,
  validateSurveyQuestions
} from '../utils/questionSchema.js'
import { buildUploadedFileUrl, removeUploadedFile, upload } from '../utils/uploadStorage.js'
import config from '../config/index.js'
import { getQuestionRenderType } from '../../../shared/questionTypeRegistry.js'

const router = Router()
const publicUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
})

function isAdmin(user) {
  return user?.roleCode === 'admin'
}

function isOwner(user, survey) {
  return !!user && Number(user.sub) === Number(survey.creator_id)
}

function canManageSurvey(user, survey) {
  return isAdmin(user) || isOwner(user, survey)
}

function getSurveyEndTime(survey) {
  const raw = survey?.settings?.endTime
  if (!raw) return null

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function buildSurveyAccessMeta(survey) {
  const endTime = getSurveyEndTime(survey)
  const expired = !!endTime && endTime.getTime() <= Date.now()
  return {
    title: survey.title,
    status: expired ? 'expired' : survey.status,
    closedAt: endTime ? endTime.toISOString() : null
  }
}

function isSurveyExpired(survey) {
  const endTime = getSurveyEndTime(survey)
  return !!endTime && endTime.getTime() <= Date.now()
}

async function loadSurveyOrThrow(identifier, options = {}) {
  const survey = await Survey.findByIdentifier(identifier, options)
  if (!survey) {
    throw Object.assign(new Error('Survey not found'), { status: 404, code: 'NOT_FOUND' })
  }
  return survey
}

function requireSurveyManager(req, res, survey) {
  if (canManageSurvey(req.user, survey)) return true

  res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'You do not have permission to manage this survey' }
  })
  return false
}

function requireSurveyPublicAccess(req, res, survey) {
  if (survey.status !== 'published' && !canManageSurvey(req.user, survey)) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Survey is not published or access is forbidden' },
      data: buildSurveyAccessMeta(survey)
    })
    return false
  }

  if (isSurveyExpired(survey) && !canManageSurvey(req.user, survey)) {
    res.status(403).json({
      success: false,
      error: { code: 'SURVEY_EXPIRED', message: 'Survey has expired' },
      data: buildSurveyAccessMeta(survey)
    })
    return false
  }

  return true
}

function normalizeUploadAnswerRefs(value) {
  const list = Array.isArray(value)
    ? value
    : (value == null || value === '' ? [] : [value])

  return list.map(item => {
    if (item && typeof item === 'object') {
      return {
        id: Number(item.id ?? item.fileId),
        token: String(item.uploadToken ?? item.publicToken ?? item.token ?? '').trim()
      }
    }

    return {
      id: Number(item),
      token: ''
    }
  })
}

async function cleanupPendingUploadRecords(files = []) {
  if (!Array.isArray(files) || files.length === 0) return
  files.forEach(file => removeUploadedFile(file?.url || file))
  await FileModel.deleteByIds(files.map(file => Number(file.id)).filter(id => Number.isFinite(id) && id > 0))
}

async function cleanupExpiredPendingUploads() {
  const ttlHours = Math.max(1, Number(config.upload.pendingTtlHours || 24))
  const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000)
  const expired = await FileModel.listExpiredPending(cutoff)
  await cleanupPendingUploadRecords(expired)
}

async function cleanupPendingUploadsForSubmission(surveyId, submissionToken) {
  if (!submissionToken) return
  const pending = await FileModel.listPendingBySubmission(surveyId, submissionToken)
  await cleanupPendingUploadRecords(pending)
}

async function resolveUploadAnswers(survey, normalizedAnswers, submissionToken) {
  const questions = normalizeSurveyQuestions(survey?.questions || [])
  const uploadAnswers = normalizedAnswers.filter(answer => answer.questionType === 'upload')
  if (uploadAnswers.length === 0) {
    return { normalizedAnswers, error: null }
  }

  if (!submissionToken) {
    return { normalizedAnswers: [], error: 'Upload answers must include a valid submission token' }
  }

  const allRefs = uploadAnswers.flatMap(answer => normalizeUploadAnswerRefs(answer.value))
  const invalidRef = allRefs.find(ref => !Number.isFinite(ref.id) || ref.id <= 0 || !ref.token)
  if (invalidRef) {
    return { normalizedAnswers: [], error: 'Upload answers must include a valid file id and upload token' }
  }

  const files = await FileModel.findByIds(allRefs.map(ref => ref.id), { survey_id: survey.id })
  const byId = new Map(files.map(file => [Number(file.id), file]))

  const nextAnswers = normalizedAnswers.map(answer => {
    if (answer.questionType !== 'upload') return answer

    const question = questions[Number(answer.questionId) - 1]
    const refs = normalizeUploadAnswerRefs(answer.value)
    const resolved = refs.map(ref => {
      const file = byId.get(ref.id)
      if (!file || String(file.public_token || '') !== ref.token) {
        return null
      }
      if (String(file.submission_token || '') !== String(submissionToken)) {
        return null
      }
      if (file.question_order != null && Number(file.question_order) !== Number(answer.questionId)) {
        return null
      }
      return {
        id: Number(file.id),
        name: file.name,
        url: file.url,
        size: Number(file.size || 0),
        type: file.type || ''
      }
    })

    if (resolved.some(item => item == null)) {
      return null
    }

    const uploadError = validateUploadFilesAgainstQuestion(question, resolved, { enforceCount: true })
    if (uploadError) {
      return { __error: `Question ${answer.questionId} ${uploadError}` }
    }

    return {
      ...answer,
      value: resolved
    }
  })

  if (nextAnswers.some(answer => answer == null)) {
    return { normalizedAnswers: [], error: 'One or more uploaded files are invalid for this survey' }
  }

  const erroredAnswer = nextAnswers.find(answer => answer?.__error)
  if (erroredAnswer) {
    return { normalizedAnswers: [], error: erroredAnswer.__error }
  }

  return { normalizedAnswers: nextAnswers, error: null }
}

async function resolveRequestedCreatorId(req) {
  const { creator_id, createdBy } = req.query
  if (!isAdmin(req.user)) return req.user.sub
  if (creator_id !== undefined) return Number(creator_id)
  if (createdBy) {
    const user = await User.findByUsername(String(createdBy))
    return user ? user.id : -1
  }
  return undefined
}

function surveySupportsPublicUpload(survey) {
  return normalizeSurveyQuestions(survey?.questions || []).some(question => question.type === 'upload')
}

function getUploadQuestionByQuestionId(survey, questionId) {
  const numericQuestionId = Number(questionId)
  if (!Number.isFinite(numericQuestionId) || numericQuestionId < 1) return null
  const questions = normalizeSurveyQuestions(survey?.questions || [])
  const question = questions[numericQuestionId - 1]
  return question?.type === 'upload' ? question : null
}

function isAnsweredValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function toFiniteNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toRoundedAverage(values, digits = 2) {
  if (!Array.isArray(values) || values.length === 0) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return Number((total / values.length).toFixed(digits))
}

function buildNumericDistribution(values) {
  if (!Array.isArray(values) || values.length === 0) return {}

  const counts = new Map()
  values.forEach(value => {
    const key = Number(value)
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  const total = values.length
  return Object.fromEntries(
    Array.from(counts.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([score, count]) => [String(score), Number(((count / total) * 100).toFixed(2))])
  )
}

function formatDuration(seconds) {
  const numeric = toFiniteNumber(seconds)
  if (numeric == null) return null

  const rounded = Math.max(0, Math.round(numeric))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const secs = rounded % 60

  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

function buildQuestionStats(survey, submissions) {
  const questions = normalizeSurveyQuestions(survey?.questions || [])
  const answersByQuestionId = new Map()

  for (const submission of submissions) {
    const items = Array.isArray(submission?.answers_data) ? submission.answers_data : []
    for (const item of items) {
      const questionId = Number(item?.questionId)
      if (!Number.isFinite(questionId) || questionId < 1) continue
      if (!answersByQuestionId.has(questionId)) answersByQuestionId.set(questionId, [])
      answersByQuestionId.get(questionId).push(item)
    }
  }

  return questions.flatMap((question, index) => {
    if (getQuestionRenderType(question) === 'stage_explain') return []

    const questionId = index + 1
    const answerItems = answersByQuestionId.get(questionId) || []
    const answeredItems = answerItems.filter(item => isAnsweredValue(item?.value))
    const base = {
      questionId,
      questionTitle: String(question?.title || `Question ${questionId}`),
      type: String(question?.type || 'input'),
      totalAnswers: answeredItems.length
    }

    if (question.type === 'radio' || question.type === 'checkbox') {
      const options = Array.isArray(question.options) ? question.options : []
      const answeredCount = answeredItems.length
      return [{
        ...base,
        options: options.map(option => {
          const count = answeredItems.reduce((sum, item) => {
            const value = item?.value
            if (question.type === 'checkbox') {
              return sum + (Array.isArray(value) && value.map(String).includes(String(option.value)) ? 1 : 0)
            }
            return sum + (String(value) === String(option.value) ? 1 : 0)
          }, 0)

          return {
            label: String(option.label || option.value || ''),
            value: String(option.value || ''),
            count,
            percentage: answeredCount > 0 ? Number(((count / answeredCount) * 100).toFixed(2)) : 0
          }
        })
      }]
    }

    if (question.type === 'input' || question.type === 'textarea') {
      const values = answeredItems
        .map(item => String(item.value).trim())
        .filter(Boolean)

      return [{
        ...base,
        sampleAnswers: Array.from(new Set(values)).slice(0, 5)
      }]
    }

    if (question.type === 'slider') {
      const values = answeredItems
        .map(item => toFiniteNumber(item.value))
        .filter(value => value != null)

      return [{
        ...base,
        avgValue: toRoundedAverage(values),
        minValue: values.length > 0 ? Math.min(...values) : null,
        maxValue: values.length > 0 ? Math.max(...values) : null
      }]
    }

    if (question.type === 'rating' || question.type === 'scale') {
      const values = answeredItems
        .map(item => toFiniteNumber(item.value))
        .filter(value => value != null)

      return [{
        ...base,
        avgScore: toRoundedAverage(values),
        distribution: buildNumericDistribution(values)
      }]
    }

    if (question.type === 'matrix') {
      const options = Array.isArray(question.options) ? question.options : []
      const rows = Array.isArray(question?.matrix?.rows) ? question.matrix.rows : []

      return [{
        ...base,
        matrixMode: question?.matrix?.selectionType || 'single',
        rows: rows.map(row => {
          const rowValue = String(row?.value || '')
          const rowAnsweredItems = answeredItems.filter(item => {
            const answer = item?.value
            return answer && typeof answer === 'object' && !Array.isArray(answer) && answer[rowValue] != null && String(answer[rowValue]).trim() !== ''
          })

          return {
            label: String(row?.label || rowValue),
            value: rowValue,
            totalAnswers: rowAnsweredItems.length,
            options: options.map(option => {
              const count = rowAnsweredItems.reduce((sum, item) => {
                return sum + (String(item.value?.[rowValue]) === String(option.value) ? 1 : 0)
              }, 0)

              return {
                label: String(option.label || option.value || ''),
                value: String(option.value || ''),
                count,
                percentage: rowAnsweredItems.length > 0 ? Number(((count / rowAnsweredItems.length) * 100).toFixed(2)) : 0
              }
            })
          }
        })
      }]
    }

    if (question.type === 'ranking') {
      const options = Array.isArray(question.options) ? question.options : []
      const answeredCount = answeredItems.length
      return [{
        ...base,
        options: options.map(option => {
          const positions = answeredItems.flatMap(item => {
            const value = Array.isArray(item?.value) ? item.value.map(String) : []
            const indexInAnswer = value.indexOf(String(option.value))
            return indexInAnswer >= 0 ? [indexInAnswer + 1] : []
          })

          const count = positions.length
          return {
            label: String(option.label || option.value || ''),
            value: String(option.value || ''),
            count,
            percentage: answeredCount > 0 ? Number(((count / answeredCount) * 100).toFixed(2)) : 0,
            avgRank: toRoundedAverage(positions)
          }
        })
      }]
    }

    if (question.type === 'upload') {
      const fileLists = answeredItems
        .map(item => Array.isArray(item?.value) ? item.value : [])
        .filter(list => list.length > 0)
      const files = fileLists.flat()

      return [{
        ...base,
        totalFiles: files.length,
        sampleFiles: files.slice(0, 5).map(file => ({
          id: Number(file?.id || 0),
          name: String(file?.name || ''),
          url: String(file?.url || ''),
          type: String(file?.type || ''),
          size: Number(file?.size || 0)
        }))
      }]
    }

    if (question.type === 'date') {
      const values = answeredItems
        .map(item => String(item.value || '').trim())
        .filter(Boolean)
        .sort()

      return [{
        ...base,
        sampleAnswers: Array.from(new Set(values)).slice(0, 5),
        earliestDate: values[0] || null,
        latestDate: values[values.length - 1] || null
      }]
    }

    return [base]
  })
}

function buildResultsSummary(submissions) {
  const totalSubmissions = submissions.length
  const completed = submissions.filter(item => item?.status !== 'incomplete').length
  const incomplete = Math.max(0, totalSubmissions - completed)
  const completionRate = totalSubmissions > 0
    ? Number(((completed / totalSubmissions) * 100).toFixed(1))
    : 0

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const today = submissions.filter(item => {
    const submittedAt = new Date(item?.submitted_at || 0)
    return !Number.isNaN(submittedAt.getTime()) && submittedAt >= todayStart
  }).length

  const durationValues = submissions
    .map(item => toFiniteNumber(item?.duration))
    .filter(value => value != null)
  const avgDurationSeconds = toRoundedAverage(durationValues)

  return {
    totalSubmissions,
    total: totalSubmissions,
    today,
    completed,
    incomplete,
    completionRate,
    avgDuration: formatDuration(avgDurationSeconds),
    avgTime: avgDurationSeconds,
    lastSubmitAt: submissions[0]?.submitted_at || null
  }
}

function buildCountList(values) {
  const counts = new Map()
  for (const value of values) {
    const key = String(value || 'Other')
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .map(([label, count]) => ({ label, value: String(count) }))
}

function detectDeviceType(userAgent) {
  const ua = String(userAgent || '')
  if (!ua) return 'Other'
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'Tablet'
  if (/iPhone|iPod|Android.*Mobile|Mobile|Windows Phone/i.test(ua)) return 'Mobile'
  if (/Windows NT|Macintosh|X11|Linux/i.test(ua)) return 'Desktop'
  if (/node|undici/i.test(ua)) return 'Script'
  return 'Other'
}

function detectBrowser(userAgent) {
  const ua = String(userAgent || '')
  if (!ua) return 'Other'
  if (/MicroMessenger/i.test(ua)) return 'WeChat'
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\//i.test(ua)) return 'Opera'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua) && /Version\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari'
  if (/node|undici/i.test(ua)) return 'Node.js'
  return 'Other'
}

function detectOperatingSystem(userAgent) {
  const ua = String(userAgent || '')
  if (!ua) return 'Other'
  if (/Windows NT/i.test(ua)) return 'Windows'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'Linux'
  if (/node|undici/i.test(ua)) return 'Server'
  return 'Other'
}

function buildSystemStats(submissions) {
  const userAgents = submissions
    .map(item => String(item?.user_agent || '').trim())
    .filter(Boolean)

  return {
    devices: buildCountList(userAgents.map(detectDeviceType)),
    browsers: buildCountList(userAgents.map(detectBrowser)),
    operatingSystems: buildCountList(userAgents.map(detectOperatingSystem))
  }
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateShort(dateKey) {
  return String(dateKey || '').slice(5)
}

function buildSubmissionTrend(submissions, days = 30) {
  const normalizedDays = Math.max(1, Number(days) || 30)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = new Map()
  for (let offset = normalizedDays - 1; offset >= 0; offset -= 1) {
    const current = new Date(today)
    current.setDate(today.getDate() - offset)
    buckets.set(formatDateKey(current), 0)
  }

  for (const submission of submissions) {
    const submittedAt = new Date(submission?.submitted_at || 0)
    if (Number.isNaN(submittedAt.getTime())) continue
    const key = formatDateKey(submittedAt)
    if (!buckets.has(key)) continue
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    label: formatDateShort(date),
    count
  }))
}

function buildRegionStats(submissions) {
  const normalized = submissions
    .map(item => {
      const province = String(
        item?.province ||
        item?.province_name ||
        item?.geo_province ||
        ''
      ).trim()
      const city = String(
        item?.city ||
        item?.city_name ||
        item?.geo_city ||
        ''
      ).trim()
      const label = province || city
        ? [province, city].filter(Boolean).join(' / ')
        : ''
      return { label, province, city }
    })

  const locatedItems = normalized.filter(item => item.label)
  const missingCount = normalized.length - locatedItems.length
  const items = buildCountList(locatedItems.map(item => item.label))

  return {
    hasLocationData: items.length > 0,
    scope: 'submission-origin',
    missingCount,
    items,
    emptyReason: items.length > 0
      ? null
      : 'No province/city source is stored for submissions yet.'
  }
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status, folder_id } = req.query
    const result = await Survey.list({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      folder_id: folder_id === undefined
        ? undefined
        : (folder_id === '' || folder_id === 'null' ? null : Number(folder_id)),
      creator_id: await resolveRequestedCreatorId(req)
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

router.get('/trash', authRequired, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 100 } = req.query
    const result = await Survey.listTrash({
      page: Number(page),
      pageSize: Number(pageSize),
      creator_id: await resolveRequestedCreatorId(req)
    })
    res.json({ success: true, data: result.list, total: result.total })
  } catch (e) { next(e) }
})

router.delete('/trash', authRequired, async (req, res, next) => {
  try {
    const creator_id = await resolveRequestedCreatorId(req)
    const ids = await Survey.listTrashIds({ creator_id })
    if (ids.length > 0) {
      await Answer.deleteBySurveyIds(ids)
    }
    const deleted = await Survey.clearTrash({ creator_id })
    await recordAudit({
      actor: req.user,
      action: 'survey.trash.clear',
      targetType: 'survey',
      targetId: null,
      detail: `Cleared trash, deleted ${deleted} surveys`
    })
    res.json({ success: true, data: { deleted } })
  } catch (e) { next(e) }
})

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { title, description, questions, settings, style } = req.body || {}
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Title is required' } })
    }
    const survey = await Survey.create({
      title,
      description,
      creator_id: req.user.sub,
      questions: normalizeSurveyQuestions(questions || []),
      settings,
      style
    })
    await recordAudit({ actor: req.user, action: 'survey.create', targetType: 'survey', targetId: survey.id, detail: `Created survey ${survey.title}` })
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.get('/share/:code', optionalAuth, async (req, res, next) => {
  try {
    const survey = await Survey.findByShareCode(req.params.code)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Survey not found' } })
    }
    if (!requireSurveyPublicAccess(req, res, survey)) return
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyPublicAccess(req, res, survey)) return
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const { title, description, questions, settings, style } = req.body || {}
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    const updated = await Survey.update(survey.id, {
      title,
      description,
      questions: questions === undefined ? undefined : normalizeSurveyQuestions(questions),
      settings,
      style
    })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    const deleted = await Survey.softDelete(survey.id, req.user.sub)
    await recordAudit({ actor: req.user, action: 'survey.trash.move', targetType: 'survey', targetId: survey.id, detail: `Moved survey ${survey.title} to trash` })
    await createAuditMessage({
      recipientId: req.user.sub,
      createdBy: req.user.sub,
      title: 'Survey moved to trash',
      content: `Survey "${survey.title}" was moved to trash.`,
      entityType: 'survey',
      entityId: survey.id
    })
    res.json({ success: true, data: deleted })
  } catch (e) { next(e) }
})

router.post('/:id/restore', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id, { includeDeleted: true })
    if (!requireSurveyManager(req, res, survey)) return
    if (!survey.deletedAt) {
      return res.status(400).json({ success: false, error: { code: 'NOT_IN_TRASH', message: 'Survey is not in trash' } })
    }

    const restored = await Survey.restore(survey.id)
    await recordAudit({ actor: req.user, action: 'survey.restore', targetType: 'survey', targetId: survey.id, detail: `Restored survey ${survey.title}` })
    res.json({ success: true, data: restored })
  } catch (e) { next(e) }
})

router.delete('/:id/force', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id, { includeDeleted: true })
    if (!requireSurveyManager(req, res, survey)) return
    if (!survey.deletedAt) {
      return res.status(400).json({ success: false, error: { code: 'NOT_IN_TRASH', message: 'Survey is not in trash' } })
    }

    await Answer.deleteBySurveyIds([survey.id])
    await Survey.delete(survey.id)
    await recordAudit({ actor: req.user, action: 'survey.force_delete', targetType: 'survey', targetId: survey.id, detail: `Force deleted survey ${survey.title}` })
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.post('/:id/publish', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    if (!survey.title || !survey.title.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Title is required' } })
    }
    const { normalizedQuestions, error } = validateSurveyQuestions(survey.questions)
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error } })
    }
    const endTime = getSurveyEndTime(survey)
    if (endTime && endTime.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End time must be later than now' } })
    }
    const updated = await Survey.update(survey.id, { status: 'published', questions: normalizedQuestions })
    await recordAudit({ actor: req.user, action: 'survey.publish', targetType: 'survey', targetId: survey.id, detail: `Published survey ${survey.title}` })
    await createAuditMessage({
      recipientId: req.user.sub,
      createdBy: req.user.sub,
      title: 'Survey published',
      content: `Survey "${survey.title}" is now live.`,
      entityType: 'survey',
      entityId: survey.id
    })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.post('/:id/close', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    const updated = await Survey.update(survey.id, { status: 'closed' })
    await recordAudit({ actor: req.user, action: 'survey.close', targetType: 'survey', targetId: survey.id, detail: `Closed survey ${survey.title}` })
    await createAuditMessage({
      recipientId: req.user.sub,
      createdBy: req.user.sub,
      title: 'Survey closed',
      content: `Survey "${survey.title}" was closed.`,
      entityType: 'survey',
      entityId: survey.id
    })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.put('/:id/folder', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    const folder_id = req.body?.folder_id === null || req.body?.folder_id === '' || req.body?.folder_id === undefined
      ? null
      : Number(req.body.folder_id)

    if (folder_id !== null) {
      const folder = await Folder.findById(folder_id, req.user.sub)
      if (!folder) {
        return res.status(404).json({ success: false, error: { code: 'FOLDER_NOT_FOUND', message: 'Folder not found' } })
      }
    }

    const updated = await Survey.update(survey.id, { folder_id })
    await recordAudit({
      actor: req.user,
      action: 'survey.move_folder',
      targetType: 'survey',
      targetId: survey.id,
      detail: folder_id === null ? `Moved survey ${survey.title} to root` : `Moved survey ${survey.title} to folder ${folder_id}`
    })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.post('/:id/uploads', optionalAuth, publicUploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyPublicAccess(req, res, survey)) return
    const requestedQuestionId = req.body?.questionId
    const submissionToken = String(req.body?.submissionToken || '').trim()
    const uploadQuestion = requestedQuestionId == null || requestedQuestionId === ''
      ? null
      : getUploadQuestionByQuestionId(survey, requestedQuestionId)

    await cleanupExpiredPendingUploads()

    if (requestedQuestionId != null && requestedQuestionId !== '' && !uploadQuestion) {
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_QUESTION_NOT_FOUND', message: 'The target upload question does not exist' }
      })
    }

    if (uploadQuestion && !submissionToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_SESSION_REQUIRED', message: 'Upload requests must include a submission token' }
      })
    }

    if (!uploadQuestion && !surveySupportsPublicUpload(survey)) {
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_NOT_ENABLED', message: 'This survey does not accept file uploads' }
      })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '缺少文件' } })
    }

    if (uploadQuestion) {
      const numericQuestionId = Number(requestedQuestionId)
      const currentCount = await FileModel.countPendingBySurveyQuestionSession(survey.id, numericQuestionId, submissionToken)
      const uploadConfig = normalizeUploadQuestionConfig(uploadQuestion)
      const uploadError = validateUploadFilesAgainstQuestion(uploadQuestion, [req.file], { enforceCount: false })
      const exceedsCount = currentCount + 1 > uploadConfig.maxFiles

      if (uploadError || exceedsCount) {
        removeUploadedFile(req.file)
        const message = exceedsCount
          ? `Question ${numericQuestionId} allows at most ${uploadConfig.maxFiles} files`
          : `Question ${Number(requestedQuestionId)} ${uploadError}`
        return res.status(400).json({ success: false, error: { code: 'UPLOAD_VALIDATION', message } })
      }
    }

    const saved = await FileModel.create({
      name: req.file.originalname || req.file.filename,
      url: buildUploadedFileUrl(req.file),
      size: req.file.size,
      type: req.file.mimetype,
      uploader_id: req.user?.sub ?? null,
      survey_id: survey.id,
      question_order: uploadQuestion ? Number(requestedQuestionId) : null,
      submission_token: submissionToken || null,
      public_token: randomBytes(24).toString('hex')
    })

    res.json({
      success: true,
      data: {
        id: Number(saved.id),
        name: saved.name,
        url: saved.url,
        size: Number(saved.size || 0),
        type: saved.type || '',
        surveyId: Number(saved.survey_id || survey.id),
        uploadToken: String(saved.public_token || '')
      }
    })
  } catch (e) { next(e) }
})

router.post('/:id/responses', async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (survey.status !== 'published') {
      return res.status(400).json({ success: false, error: { code: 'NOT_PUBLISHED', message: 'Survey is not published' } })
    }
    if (isSurveyExpired(survey)) {
      return res.status(403).json({ success: false, error: { code: 'SURVEY_EXPIRED', message: 'Survey has expired' }, data: buildSurveyAccessMeta(survey) })
    }

    const submissionToken = String(req.body?.clientSubmissionToken ?? req.body?.submissionToken ?? '').trim()
    const { normalizedAnswers, error } = validateSubmissionAnswers(survey.questions, req.body?.answers)
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error } })
    }
    const uploadResolved = await resolveUploadAnswers(survey, normalizedAnswers, submissionToken)
    if (uploadResolved.error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: uploadResolved.error } })
    }
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
    const allowMultipleSubmissions = survey?.settings?.allowMultipleSubmissions === true
    const submitOnce = survey?.settings?.submitOnce === true
    const shouldBlockRepeat = submitOnce || !allowMultipleSubmissions

    if (shouldBlockRepeat) {
      const duplicateCount = await Answer.countByIp(survey.id, clientIp)
      if (duplicateCount > 0) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_SUBMISSION', message: 'Repeated submissions are not allowed' }
        })
      }
    }

    const answer = await Answer.create({
      survey_id: survey.id,
      answers_data: uploadResolved.normalizedAnswers,
      ip_address: clientIp,
      user_agent: req.headers['user-agent'] || '',
      duration: req.body.duration || null
    })
    const uploadedFileIds = uploadResolved.normalizedAnswers
      .filter(item => item.questionType === 'upload' && Array.isArray(item.value))
      .flatMap(item => item.value.map(file => Number(file.id)))
      .filter(id => Number.isFinite(id) && id > 0)
    await FileModel.attachToAnswer(uploadedFileIds, answer.id)
    await cleanupPendingUploadsForSubmission(survey.id, submissionToken)
    await Survey.incrementResponseCount(survey.id)
    await createSystemMessage({
      recipientId: survey.creator_id,
      createdBy: null,
      title: 'New response received',
      content: `Survey "${survey.title}" received a new submission.`,
      entityType: 'survey',
      entityId: survey.id
    })
    res.json({ success: true, message: 'Submitted successfully', data: { id: answer.id } })
  } catch (e) { next(e) }
})

router.get('/:id/results', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    const submissions = await Answer.findBySurveyId(survey.id)
    const summary = buildResultsSummary(submissions)
    const questionStats = buildQuestionStats(survey, submissions)

    res.json({
      success: true,
      data: {
        ...summary,
        submissionTrend: buildSubmissionTrend(submissions),
        regionStats: buildRegionStats(submissions),
        systemStats: buildSystemStats(submissions),
        questionStats
      }
    })
  } catch (e) { next(e) }
})

export default router
