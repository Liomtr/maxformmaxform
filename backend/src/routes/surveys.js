import { Router } from 'express'
import Survey from '../models/Survey.js'
import Answer from '../models/Answer.js'
import User from '../models/User.js'
import Folder from '../models/Folder.js'
import { authRequired, optionalAuth } from '../middlewares/auth.js'
import { createAuditMessage, createSystemMessage, recordAudit } from '../services/activity.js'

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
      questions: questions || [],
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
    if (survey.status !== 'published' && !canManageSurvey(req.user, survey)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Survey is not published or access is forbidden' }, data: buildSurveyAccessMeta(survey) })
    }
    if (isSurveyExpired(survey) && !canManageSurvey(req.user, survey)) {
      return res.status(403).json({ success: false, error: { code: 'SURVEY_EXPIRED', message: 'Survey has expired' }, data: buildSurveyAccessMeta(survey) })
    }
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (survey.status !== 'published' && !canManageSurvey(req.user, survey)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Survey is not published or access is forbidden' }, data: buildSurveyAccessMeta(survey) })
    }
    if (isSurveyExpired(survey) && !canManageSurvey(req.user, survey)) {
      return res.status(403).json({ success: false, error: { code: 'SURVEY_EXPIRED', message: 'Survey has expired' }, data: buildSurveyAccessMeta(survey) })
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
    const qs = Array.isArray(survey.questions) ? survey.questions : []
    if (qs.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'At least one question is required' } })
    }
    const endTime = getSurveyEndTime(survey)
    if (endTime && endTime.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End time must be later than now' } })
    }
    for (let i = 0; i < qs.length; i += 1) {
      if (!qs[i].title || !String(qs[i].title).trim()) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `Question ${i + 1} title is required` } })
      }
      if (['radio', 'checkbox'].includes(qs[i].type)) {
        const opts = Array.isArray(qs[i].options) ? qs[i].options : []
        if (opts.length < 2) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `Question ${i + 1} needs at least 2 options` } })
        }
      }
    }
    const updated = await Survey.update(survey.id, { status: 'published' })
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

router.post('/:id/responses', async (req, res, next) => {
  try {
    const survey = await loadSurveyOrThrow(req.params.id)
    if (survey.status !== 'published') {
      return res.status(400).json({ success: false, error: { code: 'NOT_PUBLISHED', message: 'Survey is not published' } })
    }
    if (isSurveyExpired(survey)) {
      return res.status(403).json({ success: false, error: { code: 'SURVEY_EXPIRED', message: 'Survey has expired' }, data: buildSurveyAccessMeta(survey) })
    }

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : []
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
      answers_data: answers,
      ip_address: clientIp,
      user_agent: req.headers['user-agent'] || '',
      duration: req.body.duration || null
    })
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

    const total = await Answer.count(survey.id)
    const last = await Answer.lastSubmission(survey.id)
    res.json({ success: true, data: { totalSubmissions: Number(total || 0), lastSubmitAt: last?.submitted_at || null } })
  } catch (e) { next(e) }
})

export default router
