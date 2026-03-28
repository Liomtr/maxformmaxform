import type { PaginatedResultDTO } from '../../../shared/pagination.contract.js'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}

export type PaginatedData<T> = PaginatedResultDTO<T>
