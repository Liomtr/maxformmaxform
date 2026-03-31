import { throwManagementError } from '../http/managementErrors.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function throwInvalidManagementPayload(message) {
  throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
}

export function ensurePlainObjectPayload(body, label = 'Request body') {
  if (!isPlainObject(body)) {
    throwInvalidManagementPayload(`${label} must be an object`)
  }

  return body
}

export function normalizeRequiredTrimmedString(value, { field, code, message }) {
  if (value === undefined || value === null) {
    throwManagementError(400, code, message)
  }

  if (typeof value !== 'string') {
    throwInvalidManagementPayload(`${field} must be a string`)
  }

  const normalized = value.trim()
  if (!normalized) {
    throwManagementError(400, code, message)
  }

  return normalized
}

export function normalizeOptionalTrimmedString(value, { field, allowNull = false, emptyToNull = false } = {}) {
  if (value === undefined) return undefined
  if (value === null) {
    if (allowNull) return null
    throwInvalidManagementPayload(`${field} must be a string`)
  }

  if (typeof value !== 'string') {
    throwInvalidManagementPayload(`${field} must be a string`)
  }

  const normalized = value.trim()
  if (!normalized) {
    return emptyToNull ? null : ''
  }

  return normalized
}

export function normalizeOptionalNumber(value, { field, allowNull = false, integer = false } = {}) {
  if (value === undefined) return undefined
  if (value === null || value === '') {
    if (allowNull) return null
    throwInvalidManagementPayload(`${field} must be a number`)
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    throwInvalidManagementPayload(`${field} must be a number`)
  }

  const raw = typeof value === 'string' ? value.trim() : value
  if (raw === '') {
    if (allowNull) return null
    throwInvalidManagementPayload(`${field} must be a number`)
  }

  const normalized = Number(raw)
  if (!Number.isFinite(normalized)) {
    throwInvalidManagementPayload(`${field} must be a number`)
  }

  if (integer && !Number.isInteger(normalized)) {
    throwInvalidManagementPayload(`${field} must be an integer`)
  }

  return normalized
}

export function normalizeOptionalBoolean(value, { field } = {}) {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false

  throwInvalidManagementPayload(`${field} must be a boolean`)
}

export function normalizeOptionalId(value, { field, allowNull = false } = {}) {
  try {
    return normalizeOptionalNumber(value, {
      field,
      allowNull,
      integer: true
    })
  } catch (error) {
    if (error?.code === MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD) {
      throwInvalidManagementPayload(`${field} must be an integer`)
    }
    throw error
  }
}

export function normalizeOptionalStringArray(value, { field } = {}) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throwInvalidManagementPayload(`${field} must be an array of strings`)
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throwInvalidManagementPayload(`${field}[${index}] must be a string`)
    }
    return item.trim()
  }).filter(Boolean)
}
