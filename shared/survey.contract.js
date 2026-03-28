import { createPaginatedResult, normalizePaginationQuery } from './pagination.contract.js'

export const SURVEY_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed'
})

export const SURVEY_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION: 'VALIDATION',
  NOT_PUBLISHED: 'NOT_PUBLISHED',
  SURVEY_EXPIRED: 'SURVEY_EXPIRED',
  NOT_IN_TRASH: 'NOT_IN_TRASH',
  FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND',
  UPLOAD_QUESTION_NOT_FOUND: 'UPLOAD_QUESTION_NOT_FOUND',
  UPLOAD_SESSION_REQUIRED: 'UPLOAD_SESSION_REQUIRED',
  UPLOAD_NOT_ENABLED: 'UPLOAD_NOT_ENABLED',
  UPLOAD_VALIDATION: 'UPLOAD_VALIDATION',
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION',
  NO_FILE: 'NO_FILE',
  SHARE_CODE_GENERATION_FAILED: 'SHARE_CODE_GENERATION_FAILED'
})

export const SURVEY_PAGINATION_DEFAULTS = Object.freeze({
  page: 1,
  pageSize: 20,
  trashPageSize: 100
})

export function normalizeSurveyFolderId(folderId) {
  if (folderId === undefined) return undefined
  if (folderId === null || folderId === '' || folderId === 'null') return null

  const normalized = Number(folderId)
  return Number.isFinite(normalized) ? normalized : undefined
}

export function normalizeSurveyListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, SURVEY_PAGINATION_DEFAULTS)
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    status: query?.status,
    creator_id: query?.creator_id,
    createdBy: query?.createdBy,
    folder_id: normalizeSurveyFolderId(query?.folder_id)
  }
}

export function normalizeSurveyTrashListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: SURVEY_PAGINATION_DEFAULTS.page,
    pageSize: SURVEY_PAGINATION_DEFAULTS.trashPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    creator_id: query?.creator_id,
    createdBy: query?.createdBy
  }
}

export function createSurveyPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({ list, total, page, pageSize })
}

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
