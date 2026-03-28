import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired, optionalAuth } from '../middlewares/auth.js'
import {
  getManagedSurveyResults,
  getPublicSurveyView,
  getSharedSurveyView,
  listManagedSurveys,
  listManagedSurveyTrash
} from '../services/surveyQueryService.js'
import {
  clearManagedSurveyTrash,
  closeManagedSurvey,
  createSurvey,
  forceDeleteManagedSurvey,
  moveManagedSurveyToFolder,
  moveManagedSurveyToTrash,
  publishManagedSurvey,
  restoreManagedSurvey,
  updateManagedSurvey,
} from '../services/surveyCommandService.js'
import { createSurveySubmissionDto, submitSurveyResponseForRequest, uploadSurveyFileForRequest } from '../services/surveyUploadService.js'
import { upload } from '../utils/uploadStorage.js'

const router = Router()
const publicUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
})

router.get('/', authRequired, asyncRoute(async (req, res) => {
  const result = await listManagedSurveys({ actor: req.user, query: req.query })
  res.json({ success: true, data: result })
}))

router.get('/trash', authRequired, asyncRoute(async (req, res) => {
  const result = await listManagedSurveyTrash({ actor: req.user, query: req.query })
  res.json({ success: true, data: result, total: result.total })
}))

router.delete('/trash', authRequired, asyncRoute(async (req, res) => {
  const result = await clearManagedSurveyTrash({ actor: req.user, query: req.query })
  res.json({ success: true, data: result })
}))

router.post('/', authRequired, asyncRoute(async (req, res) => {
  const survey = await createSurvey({
    actor: req.user,
    title: req.body?.title,
    description: req.body?.description,
    questions: req.body?.questions,
    settings: req.body?.settings,
    style: req.body?.style
  })
  res.json({ success: true, data: survey })
}))

router.get('/share/:code', optionalAuth, asyncRoute(async (req, res) => {
  const survey = await getSharedSurveyView({
    actor: req.user,
    shareCode: req.params.code
  })
  res.json({ success: true, data: survey })
}))

router.get('/:id', optionalAuth, asyncRoute(async (req, res) => {
  const survey = await getPublicSurveyView({
    actor: req.user,
    identifier: req.params.id
  })
  res.json({ success: true, data: survey })
}))

router.put('/:id', authRequired, asyncRoute(async (req, res) => {
  const updated = await updateManagedSurvey({
    actor: req.user,
    identifier: req.params.id,
    title: req.body?.title,
    description: req.body?.description,
    questions: req.body?.questions,
    settings: req.body?.settings,
    style: req.body?.style
  })
  res.json({ success: true, data: updated })
}))

router.delete('/:id', authRequired, asyncRoute(async (req, res) => {
  const deleted = await moveManagedSurveyToTrash({ actor: req.user, identifier: req.params.id })
  res.json({ success: true, data: deleted })
}))

router.post('/:id/restore', authRequired, asyncRoute(async (req, res) => {
  const restored = await restoreManagedSurvey({
    actor: req.user,
    identifier: req.params.id
  })
  res.json({ success: true, data: restored })
}))

router.delete('/:id/force', authRequired, asyncRoute(async (req, res) => {
  await forceDeleteManagedSurvey({
    actor: req.user,
    identifier: req.params.id
  })
  res.json({ success: true })
}))

router.post('/:id/publish', authRequired, asyncRoute(async (req, res) => {
  const updated = await publishManagedSurvey({ actor: req.user, identifier: req.params.id })
  res.json({ success: true, data: updated })
}))

router.post('/:id/close', authRequired, asyncRoute(async (req, res) => {
  const updated = await closeManagedSurvey({ actor: req.user, identifier: req.params.id })
  res.json({ success: true, data: updated })
}))

router.put('/:id/folder', authRequired, asyncRoute(async (req, res) => {
  const updated = await moveManagedSurveyToFolder({
    actor: req.user,
    identifier: req.params.id,
    folderId: req.body?.folder_id
  })
  res.json({ success: true, data: updated })
}))

router.post('/:id/uploads', optionalAuth, publicUploadLimiter, upload.single('file'), asyncRoute(async (req, res) => {
  const data = await uploadSurveyFileForRequest({
    actor: req.user,
    identifier: req.params.id,
    file: req.file,
    requestedQuestionId: req.body?.questionId,
    submissionToken: req.body?.submissionToken,
    uploaderId: req.user?.sub ?? null
  })

  res.json({ success: true, data })
}))

router.post('/:id/responses', asyncRoute(async (req, res) => {
  const answer = await submitSurveyResponseForRequest({
    identifier: req.params.id,
    answers: req.body?.answers,
    clientSubmissionToken: req.body?.clientSubmissionToken,
    submissionToken: req.body?.submissionToken,
    duration: req.body?.duration,
    userAgent: req.headers['user-agent'] || '',
    forwardedFor: req.headers['x-forwarded-for'],
    remoteAddress: req.socket?.remoteAddress
  })

  res.json({ success: true, message: 'Submitted successfully', data: createSurveySubmissionDto(answer) })
}))

router.get('/:id/results', authRequired, asyncRoute(async (req, res) => {
  const data = await getManagedSurveyResults({ actor: req.user, identifier: req.params.id })
  res.json({ success: true, data })
}))

export default router
