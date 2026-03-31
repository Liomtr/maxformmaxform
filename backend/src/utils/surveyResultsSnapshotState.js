function toTimestamp(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  const timestamp = date.getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function getSurveyUpdatedAt(survey) {
  return survey?.updated_at || survey?.updatedAt || null
}

export function buildResultsSourceState({ survey, answerState }) {
  return {
    answerCount: Number(answerState?.answerCount || 0),
    latestAnswerId: answerState?.latestAnswerId == null ? null : Number(answerState.latestAnswerId),
    latestSubmittedAt: answerState?.latestSubmittedAt || null,
    surveyUpdatedAt: getSurveyUpdatedAt(survey)
  }
}

export function isSnapshotFresh(snapshot, sourceState) {
  if (!snapshot?.payload) return false

  return Number(snapshot.answerCount || 0) === Number(sourceState.answerCount || 0) &&
    Number(snapshot.latestAnswerId || 0) === Number(sourceState.latestAnswerId || 0) &&
    toTimestamp(snapshot.latestSubmittedAt) === toTimestamp(sourceState.latestSubmittedAt) &&
    toTimestamp(snapshot.surveyUpdatedAt) === toTimestamp(sourceState.surveyUpdatedAt)
}

export { toTimestamp }
