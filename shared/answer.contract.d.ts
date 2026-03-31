import type { PaginatedResultDTO, PaginationQueryDTO } from './pagination.contract.js'

export interface AnswerItemDTO {
  questionId: string | number
  value: unknown
  text?: string
}

export interface AnswerDTO {
  id: number
  survey_id?: number
  surveyId?: number
  answers_data: AnswerItemDTO[]
  ip_address?: string
  user_agent?: string
  duration?: number
  status?: string
  submitted_at?: string
  submittedAt?: string
}

export interface AnswerListQueryDTO extends PaginationQueryDTO {
  survey_id?: number | string | null
  startTime?: string | null
  endTime?: string | null
}

export interface AnswerCountDTO {
  count: number
}

export interface AnswerBatchDeleteResultDTO {
  deleted: number
}

export type AnswerPageDTO = PaginatedResultDTO<AnswerDTO>

export const ANSWER_ERROR_CODES: Readonly<{
  VALIDATION: 'VALIDATION'
  NOT_FOUND: 'NOT_FOUND'
  NO_FILE: 'NO_FILE'
}>

export type AnswerErrorCode = typeof ANSWER_ERROR_CODES[keyof typeof ANSWER_ERROR_CODES]

export const ANSWER_PAGINATION_DEFAULTS: Readonly<{
  page: 1
  pageSize: 20
}>

export function normalizeAnswerListQuery(query?: AnswerListQueryDTO): {
  page: number
  pageSize: number
  survey_id?: number
  startTime?: string
  endTime?: string
}

export function createAnswerDto(answer?: Partial<AnswerDTO> | null): AnswerDTO | null
export function createAnswerPageResult<T extends Partial<AnswerDTO>>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): AnswerPageDTO
export function createAnswerCountDto(count?: number | string | null): AnswerCountDTO
export function createAnswerBatchDeleteResult(result?: Partial<AnswerBatchDeleteResultDTO> | null): AnswerBatchDeleteResultDTO
