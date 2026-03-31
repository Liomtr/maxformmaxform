import { normalizeSurveyQuestions } from './questionSchema.js'
import { buildQuestionStats as buildSharedQuestionStats } from '../../../shared/questionModel.js'

function toFiniteNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toRoundedAverage(values, digits = 2) {
  if (!Array.isArray(values) || values.length === 0) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return Number((total / values.length).toFixed(digits))
}

function formatDuration(seconds) {
  const numeric = toFiniteNumber(seconds)
  if (numeric == null) return '0s'

  const rounded = Math.max(0, Math.round(numeric))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const secs = rounded % 60

  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

function buildResultsSummary(submissions) {
  const totalSubmissions = submissions.length
  const completed = submissions.filter(item => item?.status !== 'incomplete').length
  const incomplete = Math.max(0, totalSubmissions - completed)
  const completionRate = totalSubmissions > 0
    ? Number(((completed / totalSubmissions) * 100).toFixed(1))
    : 0

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const today = submissions.filter(item => {
    const submittedAt = new Date(item?.submitted_at || 0)
    return !Number.isNaN(submittedAt.getTime()) && submittedAt >= todayStart
  }).length

  const durationValues = submissions
    .map(item => toFiniteNumber(item?.duration))
    .filter(value => value != null)
  const avgDurationSeconds = toRoundedAverage(durationValues)

  return {
    totalSubmissions,
    total: totalSubmissions,
    today,
    completed,
    incomplete,
    completionRate,
    avgDuration: avgDurationSeconds == null ? '0s' : formatDuration(avgDurationSeconds),
    avgTime: avgDurationSeconds,
    lastSubmitAt: submissions[0]?.submitted_at || null
  }
}

function buildCountList(values) {
  const counts = new Map()
  for (const value of values) {
    const key = String(value || 'Other')
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .map(([label, count]) => ({ label, value: String(count) }))
}

function detectDeviceType(userAgent) {
  const ua = String(userAgent || '')
  if (!ua) return 'Other'
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'Tablet'
  if (/iPhone|iPod|Android.*Mobile|Mobile|Windows Phone/i.test(ua)) return 'Mobile'
  if (/Windows NT|Macintosh|X11|Linux/i.test(ua)) return 'Desktop'
  if (/node|undici/i.test(ua)) return 'Script'
  return 'Other'
}

function detectBrowser(userAgent) {
  const ua = String(userAgent || '')
  if (!ua) return 'Other'
  if (/MicroMessenger/i.test(ua)) return 'WeChat'
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\//i.test(ua)) return 'Opera'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua) && /Version\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari'
  if (/node|undici/i.test(ua)) return 'Node.js'
  return 'Other'
}

function detectOperatingSystem(userAgent) {
  const ua = String(userAgent || '')
  if (!ua) return 'Other'
  if (/Windows NT/i.test(ua)) return 'Windows'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'Linux'
  if (/node|undici/i.test(ua)) return 'Server'
  return 'Other'
}

function buildSystemStats(submissions) {
  const userAgents = submissions
    .map(item => String(item?.user_agent || '').trim())
    .filter(Boolean)

  return {
    devices: buildCountList(userAgents.map(detectDeviceType)),
    browsers: buildCountList(userAgents.map(detectBrowser)),
    operatingSystems: buildCountList(userAgents.map(detectOperatingSystem))
  }
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateShort(dateKey) {
  return String(dateKey || '').slice(5)
}

function buildSubmissionTrend(submissions, days = 30) {
  const normalizedDays = Math.max(1, Number(days) || 30)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = new Map()
  for (let offset = normalizedDays - 1; offset >= 0; offset -= 1) {
    const current = new Date(today)
    current.setDate(today.getDate() - offset)
    buckets.set(formatDateKey(current), 0)
  }

  for (const submission of submissions) {
    const submittedAt = new Date(submission?.submitted_at || 0)
    if (Number.isNaN(submittedAt.getTime())) continue
    const key = formatDateKey(submittedAt)
    if (!buckets.has(key)) continue
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    label: formatDateShort(date),
    count
  }))
}

function buildRegionStats(submissions) {
  const normalized = submissions
    .map(item => {
      const province = String(item?.province || item?.province_name || item?.geo_province || '').trim()
      const city = String(item?.city || item?.city_name || item?.geo_city || '').trim()
      const label = province || city
        ? [province, city].filter(Boolean).join(' / ')
        : ''
      return { label }
    })

  const locatedItems = normalized.filter(item => item.label)
  const missingCount = normalized.length - locatedItems.length
  const items = buildCountList(locatedItems.map(item => item.label))

  return {
    hasLocationData: items.length > 0,
    scope: 'submission-origin',
    missingCount,
    items,
    emptyReason: items.length > 0 ? null : 'No province/city source is stored for submissions yet.'
  }
}

export function buildSurveyResultsPayload({ survey, submissions, normalizedQuestions }) {
  const summary = buildResultsSummary(submissions)
  const resolvedQuestions = Array.isArray(normalizedQuestions)
    ? normalizedQuestions
    : normalizeSurveyQuestions(survey?.questions || [])
  const questionStats = buildSharedQuestionStats(resolvedQuestions, submissions)

  return {
    ...summary,
    submissionTrend: buildSubmissionTrend(submissions),
    regionStats: buildRegionStats(submissions),
    systemStats: buildSystemStats(submissions),
    questionStats
  }
}
