import { toTimestamp } from './surveyResultsSnapshotState.js'

const LARGE_SAMPLE_THRESHOLD = 1000
const MEDIUM_SAMPLE_THRESHOLD = 100

function createState() {
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

function roundMetric(value, digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return Number(numeric.toFixed(digits))
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

function buildSnapshotRecordObservability(snapshot) {
  const createdAt = snapshot?.createdAt || snapshot?.created_at || null
  const updatedAt = snapshot?.updatedAt || snapshot?.updated_at || null
  const updatedTimestamp = toTimestamp(updatedAt)

  return {
    exists: Boolean(snapshot),
    createdAt,
    updatedAt,
    ageMs: updatedTimestamp == null ? null : Math.max(0, Date.now() - updatedTimestamp),
    answerCount: snapshot == null ? null : Number(snapshot.answerCount || 0),
    latestAnswerId: snapshot?.latestAnswerId == null ? null : Number(snapshot.latestAnswerId),
    latestSubmittedAt: snapshot?.latestSubmittedAt || null,
    surveyUpdatedAt: snapshot?.surveyUpdatedAt || null
  }
}

function buildSnapshotSourceObservability(sourceState) {
  return {
    answerCount: Number(sourceState?.answerCount || 0),
    latestAnswerId: sourceState?.latestAnswerId == null ? null : Number(sourceState.latestAnswerId),
    latestSubmittedAt: sourceState?.latestSubmittedAt || null,
    surveyUpdatedAt: sourceState?.surveyUpdatedAt || null
  }
}

function buildSnapshotObservability({ state, accessMode, missReason, rebuildDurationMs, snapshot, sourceState }) {
  return {
    scope: 'process',
    window: 'process-lifetime',
    currentAccessMode: accessMode,
    currentMissReason: missReason || null,
    record: buildSnapshotRecordObservability(snapshot),
    source: buildSnapshotSourceObservability(sourceState),
    requests: state.requests,
    hits: state.hits,
    misses: state.misses,
    hitRate: state.requests > 0
      ? Number(((state.hits / state.requests) * 100).toFixed(1))
      : 0,
    rebuilds: state.rebuilds,
    readErrors: state.readErrors,
    persistErrors: state.persistErrors,
    lastHitAt: state.lastHitAt,
    lastMissAt: state.lastMissAt,
    lastMissReason: state.lastMissReason,
    lastRebuildAt: state.lastRebuildAt,
    rebuildDurationMs: {
      current: rebuildDurationMs,
      last: state.lastRebuildDurationMs,
      avg: state.rebuilds > 0
        ? roundMetric(state.totalRebuildDurationMs / state.rebuilds)
        : null,
      max: state.maxRebuildDurationMs
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

export function createSurveyResultsObservabilityTracker() {
  const state = createState()

  return {
    reset() {
      Object.assign(state, createState())
    },

    recordSnapshotHit() {
      state.requests += 1
      state.hits += 1
      state.lastHitAt = new Date().toISOString()
    },

    recordSnapshotMiss(reason) {
      state.requests += 1
      state.misses += 1
      state.lastMissAt = new Date().toISOString()
      state.lastMissReason = reason || null
    },

    recordSnapshotRebuild(durationMs) {
      state.rebuilds += 1
      state.lastRebuildAt = new Date().toISOString()
      state.lastRebuildDurationMs = durationMs
      state.totalRebuildDurationMs += Number(durationMs || 0)
      state.maxRebuildDurationMs = state.maxRebuildDurationMs == null
        ? durationMs
        : Math.max(state.maxRebuildDurationMs, durationMs)
    },

    recordSnapshotReadError() {
      state.readErrors += 1
    },

    recordSnapshotPersistError() {
      state.persistErrors += 1
    },

    getLastMissReason() {
      return state.lastMissReason
    },

    withResultsObservability({
      payload,
      sourceState,
      questionCount,
      accessMode,
      missReason = null,
      requestDurationMs,
      rebuildDurationMs = null,
      snapshot = null
    }) {
      const corePayload = stripObservability(payload)

      return {
        ...corePayload,
        observability: {
          snapshot: buildSnapshotObservability({
            state,
            accessMode,
            missReason,
            rebuildDurationMs,
            snapshot,
            sourceState
          }),
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
  }
}
