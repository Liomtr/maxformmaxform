import { throwAnswerPolicyError } from '../http/answerErrors.js'
import { getAnswerBatchDeletePolicy } from '../policies/answerPolicy.js'
import answerRepository from '../repositories/answerRepository.js'
import surveyAggregateRepository from '../repositories/surveyAggregateRepository.js'
import { normalizeAnswerIds } from '../utils/answerPayload.js'
import { removeUploadedFile } from '../utils/uploadStorage.js'
import { getManagedSurveyForAnswerRequest } from './answerQueryService.js'
import { createAnswerBatchDeleteResult } from '../../../shared/answer.contract.js'

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
  ids = normalizeAnswerIds(ids)
  throwAnswerPolicyError(getAnswerBatchDeletePolicy(ids))

  const existingAnswers = await answerRepository.findByIds(ids)
  if (existingAnswers.length === 0) {
    return createAnswerBatchDeleteResult()
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
  return createAnswerBatchDeleteResult({ deleted })
}
