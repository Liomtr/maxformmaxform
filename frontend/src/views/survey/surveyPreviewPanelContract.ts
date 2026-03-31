import type {
  QuestionJumpLogicDTO,
  QuestionLogicDTO,
  QuestionOptionDTO,
  QuestionOptionGroupDTO,
  QuestionQuotaModeDTO
} from '../../../../shared/survey.contract.js'

export interface LegacyQuestionDraft {
  id: string | number
  type: number
  uiType?: number
  title: string
  titleHtml?: string
  description?: string
  required?: boolean
  hideSystemNumber?: boolean
  options?: Array<string | QuestionOptionDTO>
  validation?: Record<string, unknown>
  upload?: Record<string, unknown>
  matrix?: { rows?: Array<string | QuestionOptionDTO>; selectionType?: string }
  logic?: QuestionLogicDTO
  jumpLogic?: QuestionJumpLogicDTO
  optionGroups?: QuestionOptionGroupDTO[]
  quotasEnabled?: boolean
  quotaMode?: QuestionQuotaModeDTO
  quotaFullText?: string
  quotaShowRemaining?: boolean
}

export interface SurveyPreviewFormLike {
  title: string
  description: string
  questions: LegacyQuestionDraft[]
}

export interface SurveyPreviewPanelContract {
  surveyForm: SurveyPreviewFormLike
}

export function createSurveyPreviewPanelContract(input: SurveyPreviewPanelContract): SurveyPreviewPanelContract {
  return {
    surveyForm: input.surveyForm
  }
}
