import { Router } from 'express'
import Survey from '../models/Survey.js'
import Answer from '../models/Answer.js'
import User from '../models/User.js'
import { authRequired, optionalAuth } from '../middlewares/auth.js'

const router = Router()

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

async function loadSurveyOrThrow(identifier) {
  const survey = await Survey.findByIdentifier(identifier)
  if (!survey) {
    throw Object.assign(new Error('问卷不存在'), { status: 404, code: 'NOT_FOUND' })
  }
  return survey
}

function requireSurveyManager(req, res, survey) {
  if (canManageSurvey(req.user, survey)) return true

  res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: '无权限操作该问卷' }
  })
  return false
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status, creator_id, createdBy } = req.query
    let requestedCreatorId

    if (isAdmin(req.user)) {
      if (creator_id !== undefined) {
        requestedCreatorId = Number(creator_id)
      } else if (createdBy) {
        const user = await User.findByUsername(String(createdBy))
        requestedCreatorId = user ? user.id : -1
      }
    }

    const result = await Survey.list({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      creator_id: isAdmin(req.user)
        ? requestedCreatorId
        : req.user.sub
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { title, description, questions, settings, style } = req.body || {}
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '标题不能为空' } })
    }
    const survey = await Survey.create({
      title,
      description,
      creator_id: req.user.sub,
      questions: questions || [],
      settings,
      style
    })
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.get('/share/:code', optionalAuth, async (req, res, next) => {
  try {
    const survey = await Survey.findByShareCode(req.params.code)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    }
    if (survey.status !== 'published' && !canManageSurvey(req.user, survey)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '问卷未发布或无权访问' }, data: buildSurveyAccessMeta(survey) })
    }
    if (isSurveyExpired(survey) && !canManageSurvey(req.user, survey)) {
      return res.status(403).json({ success: false, error: { code: 'SURVEY_EXPIRED', message: '问卷已截止' }, data: buildSurveyAccessMeta(survey) })
    }
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (survey.status !== 'published' && !canManageSurvey(req.user, survey)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '问卷未发布或无权访问' }, data: buildSurveyAccessMeta(survey) })
    }
    if (isSurveyExpired(survey) && !canManageSurvey(req.user, survey)) {
      return res.status(403).json({ success: false, error: { code: 'SURVEY_EXPIRED', message: '问卷已截止' }, data: buildSurveyAccessMeta(survey) })
    }
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const { title, description, questions, settings, style } = req.body || {}
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    const updated = await Survey.update(survey.id, { title, description, questions, settings, style })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    await Survey.delete(survey.id)
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.post('/:id/publish', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    if (!survey.title || !survey.title.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '标题不能为空' } })
    }
    const qs = Array.isArray(survey.questions) ? survey.questions : []
    if (qs.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '至少需要一道题目' } })
    }
    const endTime = getSurveyEndTime(survey)
    if (endTime && endTime.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '截止时间必须晚于当前时间' } })
    }
    for (let i = 0; i < qs.length; i++) {
      if (!qs[i].title || !String(qs[i].title).trim()) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `第${i + 1}题标题不能为空` } })
      }
      if (['radio', 'checkbox'].includes(qs[i].type)) {
        const opts = Array.isArray(qs[i].options) ? qs[i].options : []
        if (opts.length < 2) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `第${i + 1}题至少需要2个选项` } })
        }
      }
    }
    const updated = await Survey.update(survey.id, { status: 'published' })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.post('/:id/close', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    const updated = await Survey.update(survey.id, { status: 'closed' })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.post('/:id/responses', async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (survey.status !== 'published') {
      return res.status(400).json({ success: false, error: { code: 'NOT_PUBLISHED', message: '问卷未发布或已关闭' } })
    }
    if (isSurveyExpired(survey)) {
      return res.status(403).json({ success: false, error: { code: 'SURVEY_EXPIRED', message: '问卷已截止' }, data: buildSurveyAccessMeta(survey) })
    }

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : []
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
    const allowMultipleSubmissions = survey?.settings?.allowMultipleSubmissions !== true
      ? false
      : true
    const submitOnce = survey?.settings?.submitOnce === true
    const shouldBlockRepeat = submitOnce || !allowMultipleSubmissions

    if (shouldBlockRepeat) {
      const duplicateCount = await Answer.countByIp(survey.id, clientIp)
      if (duplicateCount > 0) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_SUBMISSION', message: '当前问卷不允许重复提交' }
        })
      }
    }

    const answer = await Answer.create({
      survey_id: survey.id,
      answers_data: answers,
      ip_address: clientIp,
      user_agent: req.headers['user-agent'] || '',
      duration: req.body.duration || null
    })
    await Survey.incrementResponseCount(survey.id)
    res.json({ success: true, message: '提交成功，感谢您的参与！', data: { id: answer.id } })
  } catch (e) { next(e) }
})

router.get('/:id/results', authRequired, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (!requireSurveyManager(req, res, survey)) return

    const total = await Answer.count(survey.id)
    const last = await Answer.lastSubmission(survey.id)
    res.json({ success: true, data: { totalSubmissions: total, lastSubmitAt: last?.submitted_at || null } })
  } catch (e) { next(e) }
})

export default router
