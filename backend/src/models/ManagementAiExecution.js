import knex from '../db/knex.js'

const TABLE = 'management_ai_executions'

function getDb(options = {}) {
  return options.db || knex
}

function applyListFilters(query, filters = {}) {
  const { action, status, actor_id, created_from, created_to } = filters

  if (action) query.where('action', 'like', `%${action}%`)
  if (status) query.where('status', status)
  if (actor_id != null) query.where('actor_id', Number(actor_id))
  if (created_from) query.where('created_at', '>=', created_from)
  if (created_to) query.where('created_at', '<=', created_to)

  return query
}

function toDto(row) {
  if (!row) return null

  function parseJson(value) {
    if (value == null) return null
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    }
    return value
  }

  return {
    id: row.id,
    actorId: Number(row.actor_id),
    idempotencyKey: row.idempotency_key,
    action: row.action,
    requestHash: row.request_hash,
    status: row.status,
    requestPayload: parseJson(row.request_payload),
    responsePayload: parseJson(row.response_payload),
    errorCode: row.error_code ?? null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  }
}

const ManagementAiExecution = {
  async findByActorAndKey(actorId, idempotencyKey, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE)
      .where({
        actor_id: Number(actorId),
        idempotency_key: String(idempotencyKey)
      })
      .first()
    return toDto(row)
  },

  async create(payload, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      actor_id: Number(payload.actor_id),
      idempotency_key: String(payload.idempotency_key),
      action: String(payload.action),
      request_hash: String(payload.request_hash),
      status: String(payload.status || 'pending'),
      request_payload: payload.request_payload ?? null,
      response_payload: payload.response_payload ?? null,
      error_code: payload.error_code ?? null,
      error_message: payload.error_message ?? null,
      updated_at: db.fn.now()
    })
    return db(TABLE).where('id', id).first().then(toDto)
  },

  async update(id, fields = {}, options = {}) {
    const db = getDb(options)
    const patch = {
      updated_at: db.fn.now()
    }

    if (fields.status !== undefined) patch.status = String(fields.status)
    if (Object.prototype.hasOwnProperty.call(fields, 'response_payload')) patch.response_payload = fields.response_payload ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'error_code')) patch.error_code = fields.error_code ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'error_message')) patch.error_message = fields.error_message ?? null

    await db(TABLE).where('id', Number(id)).update(patch)
    return db(TABLE).where('id', Number(id)).first().then(toDto)
  },

  async list({ page = 1, pageSize = 20, action, status, actor_id, created_from, created_to } = {}, options = {}) {
    const db = getDb(options)
    const query = applyListFilters(db(TABLE), { action, status, actor_id, created_from, created_to })

    const total = await query.clone().count('* as cnt').first().then(row => Number(row?.cnt || 0))
    const rows = await query
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    return {
      total,
      list: rows.map(toDto)
    }
  },

  async listAll({ action, status, actor_id, created_from, created_to } = {}, options = {}) {
    const db = getDb(options)
    const rows = await applyListFilters(db(TABLE), { action, status, actor_id, created_from, created_to })
      .orderBy('id', 'desc')

    return rows.map(toDto)
  }
}

export default ManagementAiExecution
