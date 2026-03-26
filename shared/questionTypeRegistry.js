const SERVER_QUESTION_TYPE_DEFINITIONS = [
  { type: 'input', label: '填空题', hasOptions: false, analyticsKind: 'text', submissionKind: 'text' },
  { type: 'textarea', label: '简答题', hasOptions: false, analyticsKind: 'text', submissionKind: 'text' },
  { type: 'radio', label: '单选题', hasOptions: true, analyticsKind: 'choice', submissionKind: 'single_option' },
  { type: 'checkbox', label: '多选题', hasOptions: true, analyticsKind: 'choice', submissionKind: 'multi_option' },
  { type: 'date', label: '日期题', hasOptions: false, analyticsKind: 'text', submissionKind: 'text' },
  { type: 'slider', label: '滑动条题', hasOptions: false, analyticsKind: 'metric', submissionKind: 'numeric' },
  { type: 'ranking', label: '排序题', hasOptions: true, analyticsKind: 'choice', submissionKind: 'multi_option' },
  { type: 'upload', label: '文件上传题', hasOptions: false, analyticsKind: 'files', submissionKind: 'file_list' },
  { type: 'rating', label: '评分题', hasOptions: false, analyticsKind: 'rating', submissionKind: 'bounded_numeric' },
  { type: 'scale', label: '量表题', hasOptions: false, analyticsKind: 'rating', submissionKind: 'bounded_numeric' },
  { type: 'matrix', label: '矩阵题', hasOptions: false, analyticsKind: 'matrix', submissionKind: 'matrix' },
  { type: 'ratio', label: '比重题', hasOptions: true, analyticsKind: 'ratio', submissionKind: 'ratio' }
]

const LEGACY_QUESTION_TYPE_DEFINITIONS = [
  { legacyType: 1, label: '填空题', serverType: 'input', implemented: true, defaultLegacy: true },
  { legacyType: 2, label: '简答题', serverType: 'textarea', implemented: true, defaultLegacy: true },
  { legacyType: 3, label: '单选题', serverType: 'radio', implemented: true, defaultLegacy: true, hasOptions: true, defaultOptions: ['选项1', '选项2'] },
  { legacyType: 4, label: '多选题', serverType: 'checkbox', implemented: true, defaultLegacy: true, hasOptions: true, defaultOptions: ['选项1', '选项2'] },
  { legacyType: 7, label: '下拉题', serverType: 'radio', implemented: true, hasOptions: true, renderType: 'dropdown', defaultOptions: ['选项1', '选项2'] },
  {
    legacyType: 8,
    label: '滑动条题',
    serverType: 'slider',
    implemented: true,
    defaultLegacy: true,
    configPanel: 'standalone',
    draft: { validation: { min: 0, max: 100, step: 1 } }
  },
  { legacyType: 11, label: '排序题', serverType: 'ranking', implemented: true, defaultLegacy: true, hasOptions: true, defaultOptions: ['项目1', '项目2', '项目3'] },
  {
    legacyType: 13,
    label: '文件上传',
    serverType: 'upload',
    implemented: true,
    defaultLegacy: true,
    configPanel: 'standalone',
    draft: { upload: { maxFiles: 1, maxSizeMb: 10, accept: '.jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.xlsx' } }
  },
  { legacyType: 14, label: '日期', serverType: 'date', implemented: true, defaultLegacy: true, configPanel: 'standalone' },
  { legacyType: 18, label: '段落说明', serverType: 'input', implemented: true, renderType: 'stage_explain', configPanel: 'standalone' },
  {
    legacyType: 20,
    label: '矩阵单选',
    serverType: 'matrix',
    implemented: true,
    defaultLegacy: true,
    hasOptions: true,
    defaultOptions: ['非常满意', '满意', '一般', '不满意', '非常不满意'],
    configPanel: 'matrix',
    draft: { matrix: { rows: ['服务态度', '响应速度', '专业程度'], selectionType: 'single' } }
  },
  {
    legacyType: 21,
    label: '矩阵多选',
    serverType: 'matrix',
    implemented: true,
    hasOptions: true,
    defaultOptions: ['非常满意', '满意', '一般', '不满意', '非常不满意'],
    configPanel: 'matrix',
    draft: { matrix: { rows: ['服务态度', '响应速度', '专业程度'], selectionType: 'multiple' } }
  },
  {
    legacyType: 24,
    label: '矩阵下拉',
    serverType: 'matrix',
    implemented: true,
    hasOptions: true,
    defaultOptions: ['非常满意', '满意', '一般', '不满意', '非常不满意'],
    configPanel: 'matrix',
    renderType: 'matrix_dropdown',
    draft: { matrix: { rows: ['服务态度', '响应速度', '专业程度'], selectionType: 'single' } }
  },
  {
    legacyType: 29,
    label: '星级题',
    serverType: 'rating',
    implemented: true,
    defaultLegacy: true,
    configPanel: 'standalone',
    draft: { validation: { min: 1, max: 5, step: 1 } }
  },
  {
    legacyType: 30,
    label: 'NPS量表',
    serverType: 'scale',
    implemented: true,
    defaultLegacy: true,
    configPanel: 'standalone',
    draft: {
      validation: {
        min: 0,
        max: 10,
        step: 1,
        minLabel: '完全不会推荐',
        maxLabel: '一定会推荐'
      }
    }
  },
  { legacyType: 31, label: '评分单选', implemented: false, hasOptions: true, defaultOptions: ['优秀', '良好', '一般', '较差'] },
  { legacyType: 32, label: '评分多选', implemented: false, hasOptions: true, defaultOptions: ['优秀', '良好', '一般', '较差'] },
  {
    legacyType: 34,
    label: '评价题',
    serverType: 'scale',
    implemented: true,
    configPanel: 'standalone',
    draft: {
      validation: {
        min: 1,
        max: 5,
        step: 1,
        minLabel: '非常不满意',
        maxLabel: '非常满意'
      }
    }
  },
  {
    legacyType: 36,
    label: '比重题',
    serverType: 'ratio',
    implemented: true,
    defaultLegacy: true,
    hasOptions: true,
    defaultOptions: ['选项1', '选项2', '选项3']
  }
]

function freezeList(list) {
  return Object.freeze(list.map(item => Object.freeze({ ...item })))
}

function freezeRecord(record) {
  return Object.freeze({ ...record })
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue)
  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneValue(value[key])
      return result
    }, {})
  }
  return value
}

function buildRecord(entries, keySelector, valueSelector) {
  return entries.reduce((record, entry) => {
    record[keySelector(entry)] = valueSelector(entry)
    return record
  }, {})
}

function buildDefaultLegacyMap(entries) {
  return entries.reduce((record, entry) => {
    if (!entry.serverType || !entry.defaultLegacy) return record
    record[entry.serverType] = entry.legacyType
    return record
  }, {})
}

const SERVER_QUESTION_TYPE_SET = new Set()
const serverQuestionTypeLabels = {}
const serverQuestionTypeAnalyticsKinds = {}
const serverQuestionTypeSubmissionKinds = {}
const SERVER_OPTION_TYPES = []

for (const definition of SERVER_QUESTION_TYPE_DEFINITIONS) {
  SERVER_QUESTION_TYPE_SET.add(definition.type)
  serverQuestionTypeLabels[definition.type] = definition.label
  serverQuestionTypeAnalyticsKinds[definition.type] = definition.analyticsKind || 'other'
  serverQuestionTypeSubmissionKinds[definition.type] = definition.submissionKind || 'other'
  if (definition.hasOptions) SERVER_OPTION_TYPES.push(definition.type)
}

const LEGACY_QUESTION_TYPE_MAP = new Map()
const LEGACY_TO_SERVER_TYPE = {}
const legacyQuestionTypeLabels = {}
const IMPLEMENTED_LEGACY_TYPES = []

for (const definition of LEGACY_QUESTION_TYPE_DEFINITIONS) {
  LEGACY_QUESTION_TYPE_MAP.set(definition.legacyType, definition)
  legacyQuestionTypeLabels[definition.legacyType] = definition.label
  if (definition.serverType) {
    LEGACY_TO_SERVER_TYPE[definition.legacyType] = definition.serverType
  }
  if (definition.implemented) {
    IMPLEMENTED_LEGACY_TYPES.push(definition.legacyType)
  }
}

export const SERVER_QUESTION_TYPES = freezeList(SERVER_QUESTION_TYPE_DEFINITIONS)
export const LEGACY_QUESTION_TYPES = freezeList(LEGACY_QUESTION_TYPE_DEFINITIONS)
export const SUPPORTED_SERVER_TYPES = Object.freeze(Array.from(SERVER_QUESTION_TYPE_SET))
export const OPTION_SERVER_TYPES = Object.freeze(SERVER_OPTION_TYPES.slice())
export const LEGACY_TO_SERVER_TYPE_MAP = freezeRecord(LEGACY_TO_SERVER_TYPE)
export const SERVER_TO_LEGACY_TYPE_MAP = freezeRecord(buildDefaultLegacyMap(LEGACY_QUESTION_TYPE_DEFINITIONS))
export const SERVER_QUESTION_TYPE_LABELS = freezeRecord(serverQuestionTypeLabels)
export const SERVER_QUESTION_TYPE_ANALYTICS_KINDS = freezeRecord(serverQuestionTypeAnalyticsKinds)
export const SERVER_QUESTION_TYPE_SUBMISSION_KINDS = freezeRecord(serverQuestionTypeSubmissionKinds)
export const LEGACY_QUESTION_TYPE_LABELS = freezeRecord(legacyQuestionTypeLabels)
export const IMPLEMENTED_LEGACY_QUESTION_TYPES = Object.freeze(IMPLEMENTED_LEGACY_TYPES.slice())
export const LEGACY_QUESTION_RENDER_TYPES = freezeRecord(buildRecord(
  LEGACY_QUESTION_TYPE_DEFINITIONS.filter(entry => entry.renderType),
  entry => entry.legacyType,
  entry => entry.renderType
))

export function getLegacyQuestionTypeDefinition(type) {
  return LEGACY_QUESTION_TYPE_MAP.get(Number(type)) || null
}

export function getServerQuestionTypeDefinition(type) {
  const normalizedType = normalizeServerQuestionType(type)
  return SERVER_QUESTION_TYPE_DEFINITIONS.find(definition => definition.type === normalizedType) || null
}

export function mapLegacyTypeToServer(type) {
  return LEGACY_TO_SERVER_TYPE_MAP[Number(type)] || 'input'
}

export function normalizeServerQuestionType(type) {
  const rawType = String(type || 'input')
  if (rawType === 'dropdown') return 'radio'
  return SERVER_QUESTION_TYPE_SET.has(rawType) ? rawType : 'input'
}

export function mapServerTypeToLegacy(type, uiType) {
  const numericUiType = Number(uiType)
  if (Number.isFinite(numericUiType) && numericUiType > 0) {
    return numericUiType
  }

  return SERVER_TO_LEGACY_TYPE_MAP[normalizeServerQuestionType(type)] || 1
}

export function isImplementedLegacyQuestionType(type) {
  const definition = getLegacyQuestionTypeDefinition(type)
  return Boolean(definition?.implemented)
}

export function getLegacyQuestionTypeLabel(type) {
  return LEGACY_QUESTION_TYPE_LABELS[Number(type)] || `题型${type}`
}

export function getServerQuestionTypeLabel(type) {
  return SERVER_QUESTION_TYPE_LABELS[normalizeServerQuestionType(type)] || '其他'
}

export function getServerQuestionAnalyticsKind(type) {
  return SERVER_QUESTION_TYPE_ANALYTICS_KINDS[normalizeServerQuestionType(type)] || 'other'
}

export function getServerQuestionSubmissionKind(type) {
  return SERVER_QUESTION_TYPE_SUBMISSION_KINDS[normalizeServerQuestionType(type)] || 'other'
}

export function legacyQuestionTypeHasOptions(type) {
  const definition = getLegacyQuestionTypeDefinition(type)
  return Boolean(definition?.hasOptions)
}

export function serverQuestionTypeHasOptions(type) {
  return OPTION_SERVER_TYPES.includes(normalizeServerQuestionType(type))
}

export function getLegacyQuestionDefaultOptions(type) {
  const definition = getLegacyQuestionTypeDefinition(type)
  return Array.isArray(definition?.defaultOptions) ? definition.defaultOptions.slice() : undefined
}

export function getLegacyQuestionConfigPanel(type) {
  const definition = getLegacyQuestionTypeDefinition(type)
  return definition?.configPanel || 'default'
}

export function legacyQuestionUsesStandaloneConfig(type) {
  return getLegacyQuestionConfigPanel(type) === 'standalone'
}

export function legacyQuestionUsesMatrixConfig(type) {
  return getLegacyQuestionConfigPanel(type) === 'matrix'
}

export function legacyQuestionMatchesServerType(type, serverType) {
  return mapLegacyTypeToServer(type) === normalizeServerQuestionType(serverType)
}

export function getLegacyQuestionDraftConfig(type) {
  const definition = getLegacyQuestionTypeDefinition(type)
  return definition?.draft ? cloneValue(definition.draft) : null
}

export function getQuestionRenderType(question) {
  const rawType = String(question?.type || '')
  if (rawType === 'dropdown' || rawType === 'stage_explain') {
    return rawType
  }

  const definition = getLegacyQuestionTypeDefinition(question?.uiType)
  if (definition?.renderType) {
    return definition.renderType
  }

  return normalizeServerQuestionType(rawType)
}
