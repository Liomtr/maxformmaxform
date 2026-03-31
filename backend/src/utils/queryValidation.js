function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isQueryPrimitive(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function toTrimmedString(value, field, onError) {
  if (!isQueryPrimitive(value)) {
    onError(`${field} must be a string`)
  }

  return String(value).trim()
}

export function ensureQueryObject(query, onError) {
  if (!isPlainObject(query)) {
    onError('Query parameters must be an object')
  }

  return query
}

export function normalizeStrictPagination(query, defaults, onError) {
  ensureQueryObject(query, onError)

  return {
    page: normalizeOptionalPositiveIntegerQuery(query.page, 'page', onError) ?? Number(defaults?.page || 1),
    pageSize: normalizeOptionalPositiveIntegerQuery(query.pageSize, 'pageSize', onError) ?? Number(defaults?.pageSize || 20)
  }
}

export function normalizeOptionalPositiveIntegerQuery(value, field, onError) {
  if (value === undefined) return undefined
  if (!isQueryPrimitive(value)) {
    onError(`${field} must be a positive integer`)
  }

  const raw = String(value).trim()
  if (!raw) {
    onError(`${field} must be a positive integer`)
  }

  const normalized = Number(raw)
  if (!Number.isInteger(normalized) || normalized <= 0) {
    onError(`${field} must be a positive integer`)
  }

  return normalized
}

export function normalizeOptionalIntegerQuery(value, field, onError, options = {}) {
  if (value === undefined) return undefined
  if (options.allowNull && (value === null || value === '' || value === 'null')) return null
  if (!isQueryPrimitive(value)) {
    onError(`${field} must be an integer`)
  }

  const raw = String(value).trim()
  if (!raw) {
    onError(`${field} must be an integer`)
  }

  const normalized = Number(raw)
  if (!Number.isInteger(normalized) || (options.positive && normalized <= 0)) {
    onError(`${field} must be an integer`)
  }

  return normalized
}

export function normalizeOptionalBooleanQuery(value, field, onError) {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  if (!isQueryPrimitive(value)) {
    onError(`${field} must be a boolean`)
  }

  const raw = String(value).trim().toLowerCase()
  if (raw === 'true' || raw === '1') return true
  if (raw === 'false' || raw === '0') return false

  onError(`${field} must be a boolean`)
}

export function normalizeOptionalStringQuery(value, field, onError) {
  if (value === undefined) return undefined
  const normalized = toTrimmedString(value, field, onError)
  return normalized || undefined
}

export function normalizeOptionalStringArrayQuery(value, field, onError) {
  if (value === undefined) return undefined

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (!isQueryPrimitive(item)) {
        onError(`${field}[${index}] must be a string`)
      }
      return String(item).trim()
    }).filter(Boolean)
  }

  const normalized = toTrimmedString(value, field, onError)
  if (!normalized) return undefined
  return normalized.split(',').map(item => item.trim()).filter(Boolean)
}

export function normalizeOptionalDateTimeQuery(value, field, onError) {
  if (value === undefined) return undefined

  const normalized = toTrimmedString(value, field, onError)
  if (!normalized) return undefined

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    onError(`${field} must be a valid datetime`)
  }

  return normalized
}
