import type {
  MatrixQuestionConfigDTO,
  QuestionDTO,
  QuestionOptionDTO,
  SurveyDTO,
  SurveyFormDTO,
  SurveySettingsDTO,
  SurveyStyleDTO,
  UploadQuestionConfigDTO
} from '../../../shared/survey.contract.js'

export type QuestionOption = QuestionOptionDTO

export type UploadQuestionConfig = UploadQuestionConfigDTO

export type MatrixQuestionConfig = MatrixQuestionConfigDTO

export type LegacyQuestionType = number

export type Question = QuestionDTO

export type SurveySettings = SurveySettingsDTO

export type SurveyStyle = SurveyStyleDTO

export type Survey = SurveyDTO

export type SurveyForm = SurveyFormDTO
