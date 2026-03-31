import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSurvey as getSurveyRaw, getResults as getSurveyDetailStats } from '@/api/surveys'
import { generateQuestionId as generateQuestionIdUtil } from '@/utils/uid'
import { mapLegacyTypeToServer, mapServerTypeToLegacy } from '@/mappers/surveyMappers'
import {
  getLegacyQuestionConfigPanel,
  getLegacyQuestionTypeLabel,
  legacyQuestionTypeHasOptions,
  serverQuestionTypeHasOptions
} from '@/utils/questionTypeRegistry'
import { buildUploadQuestionHelpText, DEFAULT_UPLOAD_ACCEPT, normalizeUploadQuestionConfig, sanitizeUploadAccept } from '@/utils/uploadQuestion'
import {
  buildLegacyQuestionDraft,
  getImplementedLegacyQuestionNames as getImplementedLegacyQuestionNamesFromEditorModel,
  getLegacyQuestionEditorConfig,
  getLegacyQuestionOptionSuffix,
  isLegacyQuestionOfServerType
} from '@/utils/questionEditorModel'
import { formatAiSurveyIssues, isLikelyAiJsonInput, parseAiSurveyInput } from '@/utils/aiSurveySchema'
import type { QuestionBankQuestionDTO, QuestionBankQuestionFormDTO } from '../../../../shared/management.contract.js'
import type {
  QuestionJumpLogicDTO,
  QuestionLogicDTO,
  QuestionOptionGroupDTO,
  QuestionQuotaModeDTO,
  VisibleWhenDTO
} from '../../../../shared/survey.contract.js'

export interface SurveyEditorOptionExtra {
  quotaLimit: number
  quotaEnabled: boolean
  rich: boolean
  hasDesc: boolean
  desc: string
  exclusive: boolean
  defaultSelected: boolean
  hidden: boolean
  fillEnabled: boolean
  fillRequired: boolean
  fillPlaceholder: string
}

export interface SurveyEditorQuestion {
  id: string
  type: number
  uiType?: number
  title: string
  titleHtml?: string
  description?: string
  required: boolean
  options?: string[]
  matrix?: {
    rows?: string[]
    selectionType?: 'single' | 'multiple'
  }
  optionOrder?: 'none' | 'all' | 'flip' | 'firstFixed' | 'lastFixed'
  hideSystemNumber?: boolean
  validation?: Record<string, unknown>
  upload?: {
    maxFiles?: number
    maxSizeMb?: number
    accept?: string
  }
  logic?: QuestionLogicDTO
  jumpLogic?: QuestionJumpLogicDTO
  optionGroups?: QuestionOptionGroupDTO[]
  quotasEnabled?: boolean
  quotaMode?: QuestionQuotaModeDTO
  quotaShowRemaining?: boolean
  quotaFullText?: string
  groupOrderRandom?: boolean
  groupFillRandom?: boolean
  autoSelectOnAppear?: boolean
  optionLogic?: Array<VisibleWhenDTO | undefined>
  optionExtras?: SurveyEditorOptionExtra[]
  examConfig?: {
    score?: number
    correctAnswer?: unknown
  }
  placeholder?: string
  [key: string]: unknown
}

export interface SurveyEditorForm {
  title: string
  description: string
  type: 'normal' | 'anonymous' | 'limited'
  endTime: string
  settings: {
    allowMultipleSubmissions: boolean
    showProgress: boolean
    randomizeQuestions: boolean
    collectIP: boolean
    submitOnce: boolean
  }
  questions: SurveyEditorQuestion[]
}

export interface QuestionBankExportMetadata {
  tags?: string[]
  knowledgePoints?: string[]
  applicableScenes?: string[]
  aiMeta?: Record<string, unknown>
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneJsonValue<T>(value: T): T {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(item => cloneJsonValue(item)) as T
  if (isPlainObject(value)) {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneJsonValue((value as Record<string, any>)[key])
      return result
    }, {} as Record<string, any>) as T
  }
  return value
}

export function useEditorCore() {
  const router = useRouter()
  const route = useRoute()

  const saving = ref(false)
  const panelTab = ref<'types' | 'repo' | 'outline'>('types')

  const draggingIndex = ref<number | null>(null)
  const dragOverIndex = ref<number | 'end' | null>(null)
  const dragOverPos = ref<'before' | 'after'>('after')
  const outlineListEl = ref<HTMLElement | null>(null)
  const showOutlineTip = ref(true)
  const renamingIndex = ref<number | null>(null)
  const renameText = ref('')
  const renameInputEl = ref<HTMLInputElement | null>(null)
  const editingIndex = ref(-1)

  const currentTab = ref<'edit' | 'preview' | 'settings' | 'share' | 'answers'>('edit')
  const showAIHelper = ref(false)
  const showHeaderSettings = ref(false)
  const aiPrompt = ref('')

  const answerStats = reactive({
    total: 0,
    today: 0,
    avgScore: 0
  })

  const categoryExpanded = reactive({
    choice: true,
    fillblank: true,
    paging: true,
    matrix: true,
    rating: true,
    advanced: true
  })

  const surveyForm = reactive<SurveyEditorForm>({
    title: '',
    description: '',
    type: 'normal',
    endTime: '',
    settings: {
      allowMultipleSubmissions: false,
      showProgress: true,
      randomizeQuestions: false,
      collectIP: false,
      submitOnce: true
    },
    questions: []
  })

  const shareId = ref('')
  const currentSurveyId = ref('')
  const errors = reactive({ title: '' })

  const canPreview = computed(() => surveyForm.title.trim() !== '' && surveyForm.questions.length > 0)
  const canPublish = computed(() => canPreview.value && !Object.values(errors).some(error => error !== ''))
  const areAllNumbersHidden = computed(() => surveyForm.questions.length > 0 && surveyForm.questions.every(question => question.hideSystemNumber))
  const computedShareLink = computed(() => {
    const host = location?.origin || ''
    const code = shareId.value.trim()
    return /^\d{9}$/.test(code) ? `${host}/s/${code}` : ''
  })

  function onOutlineDragStart(index: number, event: DragEvent) {
    draggingIndex.value = index
    dragOverIndex.value = null
    try {
      event.dataTransfer?.setData('text/plain', String(index))
    } catch {}
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  function onOutlineDragOver(index: number | 'end', event: DragEvent) {
    if (draggingIndex.value == null) return
    dragOverIndex.value = index
    if (typeof index === 'number') {
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      dragOverPos.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    } else {
      dragOverPos.value = 'after'
    }
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'

    const host = outlineListEl.value
    if (!host) return
    const bounds = host.getBoundingClientRect()
    const margin = 30
    const speed = 8
    if (event.clientY < bounds.top + margin) host.scrollTop -= speed
    if (event.clientY > bounds.bottom - margin) host.scrollTop += speed
  }

  function onOutlineDrop(index: number | 'end') {
    const from = draggingIndex.value
    if (from == null) return
    let to = index === 'end' ? surveyForm.questions.length : Number(index)
    if (!Number.isFinite(to)) return

    let insertPos = to
    if (index !== 'end') insertPos = dragOverPos.value === 'before' ? to : to + 1
    if (insertPos === from || insertPos === from + 1) {
      draggingIndex.value = null
      dragOverIndex.value = null
      return
    }

    const list = [...surveyForm.questions]
    const [moved] = list.splice(from, 1)
    const adjustedPos = insertPos > from ? insertPos - 1 : insertPos
    list.splice(adjustedPos, 0, moved)
    surveyForm.questions.splice(0, surveyForm.questions.length, ...list)

    if (editingIndex.value === from) editingIndex.value = adjustedPos
    else if (editingIndex.value > from && editingIndex.value <= adjustedPos) editingIndex.value -= 1
    else if (editingIndex.value < from && editingIndex.value >= adjustedPos) editingIndex.value += 1

    draggingIndex.value = null
    dragOverIndex.value = null
    showOutlineTip.value = false
  }

  function onOutlineDragEnd() {
    draggingIndex.value = null
    dragOverIndex.value = null
  }

  function startRename(index: number, question: SurveyEditorQuestion) {
    renamingIndex.value = index
    renameText.value = String(question?.title || '')
    nextTick(() => renameInputEl.value?.focus())
  }

  function confirmRename() {
    const index = renamingIndex.value
    if (index == null) return
    const title = renameText.value.trim()
    if (title) surveyForm.questions[index].title = title
    renamingIndex.value = null
  }

  function closeQuestionEdit() {
    editingIndex.value = -1
  }

  function copyShareLink() {
    navigator.clipboard?.writeText(computedShareLink.value)
  }

  function validateForm() {
    errors.title = ''
    if (!surveyForm.title.trim()) errors.title = '请输入问卷标题'
    else if (surveyForm.title.length > 100) errors.title = '标题不能超过100个字符'
  }

  function getQuestionTypeLabel(type: number | string): string {
    return getLegacyQuestionTypeLabel(type)
  }

  function goBack() {
    try {
      router.back()
    } catch {
      router.push({ name: 'SurveyList' })
    }
  }

  function getQuestionConfig(type: number) {
    return getLegacyQuestionEditorConfig(type)
  }

  function isStandaloneConfigType(type: number): boolean {
    return getLegacyQuestionConfigPanel(type) === 'standalone'
  }

  function isMatrixLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'matrix')
  }

  function isSliderLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'slider')
  }

  function isUploadLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'upload')
  }

  function isRatingLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'rating')
  }

  function isScaleLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'scale')
  }

  const generateQuestionId = (): string => generateQuestionIdUtil('q')

  function buildLegacyQuestion(type: number): SurveyEditorQuestion {
    return buildLegacyQuestionDraft(type, {
      id: generateQuestionId(),
      hideSystemNumber: areAllNumbersHidden.value
    }) as SurveyEditorQuestion
  }

  function createDefaultQuestion(type: number): SurveyEditorQuestion {
    return buildLegacyQuestion(type)
  }

  function buildEditorQuestionFromServerQuestion(question: any): SurveyEditorQuestion {
    return {
      id: question.id ? String(question.id) : generateQuestionId(),
      type: mapServerTypeToLegacy(question.type || 'input', question.uiType),
      uiType: question.uiType == null ? undefined : Number(question.uiType),
      title: question.title || '',
      ...(question.titleHtml ? { titleHtml: question.titleHtml } : {}),
      description: question.description || '',
      required: !!question.required,
      validation: question.validation || undefined,
      matrix: question.matrix
        ? {
            rows: Array.isArray(question.matrix.rows) ? question.matrix.rows.map((row: any) => row.label ?? String(row)) : [],
            selectionType: question.matrix.selectionType === 'multiple' ? 'multiple' : 'single'
          }
        : undefined,
      hideSystemNumber: !!question.hideSystemNumber,
      quotasEnabled: !!question.quotasEnabled,
      quotaMode: (question as any).quotaMode || 'explicit',
      quotaFullText: (question as any).quotaFullText || '名额已满',
      quotaShowRemaining: !!(question as any).quotaShowRemaining,
      options: Array.isArray(question.options) ? question.options.map((option: any) => option.label ?? String(option)) : undefined,
      optionOrder: (question.optionOrder as any) || 'none',
      optionGroups: Array.isArray(question.optionGroups)
        ? question.optionGroups
            .map((group: any) => ({
              name: String(group?.name ?? ''),
              from: Number(group?.from ?? NaN),
              to: Number(group?.to ?? NaN),
              random: !!group?.random
            }))
            .filter((group: any) => Number.isFinite(group.from) && Number.isFinite(group.to) && group.from >= 1 && group.to >= group.from)
        : [],
      groupOrderRandom: !!question.groupOrderRandom,
      autoSelectOnAppear: !!question.autoSelectOnAppear,
      jumpLogic: question.jumpLogic,
      optionLogic: [],
      optionExtras: Array.isArray(question.options)
        ? question.options.map((option: any) => ({
            quotaLimit: Number(option.quotaLimit || 0),
            quotaEnabled: option.quotaEnabled !== false,
            rich: !!option.rich,
            hasDesc: !!option.desc,
            desc: option.desc || '',
            exclusive: !!option.exclusive,
            defaultSelected: !!option.defaultSelected,
            hidden: !!option.hidden,
            fillEnabled: !!option.fillEnabled,
            fillRequired: !!option.fillRequired,
            fillPlaceholder: option.fillPlaceholder || ''
          }))
        : [],
      examConfig: isPlainObject(question.examConfig)
        ? {
            score: Number(question.examConfig.score || 0),
            correctAnswer: cloneJsonValue(question.examConfig.correctAnswer)
          }
        : undefined
    }
  }

  function buildEditorQuestionFromQuestionBank(question: QuestionBankQuestionDTO): SurveyEditorQuestion {
    const content = question.content
    const surveyQuestion = content && isPlainObject(content.surveyQuestion) ? content.surveyQuestion : null

    if (surveyQuestion) {
      const importedQuestion = buildEditorQuestionFromServerQuestion({
        ...surveyQuestion,
        title: String(surveyQuestion.title || question.stem || question.title || ''),
        description: String(surveyQuestion.description || question.analysis || '')
      })

      if ((!Array.isArray(importedQuestion.options) || importedQuestion.options.length === 0) && Array.isArray(question.options)) {
        importedQuestion.options = question.options
          .map(option => String(option?.label ?? option?.text ?? option?.value ?? '').trim())
          .filter(Boolean)
      }

      if (!importedQuestion.examConfig && (question.score != null || question.correctAnswer !== undefined)) {
        importedQuestion.examConfig = {
          score: Number(question.score || 0),
          correctAnswer: cloneJsonValue(question.correctAnswer)
        }
      }

      importedQuestion.id = generateQuestionId()
      importedQuestion.hideSystemNumber = areAllNumbersHidden.value
      return importedQuestion
    }

    const type = mapServerTypeToLegacy(question.content?.questionType || question.type || 'input')
    const importedQuestion = buildLegacyQuestion(type)
    importedQuestion.title = String(question.stem || question.title || '').trim() || getQuestionTypeLabel(type)
    if (question.analysis) importedQuestion.description = String(question.analysis)
    if (Array.isArray(question.options)) {
      importedQuestion.options = question.options
        .map(option => String(option?.label ?? option?.text ?? option?.value ?? '').trim())
        .filter(Boolean)
    }
    if (question.score != null || question.correctAnswer !== undefined) {
      importedQuestion.examConfig = {
        score: Number(question.score || 0),
        correctAnswer: cloneJsonValue(question.correctAnswer)
      }
    }
    return importedQuestion
  }

  function importQuestionBankQuestion(question: QuestionBankQuestionDTO) {
    const importedQuestion = buildEditorQuestionFromQuestionBank(question)
    surveyForm.questions.push(importedQuestion)
    editingIndex.value = surveyForm.questions.length - 1
    currentTab.value = 'edit'
    return importedQuestion
  }

  function ensureSliderValidation(question: SurveyEditorQuestion) {
    question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
    const validation = question.validation as Record<string, number>
    const min = Number(validation.min)
    const max = Number(validation.max)
    const step = Number(validation.step)
    validation.min = Number.isFinite(min) ? min : 0
    validation.max = Number.isFinite(max) ? max : 100
    validation.step = Number.isFinite(step) && step > 0 ? step : 1
    return validation as { min: number; max: number; step: number }
  }

  function normalizeSliderValidation(question: SurveyEditorQuestion) {
    const validation = ensureSliderValidation(question)
    if (validation.max < validation.min) validation.max = validation.min
    if (validation.step <= 0) validation.step = 1
  }

  function ensureRatingValidation(question: SurveyEditorQuestion) {
    question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
    const validation = question.validation as Record<string, number>
    const min = Number(validation.min)
    const max = Number(validation.max)
    validation.min = Number.isFinite(min) ? min : 1
    validation.max = Number.isFinite(max) ? max : 5
    validation.step = 1
    return validation as { min: number; max: number; step: number }
  }

  function normalizeRatingValidation(question: SurveyEditorQuestion) {
    const validation = ensureRatingValidation(question)
    validation.min = Math.max(1, Math.min(10, Math.floor(Number(validation.min) || 1)))
    validation.max = Math.max(validation.min, Math.min(10, Math.floor(Number(validation.max) || 5)))
    validation.step = 1
  }

  function ensureScaleValidation(question: SurveyEditorQuestion) {
    question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
    const validation = question.validation as Record<string, any>
    const min = Number(validation.min)
    const max = Number(validation.max)
    const step = Number(validation.step)
    validation.min = Number.isFinite(min) ? min : 0
    validation.max = Number.isFinite(max) ? max : 10
    validation.step = Number.isFinite(step) && step > 0 ? step : 1
    if (validation.minLabel == null) validation.minLabel = '最低'
    if (validation.maxLabel == null) validation.maxLabel = '最高'
    return validation as {
      min: number
      max: number
      step: number
      minLabel?: string
      maxLabel?: string
    }
  }

  function normalizeScaleValidation(question: SurveyEditorQuestion) {
    const validation = ensureScaleValidation(question)
    validation.min = Math.max(0, Math.min(100, Math.floor(Number(validation.min) || 0)))
    validation.max = Math.max(validation.min + 1, Math.min(100, Math.floor(Number(validation.max) || 10)))
    validation.step = Math.max(1, Math.floor(Number(validation.step) || 1))
  }

  function getScalePreviewValues(question: SurveyEditorQuestion) {
    const validation = ensureScaleValidation(question)
    const values: number[] = []
    for (let value = validation.min; value <= validation.max; value += validation.step) values.push(value)
    return values
  }

  function ensureMatrixConfig(question: SurveyEditorQuestion) {
    question.matrix = question.matrix && typeof question.matrix === 'object' ? question.matrix : {}
    question.matrix.selectionType = Number(question?.type) === 21 ? 'multiple' : 'single'
    if (!Array.isArray(question.matrix.rows) || question.matrix.rows.length === 0) {
      question.matrix.rows = ['服务态度', '响应速度', '专业程度']
    }
    question.matrix.rows = question.matrix.rows.map((row: any, index: number) => {
      if (typeof row === 'string') return row
      return String(row?.label ?? row?.text ?? `维度${index + 1}`)
    })
    return question.matrix as { rows: string[]; selectionType: 'single' | 'multiple' }
  }

  function isMatrixMultipleLegacyQuestion(type: number | string) {
    return Number(type) === 21
  }

  function isMatrixDropdownLegacyQuestion(type: number | string) {
    return Number(type) === 24
  }

  function addMatrixRow(question: SurveyEditorQuestion) {
    const matrix = ensureMatrixConfig(question)
    matrix.rows.push(`维度${matrix.rows.length + 1}`)
  }

  function removeMatrixRow(question: SurveyEditorQuestion, rowIndex: number) {
    const matrix = ensureMatrixConfig(question)
    if (rowIndex < 0 || rowIndex >= matrix.rows.length) return
    matrix.rows.splice(rowIndex, 1)
  }

  function ensureUploadConfig(question: SurveyEditorQuestion) {
    const normalized = normalizeUploadQuestionConfig(question)
    question.upload = {
      maxFiles: normalized.maxFiles,
      maxSizeMb: normalized.maxSizeMb,
      accept: normalized.accept || DEFAULT_UPLOAD_ACCEPT
    }
    return question.upload as { maxFiles: number; maxSizeMb: number; accept: string }
  }

  function normalizeUploadConfig(question: SurveyEditorQuestion) {
    const upload = ensureUploadConfig(question)
    upload.maxFiles = Math.max(1, Math.min(20, Math.floor(Number(upload.maxFiles) || 1)))
    upload.maxSizeMb = Math.max(1, Math.min(10, Number(upload.maxSizeMb) || 10))
    upload.accept = sanitizeUploadAccept(upload.accept)
  }

  function uploadConfigSummary(question: SurveyEditorQuestion) {
    return buildUploadQuestionHelpText(question)
  }

  function getImplementedQuestionNames() {
    return getImplementedLegacyQuestionNamesFromEditorModel()
  }

  function addQuestionByType(type: number) {
    editingIndex.value = -1
    const config = getQuestionConfig(type)
    if (!config.implemented) {
      alert(`${config.name} 正在开发中。\n\n已实现题型：\n${getImplementedQuestionNames()}`)
      return
    }
    surveyForm.questions.push(buildLegacyQuestion(type))
    currentTab.value = 'edit'
  }

  function hasOptions(type: number): boolean {
    return legacyQuestionTypeHasOptions(type)
  }

  function getOptionLabel(type: number, index: number): string {
    return getLegacyQuestionOptionSuffix(type, index)
  }

  function addOption(question: SurveyEditorQuestion) {
    if (!Array.isArray(question.options)) question.options = []
    const nextIndex = question.options.length
    question.options.push(`选项${getOptionLabel(question.type, nextIndex)}`)
    const current = question as any
    current.optionExtras = Array.isArray(current.optionExtras) ? current.optionExtras : []
    current.optionExtras[nextIndex] = current.optionExtras[nextIndex] || {
      rich: false,
      hasDesc: false,
      desc: '',
      exclusive: false,
      defaultSelected: false,
      hidden: false
    }
  }

  function removeOption(question: SurveyEditorQuestion, optionIndex: number) {
    if (!Array.isArray(question.options)) return
    if (optionIndex < 0 || optionIndex >= question.options.length) return
    question.options.splice(optionIndex, 1)
    const current = question as any
    if (Array.isArray(current.optionExtras)) current.optionExtras.splice(optionIndex, 1)
  }

  function ensureOptionExtras(question: SurveyEditorQuestion, optionIndex: number) {
    const current = question as any
    current.optionExtras = Array.isArray(current.optionExtras) ? current.optionExtras : []
    current.optionExtras[optionIndex] = current.optionExtras[optionIndex] || {
      quotaLimit: 0,
      rich: false,
      hasDesc: false,
      desc: '',
      exclusive: false,
      defaultSelected: false,
      hidden: false,
      fillEnabled: false,
      fillRequired: false,
      fillPlaceholder: ''
    }
    return current.optionExtras[optionIndex]
  }

  function isGroupConfigured(question: SurveyEditorQuestion): boolean {
    if (!question) return false
    const hasGroups = Array.isArray(question.optionGroups) && question.optionGroups.length > 0
    const hasRandom = !!question.groupOrderRandom || !!question.groupFillRandom
    return !!(hasGroups || hasRandom)
  }

  function isScoreConfigured(question: SurveyEditorQuestion): boolean {
    const config = question?.examConfig
    return !!(config && typeof config.score === 'number' && config.score > 0)
  }

  function moveQuestionUp(index: number) {
    if (index <= 0) return
    const question = surveyForm.questions[index]
    surveyForm.questions.splice(index, 1)
    surveyForm.questions.splice(index - 1, 0, question)
    if (editingIndex.value === index) editingIndex.value = index - 1
  }

  function moveQuestionDown(index: number) {
    if (index >= surveyForm.questions.length - 1) return
    const question = surveyForm.questions[index]
    surveyForm.questions.splice(index, 1)
    surveyForm.questions.splice(index + 1, 0, question)
    if (editingIndex.value === index) editingIndex.value = index + 1
  }

  function buildAiImportedQuestion(question: {
    legacyType: number
    title: string
    required: boolean
    options?: string[]
    placeholder?: string
    description?: string
    validation?: Record<string, unknown>
  }): SurveyEditorQuestion {
    const importedQuestion = buildLegacyQuestion(question.legacyType)
    importedQuestion.title = question.title
    importedQuestion.required = question.required
    importedQuestion.hideSystemNumber = areAllNumbersHidden.value

    if (question.description) importedQuestion.description = question.description
    if (Array.isArray(question.options)) importedQuestion.options = [...question.options]
    if (question.validation) {
      importedQuestion.validation = {
        ...(importedQuestion.validation || {}),
        ...question.validation
      }
    }
    if (question.placeholder) (importedQuestion as any).placeholder = question.placeholder

    return importedQuestion
  }

  function generateByAI() {
    if (!aiPrompt.value.trim()) {
      alert('Please enter AI content or JSON first.')
      return
    }

    const parsedAiSurvey = parseAiSurveyInput(aiPrompt.value)
    if (parsedAiSurvey.success) {
      if (!surveyForm.title.trim()) surveyForm.title = parsedAiSurvey.data.title
      if (!surveyForm.description.trim() && parsedAiSurvey.data.description) {
        surveyForm.description = parsedAiSurvey.data.description
      }

      const importedQuestions = parsedAiSurvey.data.questions.map(buildAiImportedQuestion)
      surveyForm.questions.push(...importedQuestions)
      showAIHelper.value = false
      aiPrompt.value = ''
      alert(`Imported ${importedQuestions.length} questions from validated AI JSON.`)
      return
    }

    if (isLikelyAiJsonInput(aiPrompt.value)) {
      alert(`AI JSON validation failed:\n${formatAiSurveyIssues(parsedAiSurvey.issues)}`)
      return
    }

    surveyForm.questions.push(
      {
        id: generateQuestionId(),
        type: 3,
        title: '您对我们的整体服务满意度如何？',
        required: true,
        hideSystemNumber: areAllNumbersHidden.value,
        options: ['非常满意', '满意', '一般', '不满意', '非常不满意']
      },
      {
        id: generateQuestionId(),
        type: 4,
        title: '您认为我们需要改进的方面有哪些？',
        required: false,
        hideSystemNumber: areAllNumbersHidden.value,
        options: ['服务态度', '响应速度', '产品质量', '价格合理性', '其他']
      },
      {
        id: generateQuestionId(),
        type: 2,
        title: '请提出宝贵建议',
        required: false,
        hideSystemNumber: areAllNumbersHidden.value
      }
    )
    showAIHelper.value = false
    aiPrompt.value = ''
    alert('已生成示例题目，可继续编辑完善。')
  }
  function duplicateQuestion(index: number) {
    const originalQuestion = surveyForm.questions[index]
    const duplicatedQuestion = {
      ...originalQuestion,
      id: generateQuestionId(),
      title: `${originalQuestion.title}（副本）`,
      options: Array.isArray(originalQuestion.options) ? [...originalQuestion.options] : undefined,
      validation: originalQuestion.validation ? { ...originalQuestion.validation } : undefined,
      upload: originalQuestion.upload ? { ...originalQuestion.upload } : undefined,
      matrix: originalQuestion.matrix
        ? {
            rows: Array.isArray(originalQuestion.matrix.rows) ? [...originalQuestion.matrix.rows] : undefined,
            selectionType: originalQuestion.matrix.selectionType
          }
        : undefined
    }
    surveyForm.questions.splice(index + 1, 0, duplicatedQuestion)
  }

  function deleteQuestion(index: number) {
    if (!confirm('确定要删除这道题目吗？')) return
    surveyForm.questions.splice(index, 1)
  }

  function finishEdit() {
    editingIndex.value = -1
  }

  function addQuestionAfter(index: number) {
    const current = surveyForm.questions[index]
    const nextQuestion = buildLegacyQuestion(Number(current.type))
    if (isSliderLegacyQuestion(current.type)) nextQuestion.validation = { ...ensureSliderValidation(current) }
    if (isRatingLegacyQuestion(current.type)) nextQuestion.validation = { ...ensureRatingValidation(current) }
    if (isScaleLegacyQuestion(current.type)) nextQuestion.validation = { ...ensureScaleValidation(current) }
    if (isMatrixLegacyQuestion(current.type)) {
      nextQuestion.matrix = {
        rows: [...ensureMatrixConfig(current).rows],
        selectionType: ensureMatrixConfig(current).selectionType
      }
    }
    if (isUploadLegacyQuestion(current.type)) nextQuestion.upload = { ...ensureUploadConfig(current) }
    surveyForm.questions.splice(index + 1, 0, nextQuestion)
  }

  function addOptionAt(question: SurveyEditorQuestion, at: number) {
    if (!Array.isArray(question.options)) question.options = []
    question.options.splice(at, 0, `选项${question.options.length + 1}`)
    const current = question as any
    current.optionExtras = Array.isArray(current.optionExtras) ? current.optionExtras : []
    current.optionExtras.splice(at, 0, {
      rich: false,
      hasDesc: false,
      desc: '',
      exclusive: false,
      defaultSelected: false,
      hidden: false
    })
  }

  function toggleDesc(question: SurveyEditorQuestion, optionIndex: number) {
    const extra = ensureOptionExtras(question, optionIndex)
    extra.hasDesc = !extra.hasDesc
    if (!extra.hasDesc) extra.desc = ''
  }

  function toggleHidden(question: SurveyEditorQuestion, optionIndex: number) {
    const extra = ensureOptionExtras(question, optionIndex)
    if (!extra.hidden) {
      const optionLogic = question.optionLogic?.[optionIndex]
      const hasOptionLogic = Array.isArray(optionLogic) && optionLogic.length > 0
      const hasJumpByOption = !!(question?.jumpLogic?.byOption && String(question.jumpLogic.byOption[String(optionIndex + 1)] || '') !== '')
      if (hasOptionLogic || hasJumpByOption) {
        alert('该选项已配置逻辑关系，不能直接隐藏。')
        return
      }
    }
    extra.hidden = !extra.hidden
  }

  function toggleCategory(category: keyof typeof categoryExpanded) {
    categoryExpanded[category] = !categoryExpanded[category]
  }

  const hintOpenState = reactive<Record<string, boolean>>({})
  const isHintOpen = (question: SurveyEditorQuestion) => !!hintOpenState[question.id]
  const setHintOpen = (question: SurveyEditorQuestion, value: boolean) => {
    hintOpenState[question.id] = !!value
  }
  const toggleHint = (question: SurveyEditorQuestion) => setHintOpen(question, !isHintOpen(question))
  const onHintCheckboxChange = (question: SurveyEditorQuestion, event: Event) => {
    const target = event.target as HTMLInputElement
    setHintOpen(question, !!target.checked)
  }

  function buildServerQuestionPayload(
    question: SurveyEditorQuestion,
    index: number,
    options: {
      includeCrossQuestionLogic?: boolean
    } = {}
  ) {
    const includeCrossQuestionLogic = options.includeCrossQuestionLogic !== false
    const idToOrder = Object.fromEntries(surveyForm.questions.map((item, questionIndex) => [String(item.id), String(questionIndex + 1)]))
    const base: any = {
      uiType: Number((question as any).uiType ?? question.type),
      type: mapLegacyTypeToServer(question.type),
      title: question.title,
      ...(question.titleHtml ? { titleHtml: question.titleHtml } : {}),
      description: question.description,
      required: question.required,
      order: index + 1,
      hideSystemNumber: !!question.hideSystemNumber
    }

    if (question.examConfig && typeof question.examConfig === 'object') {
      const examScore = Number(question.examConfig.score || 0)
      if (Number.isFinite(examScore) || question.examConfig.correctAnswer !== undefined) {
        base.examConfig = {
          ...(Number.isFinite(examScore) ? { score: examScore } : {}),
          ...(question.examConfig.correctAnswer !== undefined
            ? { correctAnswer: cloneJsonValue(question.examConfig.correctAnswer) }
            : {})
        }
      }
    }

    if (question.validation && typeof question.validation === 'object') {
      base.validation = { ...question.validation }
    }

    const isOptionType = ['radio', 'checkbox', 'ranking', 'matrix', 'ratio'].includes(base.type)
    if (isOptionType) {
      base.options = (question.options || []).map((label, optionIndex) => {
        const extra: any = (question as any).optionExtras?.[optionIndex] || {}
        return {
          label,
          value: String(optionIndex + 1),
          order: optionIndex + 1,
          quotaLimit: Number(extra.quotaLimit || 0),
          quotaEnabled: extra.quotaEnabled !== false,
          rich: !!extra.rich,
          desc: extra.hasDesc ? extra.desc || '' : '',
          exclusive: !!extra.exclusive,
          defaultSelected: !!extra.defaultSelected,
          hidden: !!extra.hidden,
          fillEnabled: !!extra.fillEnabled,
          fillRequired: !!extra.fillRequired,
          fillPlaceholder: extra.fillPlaceholder || ''
        }
      })
      base.optionOrder = question.optionOrder || 'none'

      if (Array.isArray((question as any).optionGroups) && (question as any).optionGroups.length > 0) {
        base.optionGroups = (question as any).optionGroups
          .map((group: any) => ({
            name: String(group?.name ?? ''),
            from: Number(group?.from ?? NaN),
            to: Number(group?.to ?? NaN),
            random: !!group?.random
          }))
          .filter((group: any) => Number.isFinite(group.from) && Number.isFinite(group.to) && group.from >= 1 && group.to >= group.from)
      }
      if ((question as any).groupOrderRandom != null) base.groupOrderRandom = !!(question as any).groupOrderRandom
      if ((question as any).quotasEnabled != null) base.quotasEnabled = !!(question as any).quotasEnabled
      if ((question as any).quotaMode) base.quotaMode = (question as any).quotaMode
      if ((question as any).quotaFullText != null) base.quotaFullText = String((question as any).quotaFullText || '')
      if ((question as any).quotaShowRemaining != null) base.quotaShowRemaining = !!(question as any).quotaShowRemaining
      if ((question as any).autoSelectOnAppear) base.autoSelectOnAppear = true

      if (includeCrossQuestionLogic && Array.isArray((question as any).optionLogic)) {
        base.options = base.options.map((option: any, optionIndex: number) => {
          const optionGroups = (question as any).optionLogic?.[optionIndex]
          if (!Array.isArray(optionGroups) || optionGroups.length === 0) return option
          const mappedGroups = optionGroups.map((group: any[]) =>
            (group || []).map((condition: any) => {
              const depLocalId = String(condition.qid)
              const depIndex = surveyForm.questions.findIndex(item => String(item.id) === depLocalId || String(item.id) === String(condition.qid))
              const depQuestion = surveyForm.questions[depIndex]
              let value: any = condition.value
              if (depQuestion && Array.isArray(depQuestion.options) && depQuestion.options.length > 0) {
                const labelToValue = new Map<string, string>()
                depQuestion.options.forEach((depLabel: string, depOptionIndex: number) => {
                  labelToValue.set(String(depLabel), String(depOptionIndex + 1))
                })
                const mapValue = (raw: any) => {
                  const stringValue = String(raw)
                  if (/^\d+$/.test(stringValue)) return stringValue
                  return labelToValue.get(stringValue) || stringValue
                }
                value = Array.isArray(condition.value) ? condition.value.map(mapValue) : mapValue(condition.value)
              }
              return {
                qid: idToOrder[String(condition.qid)] || String(condition.qid),
                op: condition.op,
                value
              }
            })
          )
          return { ...option, visibleWhen: mappedGroups }
        })
      }

      if (includeCrossQuestionLogic && (question as any).jumpLogic) base.jumpLogic = (question as any).jumpLogic
    }

    if (base.type === 'matrix') {
      const matrix = ensureMatrixConfig(question)
      base.matrix = {
        selectionType: matrix.selectionType,
        rows: matrix.rows.map((label: string, rowIndex: number) => ({
          label,
          value: String(rowIndex + 1),
          order: rowIndex + 1
        }))
      }
    }

    if (base.type === 'rating') {
      const validation = ensureRatingValidation(question)
      base.validation = {
        ...base.validation,
        min: validation.min,
        max: validation.max,
        step: 1
      }
    }

    if (base.type === 'scale') {
      const validation = ensureScaleValidation(question)
      base.validation = {
        ...base.validation,
        min: validation.min,
        max: validation.max,
        step: validation.step,
        minLabel: validation.minLabel || '',
        maxLabel: validation.maxLabel || ''
      }
    }

    if (includeCrossQuestionLogic && (question as any).logic?.visibleWhen) {
      const mapped = (question as any).logic.visibleWhen.map((group: any[]) =>
        (group || []).map((condition: any) => {
          const depLocalId = String(condition.qid)
          const depIndex = surveyForm.questions.findIndex(item => String(item.id) === depLocalId || String(item.id) === String(condition.qid))
          const depQuestion = surveyForm.questions[depIndex]
          let value: any = condition.value
          if (depQuestion && Array.isArray(depQuestion.options) && depQuestion.options.length > 0) {
            const labelToValue = new Map<string, string>()
            depQuestion.options.forEach((label: string, depOptionIndex: number) => {
              labelToValue.set(String(label), String(depOptionIndex + 1))
            })
            const mapValue = (raw: any) => {
              const stringValue = String(raw)
              if (/^\d+$/.test(stringValue)) return stringValue
              return labelToValue.get(stringValue) || stringValue
            }
            value = Array.isArray(condition.value) ? condition.value.map(mapValue) : mapValue(condition.value)
          }
          return {
            qid: idToOrder[String(condition.qid)] || String(condition.qid),
            op: condition.op,
            value
          }
        })
      )
      base.logic = { visibleWhen: mapped }
    }

    return base
  }

  function buildQuestionBankPayload(questionIndex: number, metadata: QuestionBankExportMetadata = {}): QuestionBankQuestionFormDTO | null {
    const question = surveyForm.questions[questionIndex]
    if (!question) return null

    const exportedQuestion = buildServerQuestionPayload(question, questionIndex, { includeCrossQuestionLogic: false })
    const title = String(question.title || getQuestionTypeLabel(question.type)).trim() || getQuestionTypeLabel(question.type)
    const description = String(question.description || '').trim()
    const rawScore = question.examConfig && typeof question.examConfig === 'object'
      ? Number(question.examConfig.score || 0)
      : NaN
    const hasScore = Number.isFinite(rawScore)
    const normalizedTags = Array.isArray(metadata.tags) ? metadata.tags.map(item => String(item).trim()).filter(Boolean) : []
    const normalizedKnowledgePoints = Array.isArray(metadata.knowledgePoints) ? metadata.knowledgePoints.map(item => String(item).trim()).filter(Boolean) : []
    const normalizedApplicableScenes = Array.isArray(metadata.applicableScenes) ? metadata.applicableScenes.map(item => String(item).trim()).filter(Boolean) : []
    const normalizedAiMeta = metadata.aiMeta && isPlainObject(metadata.aiMeta) ? cloneJsonValue(metadata.aiMeta) : undefined
    const topLevelOptions = serverQuestionTypeHasOptions(exportedQuestion.type) && Array.isArray(exportedQuestion.options)
      ? exportedQuestion.options.map((option: any) => ({
          label: String(option?.label ?? ''),
          value: option?.value == null ? undefined : String(option.value),
          ...(option?.desc ? { desc: String(option.desc) } : {})
        }))
      : undefined

    return {
      title,
      type: exportedQuestion.type,
      ...(hasScore ? { score: rawScore } : {}),
      ...(question.examConfig?.correctAnswer !== undefined
        ? { correctAnswer: cloneJsonValue(question.examConfig.correctAnswer) }
        : {}),
      stem: title,
      ...(description ? { analysis: description } : {}),
      ...(normalizedTags.length > 0 ? { tags: normalizedTags } : {}),
      ...(normalizedKnowledgePoints.length > 0 ? { knowledgePoints: normalizedKnowledgePoints } : {}),
      ...(normalizedApplicableScenes.length > 0 ? { applicableScenes: normalizedApplicableScenes } : {}),
      ...(normalizedAiMeta ? { aiMeta: normalizedAiMeta } : {}),
      ...(topLevelOptions && topLevelOptions.length > 0 ? { options: topLevelOptions } : {}),
      content: {
        title,
        questionType: exportedQuestion.type,
        stem: title,
        ...(description ? { analysis: description } : {}),
        ...(normalizedTags.length > 0 ? { tags: normalizedTags } : {}),
        ...(normalizedKnowledgePoints.length > 0 ? { knowledgePoints: normalizedKnowledgePoints } : {}),
        ...(normalizedApplicableScenes.length > 0 ? { applicableScenes: normalizedApplicableScenes } : {}),
        ...(hasScore ? { score: rawScore } : {}),
        ...(question.examConfig?.correctAnswer !== undefined
          ? { correctAnswer: cloneJsonValue(question.examConfig.correctAnswer) }
          : {}),
        ...(topLevelOptions && topLevelOptions.length > 0 ? { options: cloneJsonValue(topLevelOptions) } : {}),
        ...(normalizedAiMeta ? { aiMeta: normalizedAiMeta } : {}),
        surveyQuestion: exportedQuestion
      }
    }
  }

  function toServerPayload() {
    const questions = surveyForm.questions.map((question, index) => buildServerQuestionPayload(question, index))

    return {
      title: surveyForm.title,
      description: surveyForm.description,
      questions,
      settings: {
        ...surveyForm.settings,
        endTime: surveyForm.endTime || '',
        submitOnce: !surveyForm.settings.allowMultipleSubmissions
      }
    }
  }

  onMounted(async () => {
    const initTitle = (route.query?.title as string) || ''
    if (initTitle && !surveyForm.title) surveyForm.title = initTitle

    const initTab = (route.query?.tab as string) || ''
    if (['edit', 'preview', 'answers', 'settings'].includes(initTab)) {
      currentTab.value = initTab as 'edit' | 'preview' | 'answers' | 'settings'
    }

    const editingId = route.params?.id as string | undefined
    if (!editingId) return

    try {
      const survey = await getSurveyRaw(String(editingId))
      surveyForm.title = survey.title || ''
      surveyForm.description = survey.description || ''
      surveyForm.settings = {
        ...surveyForm.settings,
        ...(survey.settings || {}),
        showProgress: survey?.settings?.showProgress !== false,
        allowMultipleSubmissions: !!survey?.settings?.allowMultipleSubmissions,
        randomizeQuestions: !!(survey as any)?.settings?.randomizeQuestions || !!(survey as any)?.settings?.randomOrder,
        collectIP: !!(survey as any)?.settings?.collectIP,
        submitOnce: (survey as any)?.settings?.submitOnce !== false
      }
      surveyForm.endTime = survey?.settings?.endTime || ''
      currentSurveyId.value = String(survey.id || editingId)
      shareId.value = String((survey as any).shareId || survey.id || '')

      try {
        const statsData = await getSurveyDetailStats(currentSurveyId.value)
        if (statsData) {
          Object.assign(answerStats, {
            total: statsData.total || 0,
            today: statsData.today || 0,
            avgScore: statsData.avgScore || 0,
            completionRate: statsData.completionRate || 0,
            completed: statsData.completed || 0,
            incomplete: statsData.incomplete || 0,
            avgTime: statsData.avgTime || '-'
          })
        }
      } catch (error) {
        console.warn('加载答卷统计失败，使用默认值。', error)
      }

      const sourceQuestions = Array.isArray(survey.questions) ? survey.questions : []
      surveyForm.questions = sourceQuestions.map((question: any) => buildEditorQuestionFromServerQuestion(question))

      const orderToLocalId: Record<string, string> = {}
      surveyForm.questions.forEach((question, index) => {
        orderToLocalId[String(sourceQuestions[index]?.order || index + 1)] = String(question.id)
      })

      sourceQuestions.forEach((question: any, index: number) => {
        const visibleWhen = question?.logic?.visibleWhen
        if (!Array.isArray(visibleWhen) || visibleWhen.length === 0) return
        const mapped = visibleWhen.map((group: any[]) =>
          (group || []).map((condition: any) => {
            const localQuestionId = orderToLocalId[String(condition.qid)] || String(condition.qid)
            const depIndex = surveyForm.questions.findIndex(item => String(item.id) === localQuestionId)
            const depQuestion = surveyForm.questions[depIndex]
            let value = condition.value
            if (depQuestion && Array.isArray(depQuestion.options) && depQuestion.options.length > 0) {
              const valueToLabel = new Map<string, string>()
              depQuestion.options.forEach((label: string, optionIndex: number) => {
                valueToLabel.set(String(optionIndex + 1), String(label))
              })
              const restoreValue = (raw: any) => valueToLabel.get(String(raw)) || String(raw)
              value = Array.isArray(condition.value) ? condition.value.map(restoreValue) : restoreValue(condition.value)
            }
            return { qid: localQuestionId, op: condition.op, value }
          })
        )
        ;(surveyForm.questions[index] as any).logic = { visibleWhen: mapped }
      })

      sourceQuestions.forEach((question: any, index: number) => {
        const options = Array.isArray(question.options) ? question.options : []
        if (!options.length) return
        const localQuestion: any = surveyForm.questions[index]
        localQuestion.optionLogic = localQuestion.optionLogic || []
        options.forEach((option: any, optionIndex: number) => {
          const groups = option?.visibleWhen
          if (!Array.isArray(groups) || groups.length === 0) return
          const mapped = groups.map((group: any[]) =>
            (group || []).map((condition: any) => {
              const localQuestionId = orderToLocalId[String(condition.qid)] || String(condition.qid)
              const depIndex = surveyForm.questions.findIndex(item => String(item.id) === localQuestionId)
              const depQuestion = surveyForm.questions[depIndex]
              let value = condition.value
              if (depQuestion && Array.isArray(depQuestion.options) && depQuestion.options.length > 0) {
                const valueToLabel = new Map<string, string>()
                depQuestion.options.forEach((label: string, depOptionIndex: number) => {
                  valueToLabel.set(String(depOptionIndex + 1), String(label))
                })
                const restoreValue = (raw: any) => valueToLabel.get(String(raw)) || String(raw)
                value = Array.isArray(condition.value) ? condition.value.map(restoreValue) : restoreValue(condition.value)
              }
              return { qid: localQuestionId, op: condition.op, value }
            })
          )
          localQuestion.optionLogic[optionIndex] = mapped
        })
      })
    } catch (error) {
      console.error('加载问卷失败', error)
    }
  })

  return {
    router,
    route,
    surveyForm,
    saving,
    panelTab,
    currentSurveyId,
    shareId,
    currentTab,
    showHeaderSettings,
    showAIHelper,
    aiPrompt,
    editingIndex,
    answerStats,
    categoryExpanded,
    draggingIndex,
    dragOverIndex,
    dragOverPos,
    outlineListEl,
    showOutlineTip,
    renamingIndex,
    renameText,
    renameInputEl,
    errors,
    canPreview,
    canPublish,
    areAllNumbersHidden,
    computedShareLink,
    copyShareLink,
    validateForm,
    closeQuestionEdit,
    getQuestionTypeLabel,
    goBack,
    getQuestionConfig,
    isStandaloneConfigType,
    isMatrixLegacyQuestion,
    isSliderLegacyQuestion,
    isUploadLegacyQuestion,
    isRatingLegacyQuestion,
    isScaleLegacyQuestion,
    buildLegacyQuestion,
    createDefaultQuestion,
    importQuestionBankQuestion,
    ensureSliderValidation,
    normalizeSliderValidation,
    ensureRatingValidation,
    normalizeRatingValidation,
    ensureScaleValidation,
    normalizeScaleValidation,
    getScalePreviewValues,
    ensureMatrixConfig,
    isMatrixMultipleLegacyQuestion,
    isMatrixDropdownLegacyQuestion,
    addMatrixRow,
    removeMatrixRow,
    ensureUploadConfig,
    normalizeUploadConfig,
    uploadConfigSummary,
    addQuestionByType,
    hasOptions,
    addOption,
    removeOption,
    ensureOptionExtras,
    isGroupConfigured,
    isScoreConfigured,
    moveQuestionUp,
    moveQuestionDown,
    generateByAI,
    onOutlineDragStart,
    onOutlineDragOver,
    onOutlineDrop,
    onOutlineDragEnd,
    startRename,
    confirmRename,
    duplicateQuestion,
    deleteQuestion,
    finishEdit,
    addQuestionAfter,
    addOptionAt,
    toggleDesc,
    toggleHidden,
    toggleCategory,
    isHintOpen,
    toggleHint,
    onHintCheckboxChange,
    buildQuestionBankPayload,
    toServerPayload
  }
}
