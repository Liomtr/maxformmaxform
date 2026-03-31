import { performance } from 'node:perf_hooks'
import answerRepository from '../repositories/answerRepository.js'
import surveyResultsSnapshotRepository from '../repositories/surveyResultsSnapshotRepository.js'
import { getSurveyForManagement } from './surveyAccessService.js'
import { normalizeSurveyQuestions } from '../utils/questionSchema.js'
import { createSurveyResultsObservabilityTracker } from '../utils/surveyResultsObservability.js'
import { buildSurveyResultsPayload } from '../utils/surveyResultsPayload.js'
import { buildResultsSourceState, isSnapshotFresh } from '../utils/surveyResultsSnapshotState.js'

const surveyResultsObservability = createSurveyResultsObservabilityTracker()

function roundMetric(value, digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return Number(numeric.toFixed(digits))
}

export function resetSurveyResultsObservability() {
  surveyResultsObservability.reset()
}

export async function getManagedSurveyResults({ actor, identifier }) {
  const survey = await getSurveyForManagement({ actor, identifier })
  return getSurveyResults({ survey })
}

export async function getSurveyResults({ survey }) {
  const requestStartedAt = performance.now()
  const normalizedQuestions = normalizeSurveyQuestions(survey?.questions || [])
  const sourceState = buildResultsSourceState({
    survey,
    answerState: await answerRepository.getAggregateState(survey.id)
  })
  let observedSnapshot = null

  try {
    const snapshot = await surveyResultsSnapshotRepository.findBySurveyId(survey.id)
    observedSnapshot = snapshot
    if (isSnapshotFresh(snapshot, sourceState)) {
      surveyResultsObservability.recordSnapshotHit()
      return surveyResultsObservability.withResultsObservability({
        payload: snapshot.payload,
        sourceState,
        questionCount: normalizedQuestions.length,
        accessMode: 'snapshot-hit',
        requestDurationMs: performance.now() - requestStartedAt,
        snapshot
      })
    }

    surveyResultsObservability.recordSnapshotMiss(snapshot?.payload ? 'stale' : 'missing')
  } catch (error) {
    surveyResultsObservability.recordSnapshotMiss('snapshot-read-error')
    surveyResultsObservability.recordSnapshotReadError()
    console.error('Failed to read survey results snapshot:', error.message)
  }

  const rebuildStartedAt = performance.now()
  const submissions = await answerRepository.listBySurveyId(survey.id)
  const payload = buildSurveyResultsPayload({ survey, submissions, normalizedQuestions })

  try {
    observedSnapshot = await surveyResultsSnapshotRepository.upsert({
      surveyId: survey.id,
      payload,
      ...sourceState
    })
  } catch (error) {
    surveyResultsObservability.recordSnapshotPersistError()
    console.error('Failed to persist survey results snapshot:', error.message)
  }

  const rebuildDurationMs = roundMetric(performance.now() - rebuildStartedAt)
  surveyResultsObservability.recordSnapshotRebuild(rebuildDurationMs)

  return surveyResultsObservability.withResultsObservability({
    payload,
    sourceState,
    questionCount: normalizedQuestions.length,
    accessMode: 'snapshot-rebuild',
    missReason: surveyResultsObservability.getLastMissReason(),
    requestDurationMs: performance.now() - requestStartedAt,
    rebuildDurationMs,
    snapshot: observedSnapshot
  })
}
