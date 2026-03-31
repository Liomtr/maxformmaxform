import { createPaginatedResult, normalizePaginationQuery } from './pagination.contract.js'
export {
  ANSWER_ERROR_CODES,
  ANSWER_PAGINATION_DEFAULTS,
  createAnswerBatchDeleteResult,
  createAnswerCountDto,
  createAnswerDto,
  createAnswerPageResult,
  normalizeAnswerListQuery
} from './answer.contract.js'
export {
  SURVEY_UPLOAD_ERROR_CODES,
  createSurveySubmissionDto,
  createSurveyUploadDto
} from './surveyUpload.contract.js'

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
  SHARE_CODE_GENERATION_FAILED: 'SHARE_CODE_GENERATION_FAILED'
})

export const SURVEY_PAGINATION_DEFAULTS = Object.freeze({
  page: 1,
  pageSize: 20,
  trashPageSize: 100,
  answersPageSize: 20
})

export const QUESTION_DTO_WRITABLE_FIELDS = Object.freeze([
  'type',
  'uiType',
  'title',
  'titleHtml',
  'description',
  'required',
  'options',
  'optionOrder',
  'validation',
  'upload',
  'matrix',
  'logic',
  'examConfig',
  'jumpLogic',
  'optionGroups',
  'hideSystemNumber',
  'quotasEnabled',
  'quotaMode',
  'quotaShowRemaining',
  'quotaFullText',
  'autoSelectOnAppear',
  'order'
])

export const QUESTION_OPTION_DTO_WRITABLE_FIELDS = Object.freeze([
  'label',
  'value',
  'order',
  'text',
  'rich',
  'desc',
  'hidden',
  'visibleWhen',
  'exclusive',
  'defaultSelected',
  'quotaLimit',
  'quotaEnabled',
  'fillEnabled',
  'fillRequired',
  'fillPlaceholder'
])

export const QUESTION_VALIDATION_WRITABLE_FIELDS = Object.freeze([
  'min',
  'max',
  'step',
  'minLabel',
  'maxLabel',
  'maxFiles',
  'maxSizeMb',
  'maxSize',
  'accept'
])

export const QUESTION_UPLOAD_CONFIG_WRITABLE_FIELDS = Object.freeze([
  'maxFiles',
  'maxSizeMb',
  'accept'
])

export const QUESTION_MATRIX_WRITABLE_FIELDS = Object.freeze([
  'rows',
  'selectionType'
])

export const QUESTION_MATRIX_ROW_WRITABLE_FIELDS = Object.freeze([
  'label',
  'value',
  'order',
  'text'
])

export const QUESTION_LOGIC_CONDITION_WRITABLE_FIELDS = Object.freeze([
  'qid',
  'op',
  'value'
])

export const QUESTION_LOGIC_WRITABLE_FIELDS = Object.freeze([
  'visibleWhen'
])

export const QUESTION_EXAM_CONFIG_WRITABLE_FIELDS = Object.freeze([
  'score',
  'correctAnswer'
])

export const QUESTION_JUMP_LOGIC_WRITABLE_FIELDS = Object.freeze([
  'byOption',
  'unconditional'
])

export const QUESTION_OPTION_GROUP_WRITABLE_FIELDS = Object.freeze([
  'name',
  'from',
  'to',
  'random'
])

export const SURVEY_SETTINGS_WRITABLE_FIELDS = Object.freeze([
  'showProgress',
  'allowMultipleSubmissions',
  'endTime',
  'examMode',
  'timeLimit',
  'submitOnce',
  'randomOrder',
  'randomizeQuestions',
  'collectIP'
])

export const SURVEY_STYLE_WRITABLE_FIELDS = Object.freeze([
  'theme',
  'backgroundColor',
  'headerImage'
])

function toNumberOrUndefined(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function toNumberOrNull(value) {
  if (value === null || value === '' || value === 'null') return null
  return toNumberOrUndefined(value)
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map(cloneJsonValue)
  if (isPlainRecord(value)) {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneJsonValue(value[key])
      return result
    }, {})
  }
  return value
}

function pickWritableFields(source, allowedFields) {
  if (!isPlainRecord(source)) return undefined

  const picked = {}
  for (const field of allowedFields) {
    if (source[field] === undefined) continue
    picked[field] = source[field]
  }
  return picked
}

function sanitizeVisibleWhen(value) {
  if (!Array.isArray(value)) return undefined

  const groups = value
    .filter(Array.isArray)
    .map(group => group
      .filter(isPlainRecord)
      .map(condition => {
        const picked = pickWritableFields(condition, QUESTION_LOGIC_CONDITION_WRITABLE_FIELDS)
        return picked ? cloneJsonValue(picked) : null
      })
      .filter(Boolean))
    .filter(group => group.length > 0)

  return groups.length > 0 ? groups : undefined
}

function sanitizeQuestionOption(option) {
  const picked = pickWritableFields(option, QUESTION_OPTION_DTO_WRITABLE_FIELDS)
  if (!picked) return undefined

  const sanitized = { ...picked }
  if (picked.visibleWhen !== undefined) {
    sanitized.visibleWhen = sanitizeVisibleWhen(picked.visibleWhen)
    if (sanitized.visibleWhen === undefined) delete sanitized.visibleWhen
  }

  return sanitized
}

function sanitizeMatrixRows(rows) {
  if (!Array.isArray(rows)) return undefined

  const normalized = rows
    .map(row => {
      if (!isPlainRecord(row)) return cloneJsonValue(row)
      const picked = pickWritableFields(row, QUESTION_MATRIX_ROW_WRITABLE_FIELDS)
      return picked ? cloneJsonValue(picked) : undefined
    })
    .filter(row => row !== undefined)

  return normalized
}

function sanitizeValidation(validation) {
  const picked = pickWritableFields(validation, QUESTION_VALIDATION_WRITABLE_FIELDS)
  return picked ? cloneJsonValue(picked) : undefined
}

function sanitizeUploadConfig(upload) {
  const picked = pickWritableFields(upload, QUESTION_UPLOAD_CONFIG_WRITABLE_FIELDS)
  return picked ? cloneJsonValue(picked) : undefined
}

function sanitizeMatrixConfig(matrix) {
  const picked = pickWritableFields(matrix, QUESTION_MATRIX_WRITABLE_FIELDS)
  if (!picked) return undefined

  const sanitized = { ...picked }
  if (picked.rows !== undefined) sanitized.rows = sanitizeMatrixRows(picked.rows)
  return sanitized
}

function sanitizeQuestionLogic(logic) {
  const picked = pickWritableFields(logic, QUESTION_LOGIC_WRITABLE_FIELDS)
  if (!picked) return undefined

  const sanitized = { ...picked }
  if (picked.visibleWhen !== undefined) sanitized.visibleWhen = sanitizeVisibleWhen(picked.visibleWhen)
  return sanitized
}

function sanitizeExamConfig(examConfig) {
  const picked = pickWritableFields(examConfig, QUESTION_EXAM_CONFIG_WRITABLE_FIELDS)
  return picked ? cloneJsonValue(picked) : undefined
}

function sanitizeJumpLogic(jumpLogic) {
  const picked = pickWritableFields(jumpLogic, QUESTION_JUMP_LOGIC_WRITABLE_FIELDS)
  if (!picked) return undefined

  const sanitized = {}
  if (isPlainRecord(picked.byOption)) {
    sanitized.byOption = Object.keys(picked.byOption).reduce((result, key) => {
      result[String(key)] = cloneJsonValue(picked.byOption[key])
      return result
    }, {})
  }
  if (picked.unconditional !== undefined) {
    sanitized.unconditional = cloneJsonValue(picked.unconditional)
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

function sanitizeOptionGroups(optionGroups) {
  if (!Array.isArray(optionGroups)) return undefined

  const groups = optionGroups
    .filter(isPlainRecord)
    .map(group => {
      const picked = pickWritableFields(group, QUESTION_OPTION_GROUP_WRITABLE_FIELDS)
      return picked ? cloneJsonValue(picked) : null
    })
    .filter(Boolean)

  return groups.length > 0 ? groups : undefined
}

export function sanitizeWritableQuestionDto(question) {
  const picked = pickWritableFields(question, QUESTION_DTO_WRITABLE_FIELDS)
  if (!picked) return {}

  const sanitized = { ...picked }

  if (picked.options !== undefined) {
    sanitized.options = Array.isArray(picked.options)
      ? picked.options.map(sanitizeQuestionOption).filter(Boolean)
      : undefined
  }

  if (picked.validation !== undefined) sanitized.validation = sanitizeValidation(picked.validation)
  if (picked.upload !== undefined) sanitized.upload = sanitizeUploadConfig(picked.upload)
  if (picked.matrix !== undefined) sanitized.matrix = sanitizeMatrixConfig(picked.matrix)
  if (picked.logic !== undefined) sanitized.logic = sanitizeQuestionLogic(picked.logic)
  if (picked.examConfig !== undefined) sanitized.examConfig = sanitizeExamConfig(picked.examConfig)
  if (picked.jumpLogic !== undefined) sanitized.jumpLogic = sanitizeJumpLogic(picked.jumpLogic)
  if (picked.optionGroups !== undefined) sanitized.optionGroups = sanitizeOptionGroups(picked.optionGroups)

  return sanitized
}

export function sanitizeWritableQuestionDtos(questions) {
  if (!Array.isArray(questions)) return []
  return questions
    .filter(isPlainRecord)
    .map(question => sanitizeWritableQuestionDto(question))
    .filter(question => isPlainRecord(question) && Object.keys(question).length > 0)
}

export function sanitizeWritableSurveySettings(settings) {
  const picked = pickWritableFields(settings, SURVEY_SETTINGS_WRITABLE_FIELDS)
  return picked ? cloneJsonValue(picked) : undefined
}

export function sanitizeWritableSurveyStyle(style) {
  const picked = pickWritableFields(style, SURVEY_STYLE_WRITABLE_FIELDS)
  return picked ? cloneJsonValue(picked) : undefined
}

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
