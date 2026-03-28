import Answer from '../models/Answer.js'
import surveyAggregateRepository from '../repositories/surveyAggregateRepository.js'
import { removeUploadedFile } from '../utils/uploadStorage.js'
import { getManagedSurveyForAnswerRequest } from './answerQueryService.js'

function createResponseError(status, body) {
  const error = Object.assign(new Error(body?.error?.message || 'Request failed'), {
    status,
    body
  })
  if (body?.error?.code) error.code = body.error.code
  return error
}

function cleanupStoredFiles(files = []) {
  if (!Array.isArray(files) || files.length === 0) return

  for (const file of files) {
    try {
      removeUploadedFile(file?.url || file)
    } catch (error) {
      console.error('Failed to remove uploaded file:', error.message)
    }
  }
}

export async function deleteAnswersBatch({ actor, ids = [] }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createResponseError(400, {
      success: false,
      error: { code: 'VALIDATION', message: 'ids is required' }
    })
  }

  const answers = await Promise.all(ids.map(id => Answer.findById(id)))
  const existingAnswers = answers.filter(Boolean)
  if (existingAnswers.length === 0) {
    return { deleted: 0 }
  }

  const surveyIds = [...new Set(existingAnswers.map(item => item.survey_id))]
  await Promise.all(surveyIds.map(surveyId => getManagedSurveyForAnswerRequest({ actor, surveyId })))

  const answerIds = existingAnswers
    .map(item => Number(item.id))
    .filter(id => Number.isFinite(id) && id > 0)

  const { deleted, filesToCleanup } = await surveyAggregateRepository.deleteAnswersBatch({
    answerIds,
    surveyIds
  })

  cleanupStoredFiles(filesToCleanup)
  return { deleted }
}
