import type { PaginatedResultDTO, PaginationQueryDTO } from './pagination.contract.js'
export type {
  AnswerBatchDeleteResultDTO,
  AnswerCountDTO,
  AnswerDTO,
  AnswerErrorCode,
  AnswerItemDTO,
  AnswerListQueryDTO,
  AnswerPageDTO
} from './answer.contract.js'
export type {
  SurveySubmitResultDTO,
  SurveyUploadErrorCode,
  UploadedSurveyFileDTO
} from './surveyUpload.contract.js'
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

export interface QuestionOptionDTO {
  label: string
  value: string
  order?: number
  text?: string
  rich?: boolean
  desc?: string
  hidden?: boolean
  visibleWhen?: VisibleWhenDTO
  exclusive?: boolean
  defaultSelected?: boolean
  quotaLimit?: number
  quotaUsed?: number
  quotaEnabled?: boolean
  fillEnabled?: boolean
  fillRequired?: boolean
  fillPlaceholder?: string
  __groupHeader?: string
  __quotaFull?: boolean
  __remaining?: number | null
}

export type QuestionLogicPrimitiveDTO = string | number | boolean | null
export type QuestionLogicValueDTO = QuestionLogicPrimitiveDTO | QuestionLogicPrimitiveDTO[]
export type QuestionLogicOperatorDTO =
  | 'eq'
  | 'neq'
  | 'in'
  | 'nin'
  | 'includes'
  | 'notIncludes'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'regex'
  | 'overlap'

export interface QuestionLogicConditionDTO {
  qid: string | number
  op: QuestionLogicOperatorDTO
  value: QuestionLogicValueDTO
}

export type VisibleWhenDTO = QuestionLogicConditionDTO[][]

export interface QuestionLogicDTO {
  visibleWhen?: VisibleWhenDTO
}

export interface QuestionExamConfigDTO {
  score?: number
  correctAnswer?: unknown
}

export type QuestionJumpTargetDTO = 'end' | 'invalid' | number | `${number}`

export interface QuestionJumpLogicDTO {
  byOption?: Record<string, QuestionJumpTargetDTO>
  unconditional?: QuestionJumpTargetDTO
}

export interface QuestionOptionGroupDTO {
  name?: string
  from?: number
  to?: number
  random?: boolean
}

export type QuestionQuotaModeDTO = 'explicit' | 'implicit'

export interface QuestionQuotaSettingsDTO {
  quotasEnabled?: boolean
  quotaMode?: QuestionQuotaModeDTO
  quotaShowRemaining?: boolean
  quotaFullText?: string
}

export interface QuestionValidationDTO {
  min?: number
  max?: number
  step?: number
  minLabel?: string
  maxLabel?: string
  maxFiles?: number
  maxSizeMb?: number
  maxSize?: number
  accept?: string
  [key: string]: unknown
}

export interface UploadQuestionConfigDTO {
  maxFiles?: number
  maxSizeMb?: number
  accept?: string
}

export interface MatrixQuestionConfigDTO {
  rows?: QuestionOptionDTO[] | string[]
  selectionType?: 'single' | 'multiple'
}

export interface QuestionDTO extends QuestionQuotaSettingsDTO {
  id: string
  type: string | number
  uiType?: number
  title: string
  titleHtml?: string
  description?: string
  required?: boolean
  options?: QuestionOptionDTO[]
  optionOrder?: 'none' | 'all' | 'flip' | 'firstFixed' | 'lastFixed'
  validation?: QuestionValidationDTO
  upload?: UploadQuestionConfigDTO
  matrix?: MatrixQuestionConfigDTO
  logic?: QuestionLogicDTO
  examConfig?: QuestionExamConfigDTO
  jumpLogic?: QuestionJumpLogicDTO
  optionGroups?: QuestionOptionGroupDTO[]
  hideSystemNumber?: boolean
  autoSelectOnAppear?: boolean
  order?: number
}

export interface SurveySettingsDTO {
  showProgress?: boolean
  allowMultipleSubmissions?: boolean
  endTime?: string
  examMode?: boolean
  timeLimit?: number
  submitOnce?: boolean
  randomOrder?: boolean
  randomizeQuestions?: boolean
  collectIP?: boolean
}

export interface SurveyStyleDTO {
  theme?: string
  backgroundColor?: string
  headerImage?: string
}

export interface SurveyDTO {
  id: number
  title: string
  description?: string
  creator_id: number
  questions: QuestionDTO[]
  settings?: SurveySettingsDTO
  style?: SurveyStyleDTO
  share_code?: string
  status: 'draft' | 'published' | 'closed'
  response_count: number
  created_at: string
  updated_at: string
  shareId?: string
  answerCount?: number
  responseCount?: number
  createdById?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
  closedAt?: string
  deletedAt?: string
  auditAt?: string
  lastSubmitAt?: string
  submitCount?: number
  auditStatus?: string
  logs?: Array<{ time?: string; actor?: string; action?: string; detail?: string }>
  type?: string
  endTime?: string
  folderId?: number | null
}

export type SurveyFormDTO = Pick<SurveyDTO, 'title' | 'description' | 'questions' | 'settings' | 'style'>

export interface SurveyListQueryDTO extends PaginationQueryDTO {
  status?: string
  creator_id?: number | string
  createdBy?: string
  folder_id?: number | string | null
}

export interface SurveyTrashListQueryDTO extends PaginationQueryDTO {
  creator_id?: number | string
  createdBy?: string
}

export interface SurveyValidationResultDTO {
  valid: boolean
  error: string | null
  normalized: {
    title: string
    description?: string
    questions: Partial<QuestionDTO>[]
    settings?: Partial<SurveySettingsDTO>
    style?: Partial<SurveyStyleDTO>
  }
}

export interface SurveyDryRunPayloadDTO {
  json?: string
  survey?: {
    title?: string
    description?: string
    questions?: Partial<QuestionDTO>[]
    settings?: Partial<SurveySettingsDTO>
    style?: Partial<SurveyStyleDTO>
  }
  title?: string
  description?: string
  questions?: Partial<QuestionDTO>[]
  settings?: Partial<SurveySettingsDTO>
  style?: Partial<SurveyStyleDTO>
}

export interface SurveyResultOptionStatDTO {
  label: string
  value?: string
  count: number
  percentage: number
  avgRank?: number | null
  avgShare?: number | null
  totalShare?: number | null
}

export interface SurveyResultFileStatDTO {
  id: number
  name: string
  url: string
  type: string
  size: number
}

export interface SurveyResultMatrixRowStatDTO {
  label: string
  value: string
  totalAnswers: number
  options: SurveyResultOptionStatDTO[]
}

export interface SurveyResultTrendPointDTO {
  date: string
  label: string
  count: number
}

export interface SurveyResultRegionStatDTO {
  hasLocationData: boolean
  scope?: string
  missingCount: number
  items: Array<{ label: string; value: string }>
  emptyReason: string | null
}

export interface SurveyQuestionStatDTO {
  questionId: number
  questionTitle: string
  type: string
  totalAnswers: number
  options?: SurveyResultOptionStatDTO[]
  sampleAnswers?: string[]
  avgValue?: number | null
  minValue?: number | null
  maxValue?: number | null
  totalFiles?: number
  sampleFiles?: SurveyResultFileStatDTO[]
  earliestDate?: string | null
  latestDate?: string | null
  avgScore?: number | null
  distribution?: Record<string, number>
  matrixMode?: string
  rows?: SurveyResultMatrixRowStatDTO[]
}

export interface SurveyResultsDTO {
  totalSubmissions: number
  lastSubmitAt: string | null
  total: number
  today: number
  avgScore?: number
  completed: number
  incomplete: number
  completionRate: number
  avgDuration: string | null
  avgTime: number | null
  submissionTrend?: SurveyResultTrendPointDTO[]
  regionStats?: SurveyResultRegionStatDTO
  systemStats?: Record<string, Array<{ label: string; value: string }>>
  questionStats: SurveyQuestionStatDTO[]
  observability?: {
    snapshot: {
      scope: string
      window: string
      currentAccessMode: 'snapshot-hit' | 'snapshot-rebuild'
      currentMissReason: 'missing' | 'stale' | 'snapshot-read-error' | null
      record: {
        exists: boolean
        createdAt: string | null
        updatedAt: string | null
        ageMs: number | null
        answerCount: number | null
        latestAnswerId: number | null
        latestSubmittedAt: string | null
        surveyUpdatedAt: string | null
      }
      source: {
        answerCount: number
        latestAnswerId: number | null
        latestSubmittedAt: string | null
        surveyUpdatedAt: string | null
      }
      requests: number
      hits: number
      misses: number
      hitRate: number
      rebuilds: number
      readErrors: number
      persistErrors: number
      lastHitAt: string | null
      lastMissAt: string | null
      lastMissReason: 'missing' | 'stale' | 'snapshot-read-error' | null
      lastRebuildAt: string | null
      rebuildDurationMs: {
        current: number | null
        last: number | null
        avg: number | null
        max: number | null
      }
    }
    baseline: {
      requestDurationMs: number | null
      snapshotAccessMode: 'snapshot-hit' | 'snapshot-rebuild'
      rebuildDurationMs: number | null
      answerCount: number
      questionCount: number
      questionStatCount: number
      trendPointCount: number
      regionBucketCount: number
      systemBucketCount: number
      corePayloadBytes: number
      largeSample: boolean
      largeSampleThreshold: number
      sampleTier: 'small' | 'medium' | 'large'
    }
  }
}

export type SurveyPageDTO = PaginatedResultDTO<SurveyDTO>
export type SurveyTrashPageDTO = PaginatedResultDTO<SurveyDTO>

export const QUESTION_DTO_WRITABLE_FIELDS: readonly string[]
export const QUESTION_OPTION_DTO_WRITABLE_FIELDS: readonly string[]
export const QUESTION_VALIDATION_WRITABLE_FIELDS: readonly string[]
export const QUESTION_UPLOAD_CONFIG_WRITABLE_FIELDS: readonly string[]
export const QUESTION_MATRIX_WRITABLE_FIELDS: readonly string[]
export const QUESTION_MATRIX_ROW_WRITABLE_FIELDS: readonly string[]
export const QUESTION_LOGIC_CONDITION_WRITABLE_FIELDS: readonly string[]
export const QUESTION_LOGIC_WRITABLE_FIELDS: readonly string[]
export const QUESTION_EXAM_CONFIG_WRITABLE_FIELDS: readonly string[]
export const QUESTION_JUMP_LOGIC_WRITABLE_FIELDS: readonly string[]
export const QUESTION_OPTION_GROUP_WRITABLE_FIELDS: readonly string[]
export const SURVEY_SETTINGS_WRITABLE_FIELDS: readonly string[]
export const SURVEY_STYLE_WRITABLE_FIELDS: readonly string[]

export const SURVEY_STATUS: Readonly<{
  DRAFT: 'draft'
  PUBLISHED: 'published'
  CLOSED: 'closed'
}>

export const SURVEY_ERROR_CODES: Readonly<{
  NOT_FOUND: 'NOT_FOUND'
  FORBIDDEN: 'FORBIDDEN'
  VALIDATION: 'VALIDATION'
  NOT_PUBLISHED: 'NOT_PUBLISHED'
  SURVEY_EXPIRED: 'SURVEY_EXPIRED'
  NOT_IN_TRASH: 'NOT_IN_TRASH'
  FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND'
  SHARE_CODE_GENERATION_FAILED: 'SHARE_CODE_GENERATION_FAILED'
}>

export type SurveyErrorCode = typeof SURVEY_ERROR_CODES[keyof typeof SURVEY_ERROR_CODES]

export const SURVEY_PAGINATION_DEFAULTS: Readonly<{
  page: 1
  pageSize: 20
  trashPageSize: 100
  answersPageSize: 20
}>

export function normalizeSurveyFolderId(folderId?: number | string | null): number | null | undefined
export function normalizeSurveyListQuery(query?: SurveyListQueryDTO): {
  page: number
  pageSize: number
  status?: string
  creator_id?: number | string
  createdBy?: string
  folder_id?: number | null
}
export function normalizeSurveyTrashListQuery(query?: SurveyTrashListQueryDTO): {
  page: number
  pageSize: number
  creator_id?: number | string
  createdBy?: string
}
export function sanitizeWritableQuestionDto(question?: Partial<QuestionDTO> | Record<string, unknown> | null): Partial<QuestionDTO>
export function sanitizeWritableQuestionDtos(questions?: Array<Partial<QuestionDTO> | Record<string, unknown> | null> | null): Partial<QuestionDTO>[]
export function sanitizeWritableSurveySettings(settings?: Partial<SurveySettingsDTO> | Record<string, unknown> | null): Partial<SurveySettingsDTO> | undefined
export function sanitizeWritableSurveyStyle(style?: Partial<SurveyStyleDTO> | Record<string, unknown> | null): Partial<SurveyStyleDTO> | undefined
export function createSurveyPageResult<T>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): PaginatedResultDTO<T>
