import {
  SERVER_QUESTION_TYPE_LABELS,
  mapLegacyTypeToServer
} from '../../../shared/questionTypeRegistry.js'

export const QuestionType = {
  FillBlank: mapLegacyTypeToServer(1),
  ShortAnswer: mapLegacyTypeToServer(2),
  SingleChoice: mapLegacyTypeToServer(3),
  MultipleChoice: mapLegacyTypeToServer(4),
  Scale: 'scale',
  Matrix: 'matrix',
  Dropdown: 'dropdown',
  Slider: mapLegacyTypeToServer(8),
  Ranking: mapLegacyTypeToServer(11),
  FileUpload: mapLegacyTypeToServer(13),
  Date: mapLegacyTypeToServer(14),
  Rating: 'rating'
}

export const QuestionTypeLabel = {
  ...SERVER_QUESTION_TYPE_LABELS,
  dropdown: '下拉题'
}
