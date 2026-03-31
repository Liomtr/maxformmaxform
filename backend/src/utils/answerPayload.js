import { throwAnswerError } from '../http/answerErrors.js'
import { ANSWER_ERROR_CODES } from '../../../shared/answer.contract.js'

function throwAnswerValidation(message) {
  throwAnswerError(400, ANSWER_ERROR_CODES.VALIDATION, message)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function ensureAnswerBodyObject(body, label = 'Request body') {
  if (!isPlainObject(body)) {
    throwAnswerValidation(`${label} must be an object`)
  }

  return body
}

export function normalizeAnswerSurveyId(surveyId) {
  if (surveyId === undefined || surveyId === null || surveyId === '') {
    return undefined
  }

  if (typeof surveyId !== 'string' && typeof surveyId !== 'number') {
    throwAnswerValidation('survey_id must be an integer')
  }

  const raw = typeof surveyId === 'string' ? surveyId.trim() : surveyId
  if (raw === '') {
    return undefined
  }

  const normalized = Number(raw)
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throwAnswerValidation('survey_id must be an integer')
  }

  return normalized
}

export function normalizeAnswerIds(ids) {
  if (ids === undefined) return undefined

  if (!Array.isArray(ids)) {
    throwAnswerValidation('ids must be an array of integers')
  }

  return ids.map((id, index) => {
    if (typeof id !== 'string' && typeof id !== 'number') {
      throwAnswerValidation(`ids[${index}] must be an integer`)
    }

    const raw = typeof id === 'string' ? id.trim() : id
    const normalized = Number(raw)
    if (!Number.isInteger(normalized) || normalized <= 0) {
      throwAnswerValidation(`ids[${index}] must be an integer`)
    }

    return normalized
  })
}
