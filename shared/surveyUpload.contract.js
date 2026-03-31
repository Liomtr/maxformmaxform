export const SURVEY_UPLOAD_ERROR_CODES = Object.freeze({
  UPLOAD_QUESTION_NOT_FOUND: 'UPLOAD_QUESTION_NOT_FOUND',
  UPLOAD_SESSION_REQUIRED: 'UPLOAD_SESSION_REQUIRED',
  UPLOAD_NOT_ENABLED: 'UPLOAD_NOT_ENABLED',
  UPLOAD_VALIDATION: 'UPLOAD_VALIDATION',
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION',
  NO_FILE: 'NO_FILE',
  VALIDATION: 'VALIDATION'
})

export function createSurveyUploadDto(file, surveyId) {
  return {
    id: Number(file?.id),
    name: file?.name || '',
    url: file?.url || '',
    size: Number(file?.size || 0),
    type: file?.type || '',
    surveyId: Number(file?.survey_id || surveyId || 0),
    uploadToken: String(file?.public_token || file?.uploadToken || '')
  }
}

export function createSurveySubmissionDto(answer) {
  return {
    id: Number(answer?.id || 0)
  }
}
