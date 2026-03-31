import knex from '../db/knex.js'

const TABLE = 'question_bank_questions'

function getDb(options = {}) {
  return options.db || knex
}

function parseJsonField(value, fallback = null) {
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

function toDto(row) {
  if (!row) return null
  return {
    ...row,
    repoId: row.repo_id,
    score: row.score == null ? null : Number(row.score),
    content: parseJsonField(row.content, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const QuestionBankQuestion = {
  async findById(id, repoId, options = {}) {
    const db = getDb(options)
    let query = db(TABLE).where('id', id)
    if (repoId !== undefined) query = query.andWhere('repo_id', repoId)
    const row = await query.first()
    return toDto(row)
  },

  async listByRepoId(repoId, options = {}) {
    const db = getDb(options)
    const rows = await db(TABLE)
      .where('repo_id', repoId)
      .orderBy('id', 'asc')
    return rows.map(toDto)
  },

  async create({ repo_id, title, type = null, difficulty = null, score = null, content = null }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      repo_id,
      title,
      type,
      difficulty,
      score,
      content: content ? JSON.stringify(content) : null,
      updated_at: db.fn.now()
    })
    return QuestionBankQuestion.findById(id, repo_id, options)
  },

  async delete(id, repoId, options = {}) {
    const db = getDb(options)
    let query = db(TABLE).where('id', id)
    if (repoId !== undefined) query = query.andWhere('repo_id', repoId)
    return query.del()
  },

  async deleteByRepoId(repoId, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('repo_id', repoId).del()
  }
}

export default QuestionBankQuestion
