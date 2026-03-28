export interface PaginationQueryDTO {
  page?: number | string | null
  pageSize?: number | string | null
}

export interface PaginatedResultDTO<T> {
  total: number
  list: T[]
  page: number
  pageSize: number
}

export const PAGINATION_DEFAULTS: Readonly<{
  page: 1
  pageSize: 20
}>

export function normalizePaginationQuery(
  query?: PaginationQueryDTO,
  defaults?: { page?: number; pageSize?: number }
): { page: number; pageSize: number }

export function createPaginatedResult<T>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): PaginatedResultDTO<T>
