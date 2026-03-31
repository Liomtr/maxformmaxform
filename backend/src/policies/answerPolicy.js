import { isAdmin } from './accessPolicy.js'
import { ANSWER_ERROR_CODES } from '../../../shared/answer.contract.js'

function createAnswerDeniedPolicy(status, code, message) {
  return {
    allowed: false,
    status,
    body: {
      success: false,
      error: { code, message }
    }
  }
}

export function getAnswerSurveyRequiredPolicy(surveyId) {
  if (surveyId) {
    return { allowed: true }
  }

  return createAnswerDeniedPolicy(400, ANSWER_ERROR_CODES.VALIDATION, 'survey_id is required')
}

export function getAnswerListPolicy(actor, query = {}) {
  if (query?.survey_id || isAdmin(actor)) {
    return { allowed: true }
  }

  return createAnswerDeniedPolicy(400, ANSWER_ERROR_CODES.VALIDATION, 'survey_id is required')
}

export function getAnswerBatchDeletePolicy(ids) {
  if (Array.isArray(ids) && ids.length > 0) {
    return { allowed: true }
  }

  return createAnswerDeniedPolicy(400, ANSWER_ERROR_CODES.VALIDATION, 'ids is required')
}

export function getAnswerAttachmentsAvailablePolicy(files = []) {
  if (Array.isArray(files) && files.length > 0) {
    return { allowed: true }
  }

  return createAnswerDeniedPolicy(404, ANSWER_ERROR_CODES.NO_FILE, 'No answer attachments are available for download')
}
