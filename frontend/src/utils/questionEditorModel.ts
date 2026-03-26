import {
  IMPLEMENTED_LEGACY_QUESTION_TYPES,
  getLegacyQuestionDefaultOptions,
  getLegacyQuestionDraftConfig,
  getLegacyQuestionTypeLabel,
  isImplementedLegacyQuestionType,
  legacyQuestionMatchesServerType
} from '@/utils/questionTypeRegistry'

export interface EditorLegacyQuestionDraft {
  id: string
  type: number
  title: string
  required: boolean
  options?: string[]
  optionOrder?: 'none' | 'all' | 'flip' | 'firstFixed' | 'lastFixed'
  hideSystemNumber?: boolean
  validation?: Record<string, unknown>
  upload?: { maxFiles?: number; maxSizeMb?: number; accept?: string }
  matrix?: { rows?: string[]; selectionType?: 'single' | 'multiple' }
}

export function isLegacyQuestionOfServerType(type: number | string, serverType: string): boolean {
  return legacyQuestionMatchesServerType(type, serverType)
}

export function buildLegacyQuestionDraft(
  type: number,
  options: {
    id: string
    hideSystemNumber?: boolean
  }
): EditorLegacyQuestionDraft {
  const question: EditorLegacyQuestionDraft = {
    id: options.id,
    type,
    title: '',
    required: false,
    options: getLegacyQuestionDefaultOptions(type),
    optionOrder: 'none',
    hideSystemNumber: !!options.hideSystemNumber
  }

  const draftConfig = getLegacyQuestionDraftConfig<{
    validation?: Record<string, unknown>
    upload?: { maxFiles?: number; maxSizeMb?: number; accept?: string }
    matrix?: { rows?: string[]; selectionType?: 'single' | 'multiple' }
  }>(type)

  if (draftConfig?.validation) {
    question.validation = { ...draftConfig.validation }
  }
  if (draftConfig?.upload) {
    question.upload = { ...draftConfig.upload }
  }
  if (draftConfig?.matrix) {
    question.matrix = {
      ...draftConfig.matrix,
      rows: Array.isArray(draftConfig.matrix.rows) ? [...draftConfig.matrix.rows] : []
    }
  }

  return question
}

export function getLegacyQuestionEditorConfig(type: number | string) {
  return {
    implemented: isImplementedLegacyQuestionType(type),
    name: getLegacyQuestionTypeLabel(type)
  }
}

export function getImplementedLegacyQuestionNames() {
  return Array.from(IMPLEMENTED_LEGACY_QUESTION_TYPES)
    .sort((a, b) => a - b)
    .map(type => `- ${getLegacyQuestionTypeLabel(type)}`)
    .join('\n')
}

export function getLegacyQuestionOptionSuffix(type: number | string, index: number): string {
  const numericType = Number(type)
  if (numericType === 3 || numericType === 4) {
    return String.fromCharCode(65 + index)
  }
  return `${index + 1}`
}
