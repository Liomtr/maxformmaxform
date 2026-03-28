import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import Answer from '../src/models/Answer.js'
import SurveyResultsSnapshot from '../src/models/SurveyResultsSnapshot.js'
import { getSurveyResults, resetSurveyResultsObservability } from '../src/services/surveyResultsService.js'

const originalAnswerFindBySurveyId = Answer.findBySurveyId
const originalAnswerGetAggregateState = Answer.getAggregateState
const originalSnapshotFindBySurveyId = SurveyResultsSnapshot.findBySurveyId
const originalSnapshotUpsert = SurveyResultsSnapshot.upsert

afterEach(() => {
  Answer.findBySurveyId = originalAnswerFindBySurveyId
  Answer.getAggregateState = originalAnswerGetAggregateState
  SurveyResultsSnapshot.findBySurveyId = originalSnapshotFindBySurveyId
  SurveyResultsSnapshot.upsert = originalSnapshotUpsert
  resetSurveyResultsObservability()
})

test('getSurveyResults returns empty-state statistics for surveys without submissions', async () => {
  let persistedSnapshot = null

  Answer.getAggregateState = async () => ({
    answerCount: 0,
    latestAnswerId: null,
    latestSubmittedAt: null
  })
  Answer.findBySurveyId = async () => []
  SurveyResultsSnapshot.findBySurveyId = async () => null
  SurveyResultsSnapshot.upsert = async payload => {
    persistedSnapshot = payload
    return payload
  }

  const result = await getSurveyResults({
    survey: {
      id: 101,
      questions: [],
      updated_at: '2026-03-28T10:00:00.000Z'
    }
  })

  assert.equal(result.totalSubmissions, 0)
  assert.equal(result.completed, 0)
  assert.equal(result.incomplete, 0)
  assert.equal(result.completionRate, 0)
  assert.equal(result.avgDuration, '0s')
  assert.equal(result.avgTime, null)
  assert.equal(result.lastSubmitAt, null)
  assert.equal(result.submissionTrend.length, 30)
  assert.ok(result.submissionTrend.every(item => item.count === 0))
  assert.deepEqual(result.systemStats, {
    devices: [],
    browsers: [],
    operatingSystems: []
  })
  assert.deepEqual(result.regionStats, {
    hasLocationData: false,
    scope: 'submission-origin',
    missingCount: 0,
    items: [],
    emptyReason: 'No province/city source is stored for submissions yet.'
  })
  assert.deepEqual(result.questionStats, [])
  assert.equal(result.observability.snapshot.currentAccessMode, 'snapshot-rebuild')
  assert.equal(result.observability.snapshot.currentMissReason, 'missing')
  assert.equal(result.observability.snapshot.hitRate, 0)
  assert.equal(result.observability.baseline.largeSample, false)
  assert.equal(persistedSnapshot?.surveyId, 101)
  assert.equal(persistedSnapshot?.answerCount, 0)
})

test('getSurveyResults computes summary and platform breakdown for mixed submissions', async () => {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  Answer.getAggregateState = async () => ({
    answerCount: 2,
    latestAnswerId: 2,
    latestSubmittedAt: now.toISOString()
  })
  SurveyResultsSnapshot.findBySurveyId = async () => null
  SurveyResultsSnapshot.upsert = async payload => payload
  Answer.findBySurveyId = async () => ([
    {
      id: 1,
      status: 'completed',
      duration: 65,
      user_agent: 'node',
      submitted_at: now.toISOString(),
      province: 'Guangdong',
      city: 'Shenzhen',
      answers_data: []
    },
    {
      id: 2,
      status: 'incomplete',
      duration: 35,
      user_agent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36',
      submitted_at: oneHourAgo.toISOString(),
      province_name: 'Zhejiang',
      city_name: 'Hangzhou',
      answers_data: []
    }
  ])

  const result = await getSurveyResults({
    survey: {
      id: 102,
      questions: [],
      updated_at: '2026-03-28T10:00:00.000Z'
    }
  })

  assert.equal(result.totalSubmissions, 2)
  assert.equal(result.completed, 1)
  assert.equal(result.incomplete, 1)
  assert.equal(result.completionRate, 50)
  assert.equal(result.avgTime, 50)
  assert.equal(result.avgDuration, '50s')
  assert.deepEqual(result.systemStats.devices, [
    { label: 'Mobile', value: '1' },
    { label: 'Script', value: '1' }
  ])
  assert.deepEqual(result.systemStats.browsers, [
    { label: 'Chrome', value: '1' },
    { label: 'Node.js', value: '1' }
  ])
  assert.deepEqual(result.systemStats.operatingSystems, [
    { label: 'Android', value: '1' },
    { label: 'Server', value: '1' }
  ])
  assert.deepEqual(result.regionStats, {
    hasLocationData: true,
    scope: 'submission-origin',
    missingCount: 0,
    items: [
      { label: 'Guangdong / Shenzhen', value: '1' },
      { label: 'Zhejiang / Hangzhou', value: '1' }
    ],
    emptyReason: null
  })
  assert.equal(result.observability.snapshot.currentAccessMode, 'snapshot-rebuild')
  assert.equal(result.observability.baseline.answerCount, 2)
  assert.equal(result.observability.baseline.sampleTier, 'small')
})

test('getSurveyResults tracks snapshot hit rate across rebuild and hit requests', async () => {
  let persistedSnapshot = null
  let answerReadCount = 0

  Answer.getAggregateState = async () => ({
    answerCount: 3,
    latestAnswerId: 18,
    latestSubmittedAt: '2026-03-28T12:00:00.000Z'
  })
  SurveyResultsSnapshot.findBySurveyId = async () => persistedSnapshot
  SurveyResultsSnapshot.upsert = async payload => {
    persistedSnapshot = {
      payload: payload.payload,
      answerCount: payload.answerCount,
      latestAnswerId: payload.latestAnswerId,
      latestSubmittedAt: payload.latestSubmittedAt,
      surveyUpdatedAt: payload.surveyUpdatedAt
    }
    return persistedSnapshot
  }
  Answer.findBySurveyId = async () => {
    answerReadCount += 1
    return [
      {
        id: 18,
        status: 'completed',
        duration: 30,
        user_agent: 'node',
        submitted_at: '2026-03-28T12:00:00.000Z',
        answers_data: []
      },
      {
        id: 17,
        status: 'completed',
        duration: 32,
        user_agent: 'node',
        submitted_at: '2026-03-28T11:00:00.000Z',
        answers_data: []
      },
      {
        id: 16,
        status: 'completed',
        duration: 35,
        user_agent: 'node',
        submitted_at: '2026-03-28T10:00:00.000Z',
        answers_data: []
      }
    ]
  }

  const survey = {
    id: 103,
    questions: [],
    updated_at: '2026-03-28T09:00:00.000Z'
  }

  const rebuilt = await getSurveyResults({ survey })
  const cached = await getSurveyResults({ survey })

  assert.equal(answerReadCount, 1)
  assert.equal(rebuilt.observability.snapshot.currentAccessMode, 'snapshot-rebuild')
  assert.equal(cached.observability.snapshot.currentAccessMode, 'snapshot-hit')
  assert.equal(cached.observability.snapshot.requests, 2)
  assert.equal(cached.observability.snapshot.hits, 1)
  assert.equal(cached.observability.snapshot.misses, 1)
  assert.equal(cached.observability.snapshot.hitRate, 50)
  assert.equal(cached.totalSubmissions, 3)
})

test('getSurveyResults returns the cached snapshot when source state is unchanged', async () => {
  Answer.getAggregateState = async () => ({
    answerCount: 3,
    latestAnswerId: 18,
    latestSubmittedAt: '2026-03-28T12:00:00.000Z'
  })
  Answer.findBySurveyId = async () => {
    throw new Error('findBySurveyId should not be called when snapshot is fresh')
  }
  SurveyResultsSnapshot.findBySurveyId = async () => ({
    payload: { totalSubmissions: 3, total: 3, questionStats: [] },
    answerCount: 3,
    latestAnswerId: 18,
    latestSubmittedAt: '2026-03-28T12:00:00.000Z',
    surveyUpdatedAt: '2026-03-28T09:00:00.000Z'
  })

  const result = await getSurveyResults({
    survey: {
      id: 103,
      questions: [],
      updated_at: '2026-03-28T09:00:00.000Z'
    }
  })

  assert.equal(result.totalSubmissions, 3)
  assert.equal(result.total, 3)
  assert.deepEqual(result.questionStats, [])
  assert.equal(result.observability.snapshot.currentAccessMode, 'snapshot-hit')
  assert.equal(result.observability.snapshot.hitRate, 100)
})

test('getSurveyResults rebuilds and persists the snapshot when source state is stale', async () => {
  let persistedSnapshot = null

  Answer.getAggregateState = async () => ({
    answerCount: 1,
    latestAnswerId: 9,
    latestSubmittedAt: '2026-03-28T12:00:00.000Z'
  })
  SurveyResultsSnapshot.findBySurveyId = async () => ({
    payload: { totalSubmissions: 99 },
    answerCount: 2,
    latestAnswerId: 8,
    latestSubmittedAt: '2026-03-27T12:00:00.000Z',
    surveyUpdatedAt: '2026-03-27T09:00:00.000Z'
  })
  SurveyResultsSnapshot.upsert = async payload => {
    persistedSnapshot = payload
    return payload
  }
  Answer.findBySurveyId = async () => ([
    {
      id: 9,
      status: 'completed',
      duration: 45,
      user_agent: 'node',
      submitted_at: '2026-03-28T12:00:00.000Z',
      answers_data: []
    }
  ])

  const result = await getSurveyResults({
    survey: {
      id: 104,
      questions: [],
      updated_at: '2026-03-28T09:00:00.000Z'
    }
  })

  assert.equal(result.totalSubmissions, 1)
  assert.equal(persistedSnapshot?.surveyId, 104)
  assert.equal(persistedSnapshot?.answerCount, 1)
  assert.equal(persistedSnapshot?.latestAnswerId, 9)
  assert.equal(result.observability.snapshot.currentAccessMode, 'snapshot-rebuild')
  assert.equal(result.observability.snapshot.currentMissReason, 'stale')
  assert.equal(result.observability.snapshot.rebuilds, 1)
  assert.ok(result.observability.snapshot.rebuildDurationMs.current >= 0)
})

test('getSurveyResults exposes large-sample baseline metrics', async () => {
  const submissions = Array.from({ length: 1200 }, (_, index) => ({
    id: index + 1,
    status: 'completed',
    duration: 20 + (index % 5),
    user_agent: 'node',
    submitted_at: '2026-03-28T12:00:00.000Z',
    answers_data: [{ questionId: 1, questionType: 'radio', value: index % 2 === 0 ? 'yes' : 'no' }]
  }))

  Answer.getAggregateState = async () => ({
    answerCount: submissions.length,
    latestAnswerId: submissions.length,
    latestSubmittedAt: '2026-03-28T12:00:00.000Z'
  })
  SurveyResultsSnapshot.findBySurveyId = async () => null
  SurveyResultsSnapshot.upsert = async payload => payload
  Answer.findBySurveyId = async () => submissions

  const result = await getSurveyResults({
    survey: {
      id: 105,
      updated_at: '2026-03-28T09:00:00.000Z',
      questions: [
        {
          id: 1,
          type: 'radio',
          title: 'Choice',
          options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]
        }
      ]
    }
  })

  assert.equal(result.totalSubmissions, 1200)
  assert.equal(result.observability.baseline.answerCount, 1200)
  assert.equal(result.observability.baseline.largeSample, true)
  assert.equal(result.observability.baseline.largeSampleThreshold, 1000)
  assert.equal(result.observability.baseline.sampleTier, 'large')
  assert.equal(result.observability.baseline.questionCount, 1)
  assert.ok(result.observability.baseline.corePayloadBytes > 0)
})
