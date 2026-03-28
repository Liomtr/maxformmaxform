import type { PaginatedResultDTO, PaginationQueryDTO } from './pagination.contract.js'

export interface QuestionOptionDTO {
  label: string
  value: string
  order?: number
  text?: string
  rich?: boolean
  desc?: string
  hidden?: boolean
  visibleWhen?: unknown[]
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

export interface UploadQuestionConfigDTO {
  maxFiles?: number
  maxSizeMb?: number
  accept?: string
}

export interface MatrixQuestionConfigDTO {
  rows?: QuestionOptionDTO[] | string[]
  selectionType?: 'single' | 'multiple'
}

export interface QuestionDTO {
  id: string
  type: string | number
  uiType?: number
  title: string
  titleHtml?: string
  description?: string
  required?: boolean
  options?: QuestionOptionDTO[]
  optionOrder?: 'none' | 'all' | 'flip' | 'firstFixed' | 'lastFixed'
  validation?: Record<string, unknown>
  upload?: UploadQuestionConfigDTO
  matrix?: MatrixQuestionConfigDTO
  logic?: Record<string, unknown>
  examConfig?: { score?: number; correctAnswer?: unknown }
  jumpLogic?: Record<string, unknown>
  optionGroups?: unknown[]
  hideSystemNumber?: boolean
  quotasEnabled?: boolean
  quotaMode?: string
  quotaShowRemaining?: boolean
  quotaFullText?: string
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

export interface UploadedSurveyFileDTO {
  id: number
  name: string
  url: string
  size: number
  type: string
  surveyId: number
  uploadToken: string
}

export interface SurveySubmitResultDTO {
  id: number
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
  UPLOAD_QUESTION_NOT_FOUND: 'UPLOAD_QUESTION_NOT_FOUND'
  UPLOAD_SESSION_REQUIRED: 'UPLOAD_SESSION_REQUIRED'
  UPLOAD_NOT_ENABLED: 'UPLOAD_NOT_ENABLED'
  UPLOAD_VALIDATION: 'UPLOAD_VALIDATION'
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION'
  NO_FILE: 'NO_FILE'
  SHARE_CODE_GENERATION_FAILED: 'SHARE_CODE_GENERATION_FAILED'
}>

export type SurveyErrorCode = typeof SURVEY_ERROR_CODES[keyof typeof SURVEY_ERROR_CODES]

export const SURVEY_PAGINATION_DEFAULTS: Readonly<{
  page: 1
  pageSize: 20
  trashPageSize: 100
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
export function createSurveyPageResult<T>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): PaginatedResultDTO<T>
export function createSurveyUploadDto(file: {
  id?: number | string | null
  name?: string | null
  url?: string | null
  size?: number | string | null
  type?: string | null
  survey_id?: number | string | null
  public_token?: string | null
  uploadToken?: string | null
}, surveyId?: number | string | null): UploadedSurveyFileDTO
export function createSurveySubmissionDto(answer?: { id?: number | string | null }): SurveySubmitResultDTO
