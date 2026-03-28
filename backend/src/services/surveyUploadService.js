import { randomBytes } from 'crypto'
import Answer from '../models/Answer.js'
import FileModel from '../models/File.js'
import surveyAggregateRepository from '../repositories/surveyAggregateRepository.js'
import {
  normalizeSurveyQuestions,
  normalizeUploadQuestionConfig,
  validateSubmissionAnswers,
  validateUploadFilesAgainstQuestion
} from '../utils/questionSchema.js'
import { buildUploadedFileUrl, removeUploadedFile } from '../utils/uploadStorage.js'
import config from '../config/index.js'
import { createSystemMessage } from './activity.js'
import { getSurveyForPublicView, getSurveyForSubmission } from './surveyQueryService.js'
import { createSurveySubmissionDto, createSurveyUploadDto, SURVEY_ERROR_CODES } from '../../../shared/survey.contract.js'

function createHttpError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
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
      if (!file || String(file.public_token || '') !== ref.token) return null
      if (String(file.submission_token || '') !== String(submissionToken)) return null
      if (file.question_order != null && Number(file.question_order) !== Number(answer.questionId)) return null
      return {
        id: Number(file.id),
        name: file.name,
        url: file.url,
        size: Number(file.size || 0),
        type: file.type || ''
      }
    })

    if (resolved.some(item => item == null)) return null

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

export async function uploadSurveyFile({ survey, file, requestedQuestionId, submissionToken, uploaderId }) {
  const normalizedSubmissionToken = String(submissionToken || '').trim()
  const uploadQuestion = requestedQuestionId == null || requestedQuestionId === ''
    ? null
    : getUploadQuestionByQuestionId(survey, requestedQuestionId)

  await cleanupExpiredPendingUploads()

  if (requestedQuestionId != null && requestedQuestionId !== '' && !uploadQuestion) {
    throw createHttpError(400, SURVEY_ERROR_CODES.UPLOAD_QUESTION_NOT_FOUND, 'The target upload question does not exist')
  }

  if (uploadQuestion && !normalizedSubmissionToken) {
    throw createHttpError(400, SURVEY_ERROR_CODES.UPLOAD_SESSION_REQUIRED, 'Upload requests must include a submission token')
  }

  if (!uploadQuestion && !surveySupportsPublicUpload(survey)) {
    throw createHttpError(400, SURVEY_ERROR_CODES.UPLOAD_NOT_ENABLED, 'This survey does not accept file uploads')
  }

  if (!file) {
    throw createHttpError(400, SURVEY_ERROR_CODES.NO_FILE, 'File is required')
  }

  if (uploadQuestion) {
    const numericQuestionId = Number(requestedQuestionId)
    const currentCount = await FileModel.countPendingBySurveyQuestionSession(survey.id, numericQuestionId, normalizedSubmissionToken)
    const uploadConfig = normalizeUploadQuestionConfig(uploadQuestion)
    const uploadError = validateUploadFilesAgainstQuestion(uploadQuestion, [file], { enforceCount: false })
    const exceedsCount = currentCount + 1 > uploadConfig.maxFiles

    if (uploadError || exceedsCount) {
      removeUploadedFile(file)
      const message = exceedsCount
        ? `Question ${numericQuestionId} allows at most ${uploadConfig.maxFiles} files`
        : `Question ${numericQuestionId} ${uploadError}`
      throw createHttpError(400, SURVEY_ERROR_CODES.UPLOAD_VALIDATION, message)
    }
  }

  const saved = await FileModel.create({
    name: file.originalname || file.filename,
    url: buildUploadedFileUrl(file),
    size: file.size,
    type: file.mimetype,
    uploader_id: uploaderId ?? null,
    survey_id: survey.id,
    question_order: uploadQuestion ? Number(requestedQuestionId) : null,
    submission_token: normalizedSubmissionToken || null,
    public_token: randomBytes(24).toString('hex')
  })

  return createSurveyUploadDto(saved, survey.id)
}

export async function uploadSurveyFileForRequest({
  actor,
  identifier,
  file,
  requestedQuestionId,
  submissionToken,
  uploaderId
}) {
  const survey = await getSurveyForPublicView({ actor, identifier })
  return uploadSurveyFile({
    survey,
    file,
    requestedQuestionId,
    submissionToken,
    uploaderId
  })
}

export async function submitSurveyResponse({ survey, answers, clientSubmissionToken, submissionToken, duration, userAgent, forwardedFor, remoteAddress }) {
  const normalizedSubmissionToken = String(clientSubmissionToken ?? submissionToken ?? '').trim()
  const { normalizedAnswers, error } = validateSubmissionAnswers(survey.questions, answers)
  if (error) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, error)
  }

  const uploadResolved = await resolveUploadAnswers(survey, normalizedAnswers, normalizedSubmissionToken)
  if (uploadResolved.error) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, uploadResolved.error)
  }

  const clientIp = String(forwardedFor || remoteAddress || '').split(',')[0].trim()
  const allowMultipleSubmissions = survey?.settings?.allowMultipleSubmissions === true
  const submitOnce = survey?.settings?.submitOnce === true
  const shouldBlockRepeat = submitOnce || !allowMultipleSubmissions

  if (shouldBlockRepeat) {
    const duplicateCount = await Answer.countByIp(survey.id, clientIp)
    if (duplicateCount > 0) {
      throw createHttpError(409, SURVEY_ERROR_CODES.DUPLICATE_SUBMISSION, 'Repeated submissions are not allowed')
    }
  }

  const uploadedFileIds = uploadResolved.normalizedAnswers
    .filter(item => item.questionType === 'upload' && Array.isArray(item.value))
    .flatMap(item => item.value.map(file => Number(file.id)))
    .filter(id => Number.isFinite(id) && id > 0)

  const answer = await surveyAggregateRepository.createSubmission({
    surveyId: survey.id,
    answersData: uploadResolved.normalizedAnswers,
    uploadedFileIds,
    ipAddress: clientIp,
    userAgent,
    duration,
    onTransaction: async ({ trx }) => {
      await createSystemMessage({
        recipientId: survey.creator_id,
        createdBy: null,
        title: 'New response received',
        content: `Survey "${survey.title}" received a new submission.`,
        entityType: 'survey',
        entityId: survey.id
      }, { db: trx })
    }
  })

  try {
    await cleanupPendingUploadsForSubmission(survey.id, normalizedSubmissionToken)
  } catch (cleanupError) {
    console.error('Failed to cleanup pending uploads after submission:', cleanupError.message)
  }

  return answer
}

export async function submitSurveyResponseForRequest({
  identifier,
  answers,
  clientSubmissionToken,
  submissionToken,
  duration,
  userAgent,
  forwardedFor,
  remoteAddress
}) {
  const survey = await getSurveyForSubmission(identifier)
  return submitSurveyResponse({
    survey,
    answers,
    clientSubmissionToken,
    submissionToken,
    duration,
    userAgent,
    forwardedFor,
    remoteAddress
  })
}

export { createSurveySubmissionDto }
