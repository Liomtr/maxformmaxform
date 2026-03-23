import knex from '../db/knex.js'

const TABLE = 'messages'

function toDto(row) {
  if (!row) return null
  return {
    id: row.id,
    type: row.type,
    level: row.level,
    title: row.title,
    content: row.content || '',
    entityType: row.entity_type || null,
    entityId: row.entity_id ?? null,
    read: !!row.is_read,
    readAt: row.read_at || null,
    createdAt: row.created_at
  }
}

const Message = {
  async create({ recipient_id, type = 'system', level = 'info', title, content, entity_type, entity_id, created_by }) {
    const [id] = await knex(TABLE).insert({
      recipient_id,
      type,
      level,
      title,
      content: content || null,
      entity_type: entity_type || null,
      entity_id: entity_id ?? null,
      created_by: created_by ?? null
    })
    return Message.findById(id, recipient_id)
  },

  async findById(id, recipient_id) {
    let q = knex(TABLE).where('id', id)
    if (recipient_id !== undefined) q = q.andWhere('recipient_id', recipient_id)
    const row = await q.first()
    return toDto(row)
  },

  async list({ recipient_id, unread, types, page = 1, pageSize = 50 }) {
    let q = knex(TABLE).where('recipient_id', recipient_id)
    if (unread !== undefined) q = q.andWhere('is_read', unread)
    if (Array.isArray(types) && types.length) q = q.whereIn('type', types)

    const rows = await q
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    return rows.map(toDto)
  },

  async markRead(id, recipient_id) {
    await knex(TABLE)
      .where({ id, recipient_id })
      .update({ is_read: true, read_at: knex.fn.now() })
    return Message.findById(id, recipient_id)
  }
}

export default Message
