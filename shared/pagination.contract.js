export const PAGINATION_DEFAULTS = Object.freeze({
  page: 1,
  pageSize: 20
})

function normalizePositiveInteger(value, fallback) {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return fallback
  const integer = Math.trunc(normalized)
  return integer > 0 ? integer : fallback
}

export function normalizePaginationQuery(query = {}, defaults = PAGINATION_DEFAULTS) {
  return {
    page: normalizePositiveInteger(query?.page, defaults.page),
    pageSize: normalizePositiveInteger(query?.pageSize, defaults.pageSize)
  }
}

export function createPaginatedResult({ list = [], total = 0, page, pageSize } = {}) {
  const normalized = normalizePaginationQuery({ page, pageSize })
  return {
    total: Number(total || 0),
    list: Array.isArray(list) ? list : [],
    page: normalized.page,
    pageSize: normalized.pageSize
  }
}
