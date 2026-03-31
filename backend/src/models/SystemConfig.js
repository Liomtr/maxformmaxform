import knex from '../db/knex.js'

const TABLE = 'system_configs'

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
    configKey: row.config_key,
    configValue: parseJsonField(row.config_value, null),
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SystemConfig = {
  async findByKey(configKey, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE).where('config_key', configKey).first()
    return toDto(row)
  },

  async upsert({ config_key, config_value = null, updated_by = null }, options = {}) {
    const db = getDb(options)
    const existing = await db(TABLE).where('config_key', config_key).first()

    if (existing) {
      await db(TABLE)
        .where('config_key', config_key)
        .update({
          config_value: config_value == null ? null : JSON.stringify(config_value),
          updated_by,
          updated_at: db.fn.now()
        })
    } else {
      await db(TABLE).insert({
        config_key,
        config_value: config_value == null ? null : JSON.stringify(config_value),
        updated_by,
        updated_at: db.fn.now()
      })
    }

    return SystemConfig.findByKey(config_key, options)
  }
}

export default SystemConfig
