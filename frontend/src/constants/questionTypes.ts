import { getLegacyQuestionTypeLabel } from '@/utils/questionTypeRegistry'

export enum QuestionType {
  FillBlank = 1,
  ShortAnswer = 2,
  SingleChoice = 3,
  MultipleChoice = 4,
  Scale = 5,
  Matrix = 6,
  Dropdown = 7,
  Slider = 8,
  MultiFillBlank = 9,
  MatrixFillBlank = 10,
  Sort = 11,
  Ratio = 12,
  FileUpload = 13
}

export const QuestionTypeLabel: Record<QuestionType, string> = {
  [QuestionType.FillBlank]: getLegacyQuestionTypeLabel(QuestionType.FillBlank),
  [QuestionType.ShortAnswer]: getLegacyQuestionTypeLabel(QuestionType.ShortAnswer),
  [QuestionType.SingleChoice]: getLegacyQuestionTypeLabel(QuestionType.SingleChoice),
  [QuestionType.MultipleChoice]: getLegacyQuestionTypeLabel(QuestionType.MultipleChoice),
  [QuestionType.Scale]: '量表题',
  [QuestionType.Matrix]: '矩阵题',
  [QuestionType.Dropdown]: getLegacyQuestionTypeLabel(QuestionType.Dropdown),
  [QuestionType.Slider]: getLegacyQuestionTypeLabel(QuestionType.Slider),
  [QuestionType.MultiFillBlank]: '多项填空题',
  [QuestionType.MatrixFillBlank]: '矩阵填空',
  [QuestionType.Sort]: getLegacyQuestionTypeLabel(QuestionType.Sort),
  [QuestionType.Ratio]: '比重题',
  [QuestionType.FileUpload]: getLegacyQuestionTypeLabel(QuestionType.FileUpload)
}
