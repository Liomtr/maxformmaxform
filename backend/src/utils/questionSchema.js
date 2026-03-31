import config from '../config/index.js'
import {
  LEGACY_TO_SERVER_TYPE_MAP,
  getServerQuestionSubmissionKind,
  mapLegacyTypeToServer,
  normalizeServerQuestionType,
  serverQuestionTypeHasOptions,
  SUPPORTED_SERVER_TYPES
} from '../../../shared/questionTypeRegistry.js'
import { sanitizeWritableQuestionDtos } from '../../../shared/survey.contract.js'
const SUPPORTED_SERVER_TYPE_SET = new Set(SUPPORTED_SERVER_TYPES)
const LOGIC_OP_SET = new Set(['eq', 'neq', 'in', 'nin', 'includes', 'notIncludes', 'gt', 'gte', 'lt', 'lte', 'regex', 'overlap'])
const OPTION_ORDER_SET = new Set(['none', 'all', 'flip', 'firstFixed', 'lastFixed'])
const QUOTA_MODE_SET = new Set(['explicit', 'implicit'])
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isBooleanOrUndefined(value) {
  return value === undefined || typeof value === 'boolean'
}

function isFiniteInteger(value) {
  return Number.isInteger(Number(value)) && Number.isFinite(Number(value))
}

function validateVisibleWhenStructure(groups, context) {
  const label = String(context.label || 'visibleWhen')
  if (groups === undefined) return null
  if (!Array.isArray(groups)) return `${label} must be an array of condition groups`

  const currentOrder = context.questionIndex + 1
  if (groups.length > 0 && currentOrder <= 1) {
    return `${label} cannot reference previous questions because this is the first question`
  }

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex]
    if (!Array.isArray(group) || group.length === 0) {
      return `${label} group ${groupIndex + 1} must contain at least one condition`
    }

    for (let conditionIndex = 0; conditionIndex < group.length; conditionIndex += 1) {
      const condition = group[conditionIndex]
      if (!isPlainObject(condition)) {
        return `${label} group ${groupIndex + 1} condition ${conditionIndex + 1} must be an object`
      }

      const qid = Number(condition.qid)
      if (!Number.isInteger(qid) || qid < 1 || qid >= currentOrder) {
        return `${label} group ${groupIndex + 1} condition ${conditionIndex + 1} must reference a previous question`
      }

      const depQuestion = context.questions[qid - 1]
      if (!depQuestion) {
        return `${label} group ${groupIndex + 1} condition ${conditionIndex + 1} references a missing question`
      }

      const op = String(condition.op || '')
      if (!LOGIC_OP_SET.has(op)) {
        return `${label} group ${groupIndex + 1} condition ${conditionIndex + 1} uses an unsupported operator`
      }

      const { value } = condition
      if ((op === 'in' || op === 'nin' || op === 'overlap') && !Array.isArray(value)) {
        return `${label} group ${groupIndex + 1} condition ${conditionIndex + 1} requires an array value`
      }
      if (op === 'regex' && typeof value !== 'string') {
        return `${label} group ${groupIndex + 1} condition ${conditionIndex + 1} requires a string regex`
      }

      const depOptions = Array.isArray(depQuestion.options) ? depQuestion.options : []
      if (depOptions.length > 0) {
        const optionValues = new Set(depOptions.map(option => String(option.value)))
        const values = Array.isArray(value) ? value : [value]
        const invalidOptionValue = values.some(item => !optionValues.has(String(item)))
        if (invalidOptionValue) {
          return `${label} group ${groupIndex + 1} condition ${conditionIndex + 1} contains an invalid option value`
        }
      }
    }
  }

  return null
}

function validateJumpTarget(target, context) {
  const label = String(context.label || 'jump target')
  const raw = String(target || '').trim()
  if (!raw) return `${label} is required`
  if (raw === 'end' || raw === 'invalid') return null
  if (!/^\d+$/.test(raw)) return `${label} must be a later question, "end", or "invalid"`

  const questionOrder = context.questionIndex + 1
  const numeric = Number(raw)
  if (numeric <= questionOrder) return `${label} must be later than the current question`
  if (numeric > context.totalQuestions) return `${label} exceeds the total question count`
  return null
}

function validateJumpLogic(question, questionIndex, totalQuestions) {
  if (question.jumpLogic === undefined) return null
  if (!isPlainObject(question.jumpLogic)) return `Question ${questionIndex + 1} jumpLogic must be an object`

  const { byOption, unconditional } = question.jumpLogic
  const hasByOption = byOption !== undefined
  const hasUnconditional = unconditional !== undefined

  if (!hasByOption && !hasUnconditional) {
    return `Question ${questionIndex + 1} jumpLogic must define at least one target`
  }

  const context = { questionIndex, totalQuestions }
  if (hasByOption) {
    if (!isPlainObject(byOption)) return `Question ${questionIndex + 1} jumpLogic.byOption must be an object`
    if (!(question.type === 'radio' || question.type === 'checkbox')) {
      return `Question ${questionIndex + 1} jumpLogic.byOption is only supported for choice questions`
    }

    const optionValues = new Set((question.options || []).map(option => String(option.value)))
    for (const [optionValue, target] of Object.entries(byOption)) {
      if (!optionValues.has(String(optionValue))) {
        return `Question ${questionIndex + 1} jumpLogic.byOption contains an invalid option`
      }
      const error = validateJumpTarget(target, {
        ...context,
        label: `jumpLogic.byOption[${optionValue}]`
      })
      if (error) return `Question ${questionIndex + 1} ${error}`
    }
  }

  if (hasUnconditional) {
    const error = validateJumpTarget(unconditional, {
      ...context,
      label: 'jumpLogic.unconditional'
    })
    if (error) return `Question ${questionIndex + 1} ${error}`
  }

  return null
}

function validateOptionGroups(question, questionIndex) {
  if (question.optionGroups === undefined) return null
  if (!Array.isArray(question.optionGroups)) return `Question ${questionIndex + 1} optionGroups must be an array`
  if (!serverQuestionTypeHasOptions(question.type)) {
    return `Question ${questionIndex + 1} optionGroups is only supported for option questions`
  }

  const optionCount = Array.isArray(question.options) ? question.options.length : 0
  const occupied = new Set()

  for (let groupIndex = 0; groupIndex < question.optionGroups.length; groupIndex += 1) {
    const group = question.optionGroups[groupIndex]
    if (!isPlainObject(group)) return `Question ${questionIndex + 1} optionGroups[${groupIndex + 1}] must be an object`

    const from = Number(group.from)
    const to = Number(group.to)
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > optionCount) {
      return `Question ${questionIndex + 1} optionGroups[${groupIndex + 1}] has an invalid range`
    }

    for (let optionIndex = from; optionIndex <= to; optionIndex += 1) {
      if (occupied.has(optionIndex)) {
        return `Question ${questionIndex + 1} optionGroups[${groupIndex + 1}] overlaps another group`
      }
      occupied.add(optionIndex)
    }
  }

  return null
}

function validateQuestionOptionMetadata(question, questionIndex, questions) {
  if (question.optionOrder !== undefined && !OPTION_ORDER_SET.has(String(question.optionOrder))) {
    return `Question ${questionIndex + 1} optionOrder is invalid`
  }
  if (!isBooleanOrUndefined(question.hideSystemNumber)) {
    return `Question ${questionIndex + 1} hideSystemNumber must be boolean`
  }
  if (!isBooleanOrUndefined(question.autoSelectOnAppear)) {
    return `Question ${questionIndex + 1} autoSelectOnAppear must be boolean`
  }
  if (question.autoSelectOnAppear && !(question.type === 'radio' || question.type === 'checkbox')) {
    return `Question ${questionIndex + 1} autoSelectOnAppear is only supported for choice questions`
  }
  if (!isBooleanOrUndefined(question.quotasEnabled)) {
    return `Question ${questionIndex + 1} quotasEnabled must be boolean`
  }
  if (question.quotaMode !== undefined && !QUOTA_MODE_SET.has(String(question.quotaMode))) {
    return `Question ${questionIndex + 1} quotaMode is invalid`
  }
  if (!isBooleanOrUndefined(question.quotaShowRemaining)) {
    return `Question ${questionIndex + 1} quotaShowRemaining must be boolean`
  }
  if (question.quotaFullText !== undefined && typeof question.quotaFullText !== 'string') {
    return `Question ${questionIndex + 1} quotaFullText must be a string`
  }
  if (question.quotasEnabled && !serverQuestionTypeHasOptions(question.type)) {
    return `Question ${questionIndex + 1} quotas are only supported for option questions`
  }

  const logicError = validateVisibleWhenStructure(question?.logic?.visibleWhen, {
    questionIndex,
    questions,
    label: `Question ${questionIndex + 1} logic.visibleWhen`
  })
  if (logicError) return logicError

  const jumpError = validateJumpLogic(question, questionIndex, questions.length)
  if (jumpError) return jumpError

  const groupError = validateOptionGroups(question, questionIndex)
  if (groupError) return groupError

  const options = Array.isArray(question.options) ? question.options : []
  for (let optionIndex = 0; optionIndex < options.length; optionIndex += 1) {
    const option = options[optionIndex]
    if (!isBooleanOrUndefined(option.hidden)) {
      return `Question ${questionIndex + 1} option ${optionIndex + 1} hidden must be boolean`
    }
    if (!isBooleanOrUndefined(option.exclusive)) {
      return `Question ${questionIndex + 1} option ${optionIndex + 1} exclusive must be boolean`
    }
    if (!isBooleanOrUndefined(option.defaultSelected)) {
      return `Question ${questionIndex + 1} option ${optionIndex + 1} defaultSelected must be boolean`
    }
    if (!isBooleanOrUndefined(option.quotaEnabled)) {
      return `Question ${questionIndex + 1} option ${optionIndex + 1} quotaEnabled must be boolean`
    }
    if (!isBooleanOrUndefined(option.fillEnabled)) {
      return `Question ${questionIndex + 1} option ${optionIndex + 1} fillEnabled must be boolean`
    }
    if (!isBooleanOrUndefined(option.fillRequired)) {
      return `Question ${questionIndex + 1} option ${optionIndex + 1} fillRequired must be boolean`
    }
    if (option.fillPlaceholder !== undefined && typeof option.fillPlaceholder !== 'string') {
      return `Question ${questionIndex + 1} option ${optionIndex + 1} fillPlaceholder must be a string`
    }

    if (option.quotaLimit !== undefined) {
      const quotaLimit = Number(option.quotaLimit)
      if (!Number.isFinite(quotaLimit) || quotaLimit < 0) {
        return `Question ${questionIndex + 1} option ${optionIndex + 1} quotaLimit must be a non-negative number`
      }
    }

    const optionLogicError = validateVisibleWhenStructure(option.visibleWhen, {
      questionIndex,
      questions,
      label: `Question ${questionIndex + 1} option ${optionIndex + 1} visibleWhen`
    })
    if (optionLogicError) return optionLogicError
  }

  return null
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
  const writableQuestions = sanitizeWritableQuestionDtos(questions)

  return writableQuestions.map((question, index) => {
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

    const metadataError = validateQuestionOptionMetadata(question, index, normalizedQuestions)
    if (metadataError) {
      return { normalizedQuestions, error: metadataError }
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
