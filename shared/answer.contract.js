import { createPaginatedResult, normalizePaginationQuery } from './pagination.contract.js'

export const ANSWER_ERROR_CODES = Object.freeze({
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  NO_FILE: 'NO_FILE'
})

export const ANSWER_PAGINATION_DEFAULTS = Object.freeze({
  page: 1,
  pageSize: 20
})

function toNumberOrUndefined(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

export function normalizeAnswerListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, ANSWER_PAGINATION_DEFAULTS)

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    survey_id: toNumberOrUndefined(query?.survey_id),
    startTime: query?.startTime ? String(query.startTime) : undefined,
    endTime: query?.endTime ? String(query.endTime) : undefined
  }
}

export function createAnswerDto(answer) {
  if (!answer) return null

  const surveyId = toNumberOrUndefined(answer.survey_id ?? answer.surveyId)
  const duration = toNumberOrUndefined(answer.duration)
  const submittedAt = answer.submitted_at ?? answer.submittedAt

  return {
    ...answer,
    id: toNumberOrUndefined(answer.id),
    survey_id: surveyId,
    surveyId,
    duration,
    status: answer.status ? String(answer.status) : undefined,
    submitted_at: submittedAt,
    submittedAt,
    answers_data: Array.isArray(answer.answers_data) ? answer.answers_data : [],
    ip_address: answer.ip_address ? String(answer.ip_address) : undefined,
    user_agent: answer.user_agent ? String(answer.user_agent) : undefined
  }
}

export function createAnswerPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createAnswerDto(item)) : [],
    total,
    page,
    pageSize
  })
}

export function createAnswerCountDto(count) {
  return {
    count: Number(count || 0)
  }
}

export function createAnswerBatchDeleteResult(result = {}) {
  return {
    deleted: Number(result.deleted || 0)
  }
}
