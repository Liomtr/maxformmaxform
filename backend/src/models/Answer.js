import knex from '../db/knex.js'

const TABLE = 'answers'

function getDb(options = {}) {
  return options.db || knex
}

function parseJson(row) {
  if (!row) return null
  if (typeof row.answers_data === 'string') row.answers_data = JSON.parse(row.answers_data)
  return row
}

const Answer = {
  async findById(id, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE).where('id', id).first()
    return parseJson(row)
  },

  async create({ survey_id, answers_data, ip_address, user_agent, duration, status = 'completed' }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      survey_id,
      answers_data: JSON.stringify(answers_data),
      ip_address, user_agent, duration, status
    })
    return Answer.findById(id, options)
  },

  async list({ survey_id, page = 1, pageSize = 20, startTime, endTime } = {}) {
    let q = knex(TABLE)
    if (survey_id) q = q.where('survey_id', survey_id)
    if (startTime) q = q.where('submitted_at', '>=', startTime)
    if (endTime) q = q.where('submitted_at', '<=', endTime)
    const total = await q.clone().count('* as cnt').first().then(r => r.cnt)
    const list = await q.orderBy('submitted_at', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    return { total, list: list.map(parseJson) }
  },

  async count(survey_id, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE).where('survey_id', survey_id).count('* as cnt').first()
    return row.cnt
  },

  async getAggregateState(survey_id, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE)
      .where('survey_id', survey_id)
      .count({ answer_count: '*' })
      .max({ latest_answer_id: 'id' })
      .max({ latest_submitted_at: 'submitted_at' })
      .first()

    return {
      answerCount: Number(row?.answer_count || 0),
      latestAnswerId: row?.latest_answer_id == null ? null : Number(row.latest_answer_id),
      latestSubmittedAt: row?.latest_submitted_at || null
    }
  },

  async countByIp(survey_id, ip_address) {
    if (!ip_address) return 0
    const row = await knex(TABLE)
      .where('survey_id', survey_id)
      .where('ip_address', ip_address)
      .count('* as cnt')
      .first()
    return Number(row?.cnt || 0)
  },

  async lastSubmission(survey_id) {
    const row = await knex(TABLE).where('survey_id', survey_id).orderBy('submitted_at', 'desc').first()
    return parseJson(row)
  },

  async deleteBatch(ids, options = {}) {
    const db = getDb(options)
    if (!Array.isArray(ids) || ids.length === 0) return 0
    return db(TABLE).whereIn('id', ids).del()
  },

  async findBySurveyId(survey_id) {
    const rows = await knex(TABLE).where('survey_id', survey_id).orderBy('submitted_at', 'desc')
    return rows.map(parseJson)
  },

  async deleteBySurveyIds(surveyIds, options = {}) {
    const db = getDb(options)
    if (!Array.isArray(surveyIds) || surveyIds.length === 0) return 0
    return db(TABLE).whereIn('survey_id', surveyIds).del()
  }
}

export default Answer
