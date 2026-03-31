export function normalizeRequiredIntegerParam(value, field, onError, options = {}) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    onError(`${field} must be an integer`)
  }

  const raw = String(value).trim()
  if (!raw) {
    onError(`${field} must be an integer`)
  }

  const normalized = Number(raw)
  if (!Number.isInteger(normalized) || (options.positive !== false && normalized <= 0)) {
    onError(`${field} must be an integer`)
  }

  return normalized
}
