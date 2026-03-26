import config from '../config/index.js'
import {
  LEGACY_TO_SERVER_TYPE_MAP,
  getServerQuestionSubmissionKind,
  mapLegacyTypeToServer,
  normalizeServerQuestionType,
  serverQuestionTypeHasOptions,
  SUPPORTED_SERVER_TYPES
} from '../../../shared/questionTypeRegistry.js'
const SUPPORTED_SERVER_TYPE_SET = new Set(SUPPORTED_SERVER_TYPES)
const DEFAULT_UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.xlsx'
const DEFAULT_UPLOAD_MAX_FILES = 1
const DEFAULT_UPLOAD_MAX_SIZE_MB = Math.max(1, Math.floor(config.upload.maxSize / (1024 * 1024)))
const MAX_UPLOAD_FILES = 20

function normalizeType(type, uiType) {
  const numericUiType = Number(uiType)
  if (Number.isFinite(numericUiType) && Object.prototype.hasOwnProperty.call(LEGACY_TO_SERVER_TYPE_MAP, numericUiType)) {
    return mapLegacyTypeToServer(numericUiType)
  }

  const numericType = Number(type)
  if (Number.isFinite(numericType) && Object.prototype.hasOwnProperty.call(LEGACY_TO_SERVER_TYPE_MAP, numericType)) {
    return mapLegacyTypeToServer(numericType)
  }

  return SUPPORTED_SERVER_TYPE_SET.has(String(type || '')) ? String(type) : normalizeServerQuestionType(type)
}

function normalizeOptions(options = []) {
  return options.map((option, index) => {
    if (option && typeof option === 'object') {
      return {
        ...option,
        label: String(option.label ?? option.text ?? `Option ${index + 1}`),
        value: String(option.value ?? index + 1),
        order: Number(option.order || index + 1)
      }
    }

    return {
      label: String(option ?? `Option ${index + 1}`),
      value: String(index + 1),
      order: index + 1
    }
  })
}

function normalizeMatrixRows(rows = []) {
  return rows.map((row, index) => {
    if (row && typeof row === 'object') {
      return {
        ...row,
        label: String(row.label ?? row.text ?? `Row ${index + 1}`),
        value: String(row.value ?? index + 1),
        order: Number(row.order || index + 1)
      }
    }

    return {
      label: String(row ?? `Row ${index + 1}`),
      value: String(index + 1),
      order: index + 1
    }
  })
}

function toRoundedRatioValue(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return Number(numeric.toFixed(2))
}

function normalizeRatioAnswerEntries(value, optionValues) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const entries = Object.entries(value)
  const normalized = []
  for (const [optionKey, raw] of entries) {
    if (!optionValues.has(String(optionKey))) return { error: 'invalid_option' }
    if (raw === '' || raw == null) continue

    const numeric = toRoundedRatioValue(raw)
    if (numeric == null) return { error: 'invalid_number' }
    if (numeric < 0 || numeric > 100) return { error: 'invalid_range' }

    normalized.push([String(optionKey), numeric])
  }

  return { entries: normalized }
}

function toPositiveInt(value, fallback, max = Number.POSITIVE_INFINITY) {
  const numeric = Math.floor(Number(value))
  if (!Number.isFinite(numeric) || numeric < 1) return fallback
  return Math.min(numeric, max)
}

function toPositiveNumber(value, fallback, max = Number.POSITIVE_INFINITY) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.min(numeric, max)
}

function normalizeAcceptToken(token) {
  const normalized = String(token || '').trim().toLowerCase()
  if (!normalized) return ''
  if (normalized.startsWith('.') || normalized.includes('/') || normalized.endsWith('/*')) return normalized
  return `.${normalized.replace(/^\.+/, '')}`
}

export function sanitizeUploadAccept(value) {
  const tokens = String(value || '')
    .split(',')
    .map(normalizeAcceptToken)
    .filter(Boolean)

  const unique = Array.from(new Set(tokens))
  return unique.join(',') || DEFAULT_UPLOAD_ACCEPT
}

export function normalizeUploadQuestionConfig(question) {
  const upload = question?.upload && typeof question.upload === 'object' ? question.upload : {}
  const validation = question?.validation && typeof question.validation === 'object' ? question.validation : {}

  return {
    maxFiles: toPositiveInt(upload.maxFiles ?? validation.maxFiles, DEFAULT_UPLOAD_MAX_FILES, MAX_UPLOAD_FILES),
    maxSizeMb: toPositiveNumber(upload.maxSizeMb ?? validation.maxSizeMb ?? validation.maxSize, DEFAULT_UPLOAD_MAX_SIZE_MB, DEFAULT_UPLOAD_MAX_SIZE_MB),
    accept: sanitizeUploadAccept(upload.accept ?? validation.accept)
  }
}

function getFileExtension(name) {
  const match = String(name || '').toLowerCase().match(/(\.[^.]+)$/)
  return match ? match[1] : ''
}

function fileMatchesAcceptToken(file, token) {
  const mimeType = String(file?.type || file?.mimetype || '').toLowerCase()
  const filename = String(file?.name || file?.originalname || file?.filename || '')
  if (!token) return true
  if (token.endsWith('/*')) {
    return mimeType.startsWith(token.slice(0, -1))
  }
  if (token.includes('/')) {
    return mimeType === token
  }
  return getFileExtension(filename) === token
}

export function validateUploadFilesAgainstQuestion(question, files, options = {}) {
  const config = normalizeUploadQuestionConfig(question)
  const list = Array.isArray(files) ? files : []
  const enforceCount = options.enforceCount !== false

  if (enforceCount && list.length > config.maxFiles) {
    return `allows at most ${config.maxFiles} files`
  }

  const maxBytes = config.maxSizeMb * 1024 * 1024
  const acceptTokens = config.accept.split(',').map(token => token.trim()).filter(Boolean)

  for (const file of list) {
    if (Number(file?.size || 0) > maxBytes) {
      return `allows files up to ${config.maxSizeMb}MB`
    }
    if (acceptTokens.length > 0 && !acceptTokens.some(token => fileMatchesAcceptToken(file, token))) {
      return 'contains an unsupported file type'
    }
  }

  return null
}

export function normalizeSurveyQuestions(questions) {
  if (!Array.isArray(questions)) return []

  return questions.map((question, index) => {
    const normalizedType = normalizeType(question?.type, question?.uiType)
    const normalized = {
      ...question,
      type: normalizedType,
      order: Number(question?.order || index + 1)
    }

    const numericUiType = Number(question?.uiType)
    if (Number.isFinite(numericUiType) && numericUiType > 0) {
      normalized.uiType = numericUiType
    }

    if (serverQuestionTypeHasOptions(normalizedType)) {
      normalized.options = normalizeOptions(question?.options)
    }

    if (normalizedType === 'matrix') {
      const matrix = question?.matrix && typeof question.matrix === 'object' ? question.matrix : {}
      normalized.options = normalizeOptions(question?.options)
      normalized.matrix = {
        ...matrix,
        selectionType: matrix.selectionType === 'multiple' ? 'multiple' : 'single',
        rows: normalizeMatrixRows(matrix.rows)
      }
    }

    if (normalizedType === 'upload') {
      normalized.upload = normalizeUploadQuestionConfig(question)
    }

    return normalized
  })
}

export function validateSurveyQuestions(questions) {
  const normalizedQuestions = normalizeSurveyQuestions(questions)

  if (normalizedQuestions.length === 0) {
    return { normalizedQuestions, error: 'At least one question is required' }
  }

  for (let index = 0; index < normalizedQuestions.length; index += 1) {
    const question = normalizedQuestions[index]

    if (!question.title || !String(question.title).trim()) {
      return { normalizedQuestions, error: `Question ${index + 1} title is required` }
    }

    if (serverQuestionTypeHasOptions(question.type)) {
      const options = Array.isArray(question.options) ? question.options : []
      if (options.length < 2) {
        return { normalizedQuestions, error: `Question ${index + 1} needs at least 2 options` }
      }
    }

    if (question.type === 'matrix') {
      const options = Array.isArray(question.options) ? question.options : []
      const rows = Array.isArray(question?.matrix?.rows) ? question.matrix.rows : []
      if (options.length < 2) {
        return { normalizedQuestions, error: `Question ${index + 1} needs at least 2 columns` }
      }
      if (rows.length < 1) {
        return { normalizedQuestions, error: `Question ${index + 1} needs at least 1 row` }
      }
    }
  }

  return { normalizedQuestions, error: null }
}

export function validateSubmissionAnswers(questions, answers) {
  const normalizedQuestions = normalizeSurveyQuestions(questions)
  const answerList = Array.isArray(answers) ? answers : []
  const questionsByOrder = new Map(normalizedQuestions.map((question, index) => [index + 1, question]))
  const seen = new Set()
  const normalizedAnswers = []

  for (const item of answerList) {
    const order = Number(item?.questionId)
    const question = questionsByOrder.get(order)
    if (!question || seen.has(order)) continue

    const value = item?.value
    let normalizedValue = value
    const optionValues = new Set((question.options || []).map(option => String(option.value)))
    const submissionKind = getServerQuestionSubmissionKind(question.type)

    if (submissionKind === 'single_option') {
      if (value != null && value !== '' && optionValues.size > 0 && !optionValues.has(String(value))) {
        return { normalizedAnswers: [], error: `Question ${order} contains an invalid option` }
      }
    }

    if (submissionKind === 'multi_option') {
      if (value != null && !Array.isArray(value)) {
        return { normalizedAnswers: [], error: `Question ${order} must be an array` }
      }
      if (Array.isArray(value) && optionValues.size > 0) {
        const invalid = value.some(option => !optionValues.has(String(option)))
        if (invalid) {
          return { normalizedAnswers: [], error: `Question ${order} contains an invalid option` }
        }
      }
    }

    if (submissionKind === 'file_list') {
      if (value != null && !Array.isArray(value)) {
        return { normalizedAnswers: [], error: `Question ${order} must be an array` }
      }

      if (Array.isArray(value)) {
        const uploadConfig = normalizeUploadQuestionConfig(question)
        if (value.length > uploadConfig.maxFiles) {
          return { normalizedAnswers: [], error: `Question ${order} allows at most ${uploadConfig.maxFiles} files` }
        }
      }
    }

    if (submissionKind === 'numeric' && value != null && value !== '' && Number.isNaN(Number(value))) {
      return { normalizedAnswers: [], error: `Question ${order} must be numeric` }
    }

    if (submissionKind === 'bounded_numeric' && value != null && value !== '') {
      const numericValue = Number(value)
      const min = Number(question?.validation?.min)
      const max = Number(question?.validation?.max)
      if (Number.isNaN(numericValue)) {
        return { normalizedAnswers: [], error: `Question ${order} must be numeric` }
      }
      if (Number.isFinite(min) && numericValue < min) {
        return { normalizedAnswers: [], error: `Question ${order} must be at least ${min}` }
      }
      if (Number.isFinite(max) && numericValue > max) {
        return { normalizedAnswers: [], error: `Question ${order} must be at most ${max}` }
      }
    }

    if (submissionKind === 'matrix' && value != null) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { normalizedAnswers: [], error: `Question ${order} must be an object` }
      }

      const rowValues = new Set((question?.matrix?.rows || []).map(row => String(row.value)))
      const answerEntries = Object.entries(value)
      const isMultipleMatrix = question?.matrix?.selectionType === 'multiple'

      for (const [rowKey, answerValue] of answerEntries) {
        if (!rowValues.has(String(rowKey))) {
          return { normalizedAnswers: [], error: `Question ${order} contains an invalid row` }
        }

        if (isMultipleMatrix) {
          if (answerValue == null) continue
          if (!Array.isArray(answerValue)) {
            return { normalizedAnswers: [], error: `Question ${order} row ${rowKey} must be an array` }
          }
          const invalid = answerValue.some(option => !optionValues.has(String(option)))
          if (invalid) {
            return { normalizedAnswers: [], error: `Question ${order} contains an invalid option` }
          }
          continue
        }

        if (Array.isArray(answerValue)) {
          return { normalizedAnswers: [], error: `Question ${order} row ${rowKey} must be a single value` }
        }
        if (answerValue != null && answerValue !== '' && optionValues.size > 0 && !optionValues.has(String(answerValue))) {
          return { normalizedAnswers: [], error: `Question ${order} contains an invalid option` }
        }
      }
    }

    if (submissionKind === 'ratio' && value != null) {
      const normalizedRatio = normalizeRatioAnswerEntries(value, optionValues)
      if (!normalizedRatio) {
        return { normalizedAnswers: [], error: `Question ${order} must be an object` }
      }
      if (normalizedRatio.error === 'invalid_option') {
        return { normalizedAnswers: [], error: `Question ${order} contains an invalid option` }
      }
      if (normalizedRatio.error === 'invalid_number') {
        return { normalizedAnswers: [], error: `Question ${order} must be numeric` }
      }
      if (normalizedRatio.error === 'invalid_range') {
        return { normalizedAnswers: [], error: `Question ${order} must stay between 0 and 100` }
      }

      const total = normalizedRatio.entries.reduce((sum, [, numeric]) => sum + numeric, 0)
      const hasValue = normalizedRatio.entries.length > 0

      if (hasValue && Math.abs(total - 100) > 0.01) {
        return { normalizedAnswers: [], error: `Question ${order} must total 100` }
      }

      normalizedValue = Object.fromEntries(normalizedRatio.entries)
    }

    if (question.required) {
      const empty = question.type === 'matrix'
        ? (() => {
            const rows = Array.isArray(question?.matrix?.rows) ? question.matrix.rows : []
            const isMultipleMatrix = question?.matrix?.selectionType === 'multiple'
            if (!value || typeof value !== 'object' || Array.isArray(value)) return true
            return rows.some(row => {
              const rowValue = value[String(row.value)]
              if (isMultipleMatrix) {
                return !Array.isArray(rowValue) || rowValue.length === 0
              }
              return rowValue == null || String(rowValue).trim() === ''
            })
          })()
        : question.type === 'ratio'
          ? (() => {
              const normalizedRatio = normalizeRatioAnswerEntries(value, optionValues)
              if (!normalizedRatio || normalizedRatio.error) return true
              if (normalizedRatio.entries.length === 0) return true
              const total = normalizedRatio.entries.reduce((sum, [, numeric]) => sum + numeric, 0)
              return Math.abs(total - 100) > 0.01
            })()
        : (Array.isArray(value) ? value.length === 0 : value == null || String(value).trim() === '')
      if (empty) {
        return { normalizedAnswers: [], error: `Question ${order} is required` }
      }
    }

    normalizedAnswers.push({
      questionId: order,
      questionType: question.type,
      value: normalizedValue
    })
    seen.add(order)
  }

  return { normalizedAnswers, error: null }
}
