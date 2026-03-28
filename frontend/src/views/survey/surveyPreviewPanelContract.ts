export interface LegacyQuestionDraft {
  id: string | number
  type: number
  title: string
  description?: string
  required?: boolean
  options?: any[]
  validation?: Record<string, unknown>
  upload?: Record<string, unknown>
  matrix?: { rows?: any[]; selectionType?: string }
  logic?: any
  jumpLogic?: any
  optionGroups?: any[]
  quotasEnabled?: boolean
  quotaMode?: string
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
