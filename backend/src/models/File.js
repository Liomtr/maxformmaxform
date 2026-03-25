import knex from '../db/knex.js'

const TABLE = 'files'

const File = {
  async findById(id) {
    return knex(TABLE).where('id', id).first()
  },

  async findByIds(ids = [], { survey_id } = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return []
    let q = knex(TABLE).whereIn('id', ids)
    if (survey_id !== undefined) q = q.where('survey_id', survey_id)
    return q
  },

  async countPendingBySurveyQuestionSession(survey_id, question_order, submission_token) {
    return knex(TABLE)
      .where('survey_id', survey_id)
      .where('question_order', question_order)
      .where('submission_token', submission_token)
      .whereNull('answer_id')
      .count('* as cnt')
      .first()
      .then(row => Number(row?.cnt || 0))
  },

  async create({ name, url, size, type, uploader_id, survey_id = null, public_token = null, question_order = null, submission_token = null, answer_id = null }) {
    const [id] = await knex(TABLE).insert({ name, url, size, type, uploader_id, survey_id, public_token, question_order, submission_token, answer_id })
    return File.findById(id)
  },

  async attachToAnswer(ids = [], answer_id) {
    if (!Array.isArray(ids) || ids.length === 0) return 0
    return knex(TABLE)
      .whereIn('id', ids)
      .update({ answer_id, submission_token: null })
  },

  async listExpiredPending(cutoff) {
    return knex(TABLE)
      .whereNull('answer_id')
      .whereNotNull('submission_token')
      .where('created_at', '<', cutoff)
  },

  async listPendingBySubmission(survey_id, submission_token) {
    if (!submission_token) return []
    return knex(TABLE)
      .where('survey_id', survey_id)
      .where('submission_token', submission_token)
      .whereNull('answer_id')
  },

  async deleteByIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0
    return knex(TABLE).whereIn('id', ids).del()
  },

  async delete(id) {
    return knex(TABLE).where('id', id).del()
  },

  async list({ page = 1, pageSize = 20, uploader_id, survey_id } = {}) {
    let q = knex(TABLE)
    if (uploader_id !== undefined) q = q.where('uploader_id', uploader_id)
    if (survey_id !== undefined) q = q.where('survey_id', survey_id)
    const total = await q.clone().count('* as cnt').first().then(r => r.cnt)
    const list = await q.orderBy('created_at', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    return { total, list }
  },

  async listAnswerFilesBySurveyId(survey_id) {
    return knex(TABLE)
      .where('survey_id', survey_id)
      .whereNotNull('answer_id')
      .orderBy([{ column: 'answer_id', order: 'asc' }, { column: 'id', order: 'asc' }])
  }
}

export default File
