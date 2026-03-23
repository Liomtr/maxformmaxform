import knex from '../db/knex.js'

const TABLE = 'audit_logs'

function toDto(row) {
  if (!row) return null
  return {
    id: row.id,
    actorId: row.actor_id ?? null,
    actor: row.actor_username || '-',
    username: row.actor_username || '',
    action: row.action,
    targetType: row.target_type || '',
    targetId: row.target_id || '',
    detail: row.detail || '',
    time: row.created_at
  }
}

const AuditLog = {
  async create({ actor_id, actor_username, action, target_type, target_id, detail }) {
    const [id] = await knex(TABLE).insert({
      actor_id: actor_id ?? null,
      actor_username: actor_username || null,
      action,
      target_type: target_type || null,
      target_id: target_id == null ? null : String(target_id),
      detail: detail || null
    })
    return knex(TABLE).where('id', id).first().then(toDto)
  },

  async list({ page = 1, pageSize = 20, username, action, targetType } = {}) {
    let q = knex(TABLE)
    if (username) q = q.where('actor_username', 'like', `%${username}%`)
    if (action) q = q.where('action', 'like', `%${action}%`)
    if (targetType) q = q.where('target_type', 'like', `%${targetType}%`)

    const total = await q.clone().count('* as cnt').first().then(row => Number(row?.cnt || 0))
    const rows = await q
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    return {
      total,
      list: rows.map(toDto)
    }
  }
}

export default AuditLog
