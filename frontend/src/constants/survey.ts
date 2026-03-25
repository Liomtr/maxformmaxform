import { legacyQuestionTypeHasOptions } from '@/utils/questionTypeRegistry'

// 题型常量与工具
export const QUESTION_TYPES = {
  SINGLE: 1,
  MULTI: 2,
  FILL: 3,
  MATRIX_SINGLE: 20,
  MATRIX_MULTI: 21,
  DESC: 4,
  FILE: 7,
  DATE: 8,
  SORT: 11,
  SCALE: 13,
  SLIDER: 14,
  SECTION: 22,
  RANK: 23,
  CASCADE: 24,
  CITY: 25,
  PROVINCE_CITY: 26,
  NAME: 27,
  ADDRESS: 28,
  PHONE: 29,
  EMAIL: 30,
  GENDER: 31,
  AGE: 32,
  EDU: 33,
  INCOME: 34,
  INDUSTRY: 35,
  COMPANY: 36,
  JOB: 37,
  MARITAL: 38,
  CHILDREN: 39,
  TEXTAREA: 40,
  IMAGE_CHOICE: 41,
  VIDEO: 42,
} as const

export type QuestionTypeKey = keyof typeof QUESTION_TYPES

export const QUESTION_TYPE_HAS_OPTIONS = new Set<number>([
  ...Object.values(QUESTION_TYPES).filter(type => legacyQuestionTypeHasOptions(type)),
  QUESTION_TYPES.MATRIX_SINGLE,
  QUESTION_TYPES.MATRIX_MULTI,
  QUESTION_TYPES.RANK,
  QUESTION_TYPES.IMAGE_CHOICE
])
