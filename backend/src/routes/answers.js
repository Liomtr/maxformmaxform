import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { sendDownloadBuffer, streamDownloadArchive } from '../http/downloadResponse.js'
import { throwAnswerError } from '../http/answerErrors.js'
import { authRequired } from '../middlewares/auth.js'
import { deleteAnswersBatch } from '../services/answerCommandService.js'
import { ensureAnswerBodyObject } from '../utils/answerPayload.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import {
  createSurveyAnswerAttachmentsArchive,
  createSurveyAnswersWorkbookExport
} from '../services/answerExportService.js'
import { ANSWER_ERROR_CODES } from '../../../shared/answer.contract.js'
import {
  countAnswers,
  getAnswerForManagement,
  listAnswers
} from '../services/answerQueryService.js'

const router = Router()

router.get('/', authRequired, asyncRoute(async (req, res) => {
  const result = await listAnswers({ actor: req.user, query: req.query })
  res.json({ success: true, data: result })
}))

router.get('/count', authRequired, asyncRoute(async (req, res) => {
  const result = await countAnswers({ actor: req.user, query: req.query })
  res.json({ success: true, data: result })
}))

router.get('/:id', authRequired, asyncRoute(async (req, res) => {
  const answerId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwAnswerError(400, ANSWER_ERROR_CODES.VALIDATION, message)
  })
  const answer = await getAnswerForManagement({
    actor: req.user,
    answerId
  })
  res.json({ success: true, data: answer })
}))

router.delete('/batch', authRequired, asyncRoute(async (req, res) => {
  const body = ensureAnswerBodyObject(req.body)
  const result = await deleteAnswersBatch({
    actor: req.user,
    ids: body.ids
  })
  res.json({ success: true, data: result })
}))

router.post('/download/survey', authRequired, asyncRoute(async (req, res) => {
  const body = ensureAnswerBodyObject(req.body)
  const file = await createSurveyAnswersWorkbookExport({
    actor: req.user,
    surveyId: body.survey_id
  })

  sendDownloadBuffer(res, file)
}))

router.post('/download/attachments', authRequired, asyncRoute(async (req, res, next) => {
  const body = ensureAnswerBodyObject(req.body)
  const file = await createSurveyAnswerAttachmentsArchive({
    actor: req.user,
    surveyId: body.survey_id
  })

  await streamDownloadArchive({ res, next, file })
}))

export default router
