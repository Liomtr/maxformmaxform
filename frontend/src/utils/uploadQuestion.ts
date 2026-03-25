import type { UploadQuestionConfig } from '@/types/survey'
import { generateQuestionId } from '@/utils/uid'

export const DEFAULT_UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.xlsx'
export const DEFAULT_UPLOAD_MAX_FILES = 1
export const DEFAULT_UPLOAD_MAX_SIZE_MB = 10
const MAX_UPLOAD_FILES = 20

export interface NormalizedUploadQuestionConfig {
  maxFiles: number
  maxSizeMb: number
  accept: string
}

function toPositiveInt(value: unknown, fallback: number, max = Number.POSITIVE_INFINITY) {
  const numeric = Math.floor(Number(value))
  if (!Number.isFinite(numeric) || numeric < 1) return fallback
  return Math.min(numeric, max)
}

function toPositiveNumber(value: unknown, fallback: number, max = Number.POSITIVE_INFINITY) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.min(numeric, max)
}

function normalizeAcceptToken(token: string) {
  const normalized = token.trim().toLowerCase()
  if (!normalized) return ''
  if (normalized.includes('/') || normalized.endsWith('/*') || normalized.startsWith('.')) return normalized
  return `.${normalized.replace(/^\.+/, '')}`
}

export function sanitizeUploadAccept(value: unknown) {
  const raw = String(value || '')
  const tokens = raw
    .split(',')
    .map(normalizeAcceptToken)
    .filter(Boolean)

  const unique = Array.from(new Set(tokens))
  return unique.join(',') || DEFAULT_UPLOAD_ACCEPT
}

export function normalizeUploadQuestionConfig(question: { upload?: UploadQuestionConfig; validation?: Record<string, unknown> } | null | undefined): NormalizedUploadQuestionConfig {
  const upload = question?.upload && typeof question.upload === 'object' ? question.upload : {}
  const legacyValidation = question?.validation && typeof question.validation === 'object' ? question.validation : {}

  return {
    maxFiles: toPositiveInt(upload.maxFiles ?? legacyValidation.maxFiles, DEFAULT_UPLOAD_MAX_FILES, MAX_UPLOAD_FILES),
    maxSizeMb: toPositiveNumber(upload.maxSizeMb ?? legacyValidation.maxSizeMb ?? legacyValidation.maxSize, DEFAULT_UPLOAD_MAX_SIZE_MB, DEFAULT_UPLOAD_MAX_SIZE_MB),
    accept: sanitizeUploadAccept(upload.accept ?? legacyValidation.accept)
  }
}

export function buildUploadQuestionHelpText(question: { upload?: UploadQuestionConfig; validation?: Record<string, unknown> } | null | undefined) {
  const config = normalizeUploadQuestionConfig(question)
  return `支持 ${config.accept}，单文件不超过 ${config.maxSizeMb}MB，最多上传 ${config.maxFiles} 个文件`
}

function getFileExtension(filename: string) {
  const match = String(filename || '').toLowerCase().match(/(\.[^.]+)$/)
  return match ? match[1] : ''
}

function fileMatchesAcceptToken(file: File, token: string) {
  if (!token) return true
  if (token.endsWith('/*')) {
    const prefix = token.slice(0, -1)
    return String(file.type || '').toLowerCase().startsWith(prefix)
  }
  if (token.includes('/')) {
    return String(file.type || '').toLowerCase() === token
  }
  return getFileExtension(file.name) === token
}

export function validateSelectedUploadFiles(
  question: { upload?: UploadQuestionConfig; validation?: Record<string, unknown> } | null | undefined,
  currentCount: number,
  files: File[]
) {
  const config = normalizeUploadQuestionConfig(question)
  const totalCount = Number(currentCount || 0) + files.length

  if (totalCount > config.maxFiles) {
    return `最多上传 ${config.maxFiles} 个文件`
  }

  const maxBytes = config.maxSizeMb * 1024 * 1024
  const acceptTokens = config.accept.split(',').map(token => token.trim()).filter(Boolean)

  for (const file of files) {
    if (Number(file.size || 0) > maxBytes) {
      return `${file.name} 超过 ${config.maxSizeMb}MB 限制`
    }
    if (acceptTokens.length > 0 && !acceptTokens.some(token => fileMatchesAcceptToken(file, token))) {
      return `${file.name} 不符合允许的文件格式`
    }
  }

  return ''
}

export function getUploadSubmissionToken(storageKey: string) {
  if (typeof window === 'undefined') return generateQuestionId('sub')
  const key = `upload_submission:${storageKey}`
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const created = generateQuestionId('sub')
  window.sessionStorage.setItem(key, created)
  return created
}

export function clearUploadSubmissionToken(storageKey: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(`upload_submission:${storageKey}`)
}
