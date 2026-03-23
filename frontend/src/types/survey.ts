export interface QuestionOption {
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

export type LegacyQuestionType = number

export interface Question {
  id: string
  type: string | number
  title: string
  titleHtml?: string
  description?: string
  required?: boolean
  options?: QuestionOption[]
  optionOrder?: 'none' | 'all' | 'flip' | 'firstFixed' | 'lastFixed'
  validation?: Record<string, unknown>
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

export interface SurveySettings {
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

export interface SurveyStyle {
  theme?: string
  backgroundColor?: string
  headerImage?: string
}

export interface Survey {
  id: number
  title: string
  description?: string
  creator_id: number
  questions: Question[]
  settings?: SurveySettings
  style?: SurveyStyle
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
}

export type SurveyForm = Pick<Survey, 'title' | 'description' | 'questions' | 'settings' | 'style'>
