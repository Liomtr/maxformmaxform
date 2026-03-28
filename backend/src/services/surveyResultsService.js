import { performance } from 'node:perf_hooks'
import Answer from '../models/Answer.js'
import SurveyResultsSnapshot from '../models/SurveyResultsSnapshot.js'
import { normalizeSurveyQuestions } from '../utils/questionSchema.js'
import { buildQuestionStats as buildSharedQuestionStats } from '../../../shared/questionModel.js'

const LARGE_SAMPLE_THRESHOLD = 1000
const MEDIUM_SAMPLE_THRESHOLD = 100

function createSurveyResultsObservabilityState() {
  return {
    requests: 0,
    hits: 0,
    misses: 0,
    rebuilds: 0,
    readErrors: 0,
    persistErrors: 0,
    lastHitAt: null,
    lastMissAt: null,
    lastMissReason: null,
    lastRebuildAt: null,
    lastRebuildDurationMs: null,
    maxRebuildDurationMs: null,
    totalRebuildDurationMs: 0
  }
}

const surveyResultsObservability = createSurveyResultsObservabilityState()

function toFiniteNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function roundMetric(value, digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return Number(numeric.toFixed(digits))
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

function toTimestamp(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  const timestamp = date.getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function getSurveyUpdatedAt(survey) {
  return survey?.updated_at || survey?.updatedAt || null
}

function buildResultsSourceState({ survey, answerState }) {
  return {
    answerCount: Number(answerState?.answerCount || 0),
    latestAnswerId: answerState?.latestAnswerId == null ? null : Number(answerState.latestAnswerId),
    latestSubmittedAt: answerState?.latestSubmittedAt || null,
    surveyUpdatedAt: getSurveyUpdatedAt(survey)
  }
}

function isSnapshotFresh(snapshot, sourceState) {
  if (!snapshot?.payload) return false

  return Number(snapshot.answerCount || 0) === Number(sourceState.answerCount || 0) &&
    Number(snapshot.latestAnswerId || 0) === Number(sourceState.latestAnswerId || 0) &&
    toTimestamp(snapshot.latestSubmittedAt) === toTimestamp(sourceState.latestSubmittedAt) &&
    toTimestamp(snapshot.surveyUpdatedAt) === toTimestamp(sourceState.surveyUpdatedAt)
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

function stripObservability(payload) {
  if (!payload || typeof payload !== 'object') return payload
  const { observability, ...rest } = payload
  return rest
}

function classifySampleTier(answerCount) {
  const numeric = Number(answerCount || 0)
  if (numeric >= LARGE_SAMPLE_THRESHOLD) return 'large'
  if (numeric >= MEDIUM_SAMPLE_THRESHOLD) return 'medium'
  return 'small'
}

function recordSnapshotHit() {
  surveyResultsObservability.requests += 1
  surveyResultsObservability.hits += 1
  surveyResultsObservability.lastHitAt = new Date().toISOString()
}

function recordSnapshotMiss(reason) {
  surveyResultsObservability.requests += 1
  surveyResultsObservability.misses += 1
  surveyResultsObservability.lastMissAt = new Date().toISOString()
  surveyResultsObservability.lastMissReason = reason || null
}

function recordSnapshotRebuild(durationMs) {
  surveyResultsObservability.rebuilds += 1
  surveyResultsObservability.lastRebuildAt = new Date().toISOString()
  surveyResultsObservability.lastRebuildDurationMs = durationMs
  surveyResultsObservability.totalRebuildDurationMs += Number(durationMs || 0)
  surveyResultsObservability.maxRebuildDurationMs = surveyResultsObservability.maxRebuildDurationMs == null
    ? durationMs
    : Math.max(surveyResultsObservability.maxRebuildDurationMs, durationMs)
}

function recordSnapshotReadError() {
  surveyResultsObservability.readErrors += 1
}

function recordSnapshotPersistError() {
  surveyResultsObservability.persistErrors += 1
}

function buildSnapshotObservability({ accessMode, missReason, rebuildDurationMs }) {
  const requestCount = surveyResultsObservability.requests
  const rebuildCount = surveyResultsObservability.rebuilds

  return {
    scope: 'process',
    window: 'process-lifetime',
    currentAccessMode: accessMode,
    currentMissReason: missReason || null,
    requests: requestCount,
    hits: surveyResultsObservability.hits,
    misses: surveyResultsObservability.misses,
    hitRate: requestCount > 0
      ? Number(((surveyResultsObservability.hits / requestCount) * 100).toFixed(1))
      : 0,
    rebuilds: rebuildCount,
    readErrors: surveyResultsObservability.readErrors,
    persistErrors: surveyResultsObservability.persistErrors,
    lastHitAt: surveyResultsObservability.lastHitAt,
    lastMissAt: surveyResultsObservability.lastMissAt,
    lastMissReason: surveyResultsObservability.lastMissReason,
    lastRebuildAt: surveyResultsObservability.lastRebuildAt,
    rebuildDurationMs: {
      current: rebuildDurationMs,
      last: surveyResultsObservability.lastRebuildDurationMs,
      avg: rebuildCount > 0
        ? roundMetric(surveyResultsObservability.totalRebuildDurationMs / rebuildCount)
        : null,
      max: surveyResultsObservability.maxRebuildDurationMs
    }
  }
}

function buildBaselineObservability({ payload, sourceState, questionCount, accessMode, requestDurationMs, rebuildDurationMs }) {
  const answerCount = Number(sourceState?.answerCount || payload?.totalSubmissions || 0)
  const systemStats = payload?.systemStats || {}

  return {
    requestDurationMs: roundMetric(requestDurationMs),
    snapshotAccessMode: accessMode,
    rebuildDurationMs,
    answerCount,
    questionCount,
    questionStatCount: Array.isArray(payload?.questionStats) ? payload.questionStats.length : 0,
    trendPointCount: Array.isArray(payload?.submissionTrend) ? payload.submissionTrend.length : 0,
    regionBucketCount: Array.isArray(payload?.regionStats?.items) ? payload.regionStats.items.length : 0,
    systemBucketCount: ['devices', 'browsers', 'operatingSystems']
      .reduce((total, key) => total + (Array.isArray(systemStats[key]) ? systemStats[key].length : 0), 0),
    corePayloadBytes: Buffer.byteLength(JSON.stringify(payload || {}), 'utf8'),
    largeSample: answerCount >= LARGE_SAMPLE_THRESHOLD,
    largeSampleThreshold: LARGE_SAMPLE_THRESHOLD,
    sampleTier: classifySampleTier(answerCount)
  }
}

function withResultsObservability({ payload, sourceState, questionCount, accessMode, missReason = null, requestDurationMs, rebuildDurationMs = null }) {
  const corePayload = stripObservability(payload)

  return {
    ...corePayload,
    observability: {
      snapshot: buildSnapshotObservability({ accessMode, missReason, rebuildDurationMs }),
      baseline: buildBaselineObservability({
        payload: corePayload,
        sourceState,
        questionCount,
        accessMode,
        requestDurationMs,
        rebuildDurationMs
      })
    }
  }
}

function buildSurveyResultsPayload({ survey, submissions, normalizedQuestions }) {
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

export function resetSurveyResultsObservability() {
  Object.assign(surveyResultsObservability, createSurveyResultsObservabilityState())
}

export async function invalidateSurveyResultsSnapshot({ surveyId }, options = {}) {
  return SurveyResultsSnapshot.deleteBySurveyId(surveyId, options)
}

export async function invalidateSurveyResultsSnapshots({ surveyIds }, options = {}) {
  return SurveyResultsSnapshot.deleteBySurveyIds(surveyIds, options)
}

export async function getSurveyResults({ survey }) {
  const requestStartedAt = performance.now()
  const normalizedQuestions = normalizeSurveyQuestions(survey?.questions || [])
  const sourceState = buildResultsSourceState({
    survey,
    answerState: await Answer.getAggregateState(survey.id)
  })

  try {
    const snapshot = await SurveyResultsSnapshot.findBySurveyId(survey.id)
    if (isSnapshotFresh(snapshot, sourceState)) {
      recordSnapshotHit()
      return withResultsObservability({
        payload: snapshot.payload,
        sourceState,
        questionCount: normalizedQuestions.length,
        accessMode: 'snapshot-hit',
        requestDurationMs: performance.now() - requestStartedAt
      })
    }

    recordSnapshotMiss(snapshot?.payload ? 'stale' : 'missing')
  } catch (error) {
    recordSnapshotMiss('snapshot-read-error')
    recordSnapshotReadError()
    console.error('Failed to read survey results snapshot:', error.message)
  }

  const rebuildStartedAt = performance.now()
  const submissions = await Answer.findBySurveyId(survey.id)
  const payload = buildSurveyResultsPayload({ survey, submissions, normalizedQuestions })

  try {
    await SurveyResultsSnapshot.upsert({
      surveyId: survey.id,
      payload,
      ...sourceState
    })
  } catch (error) {
    recordSnapshotPersistError()
    console.error('Failed to persist survey results snapshot:', error.message)
  }

  const rebuildDurationMs = roundMetric(performance.now() - rebuildStartedAt)
  recordSnapshotRebuild(rebuildDurationMs)

  return withResultsObservability({
    payload,
    sourceState,
    questionCount: normalizedQuestions.length,
    accessMode: 'snapshot-rebuild',
    missReason: surveyResultsObservability.lastMissReason,
    requestDurationMs: performance.now() - requestStartedAt,
    rebuildDurationMs
  })
}
