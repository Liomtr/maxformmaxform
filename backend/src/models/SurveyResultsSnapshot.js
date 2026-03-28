import knex from '../db/knex.js'

const TABLE = 'survey_results_snapshots'

function getDb(options = {}) {
  return options.db || knex
}

function parseJsonField(value, fallback) {
  if (value == null) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value
}

function toCompatShape(row) {
  if (!row) return null

  row.payload = parseJsonField(row.payload, null)
  row.answerCount = Number(row.answer_count || 0)
  row.latestAnswerId = row.latest_answer_id == null ? null : Number(row.latest_answer_id)
  row.latestSubmittedAt = row.latest_submitted_at || null
  row.surveyUpdatedAt = row.survey_updated_at || null
  row.createdAt = row.created_at || null
  row.updatedAt = row.updated_at || null

  return row
}

const SurveyResultsSnapshot = {
  async findBySurveyId(surveyId, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE).where('survey_id', surveyId).first()
    return toCompatShape(row)
  },

  async upsert({
    surveyId,
    payload,
    answerCount = 0,
    latestAnswerId = null,
    latestSubmittedAt = null,
    surveyUpdatedAt = null
  }, options = {}) {
    const db = getDb(options)
    const record = {
      survey_id: surveyId,
      payload: JSON.stringify(payload),
      answer_count: Number(answerCount) || 0,
      latest_answer_id: latestAnswerId == null ? null : Number(latestAnswerId),
      latest_submitted_at: latestSubmittedAt,
      survey_updated_at: surveyUpdatedAt,
      updated_at: db.fn.now()
    }

    await db(TABLE)
      .insert({
        ...record,
        created_at: db.fn.now()
      })
      .onConflict('survey_id')
      .merge(record)

    return SurveyResultsSnapshot.findBySurveyId(surveyId, options)
  },

  async deleteBySurveyId(surveyId, options = {}) {
    const db = getDb(options)
    const normalizedId = Number(surveyId)
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return 0
    return db(TABLE).where('survey_id', normalizedId).del()
  },

  async deleteBySurveyIds(surveyIds = [], options = {}) {
    const db = getDb(options)
    const normalizedIds = [...new Set(
      surveyIds
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value > 0)
    )]

    if (normalizedIds.length === 0) return 0
    return db(TABLE).whereIn('survey_id', normalizedIds).del()
  }
}

export default SurveyResultsSnapshot
