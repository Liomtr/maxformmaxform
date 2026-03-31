import { SURVEY_UPLOAD_ERROR_CODES } from '../../../shared/surveyUpload.contract.js'

function createDeniedPolicy(status, code, message) {
  return {
    allowed: false,
    status,
    body: {
      success: false,
      error: { code, message }
    }
  }
}

export function getUploadQuestionExistsPolicy(requestedQuestionId, uploadQuestion) {
  if (requestedQuestionId == null || requestedQuestionId === '' || uploadQuestion) {
    return { allowed: true }
  }

  return createDeniedPolicy(400, SURVEY_UPLOAD_ERROR_CODES.UPLOAD_QUESTION_NOT_FOUND, 'The target upload question does not exist')
}

export function getUploadSessionRequiredPolicy(uploadQuestion, submissionToken) {
  if (!uploadQuestion || String(submissionToken || '').trim()) {
    return { allowed: true }
  }

  return createDeniedPolicy(400, SURVEY_UPLOAD_ERROR_CODES.UPLOAD_SESSION_REQUIRED, 'Upload requests must include a submission token')
}

export function getUploadEnabledPolicy(uploadQuestion, surveySupportsUpload) {
  if (uploadQuestion || surveySupportsUpload) {
    return { allowed: true }
  }

  return createDeniedPolicy(400, SURVEY_UPLOAD_ERROR_CODES.UPLOAD_NOT_ENABLED, 'This survey does not accept file uploads')
}

export function getUploadFileRequiredPolicy(file) {
  if (file) {
    return { allowed: true }
  }

  return createDeniedPolicy(400, SURVEY_UPLOAD_ERROR_CODES.NO_FILE, 'File is required')
}

export function getUploadValidationPolicy({ questionId, uploadError, exceedsCount, maxFiles }) {
  if (!uploadError && !exceedsCount) {
    return { allowed: true }
  }

  const message = exceedsCount
    ? `Question ${questionId} allows at most ${maxFiles} files`
    : `Question ${questionId} ${uploadError}`

  return createDeniedPolicy(400, SURVEY_UPLOAD_ERROR_CODES.UPLOAD_VALIDATION, message)
}

export function getSubmissionValidationPolicy(error) {
  if (!error) {
    return { allowed: true }
  }

  return createDeniedPolicy(400, SURVEY_UPLOAD_ERROR_CODES.VALIDATION, error)
}

export function getDuplicateSubmissionPolicy(duplicateCount) {
  if (!(Number(duplicateCount) > 0)) {
    return { allowed: true }
  }

  return createDeniedPolicy(409, SURVEY_UPLOAD_ERROR_CODES.DUPLICATE_SUBMISSION, 'Repeated submissions are not allowed')
}
