import knex from '../db/knex.js'

const TABLE = 'positions'

const Position = {
  async findById(id) {
    return knex(TABLE).where('id', id).first()
  },

  async findByCode(code) {
    if (!code) return null
    return knex(TABLE).where('code', code).first()
  },

  async list() {
    return knex(TABLE).orderBy('id', 'asc')
  },

  async create({ name, code = null, is_virtual = false, remark = null }) {
    const [id] = await knex(TABLE).insert({
      name,
      code,
      is_virtual,
      remark
    })
    return Position.findById(id)
  },

  async update(id, fields) {
    const data = {}
    for (const key of ['name', 'code', 'is_virtual', 'remark']) {
      if (fields[key] !== undefined) data[key] = fields[key]
    }
    data.updated_at = knex.fn.now()
    await knex(TABLE).where('id', id).update(data)
    return Position.findById(id)
  },

  async delete(id) {
    return knex(TABLE).where('id', id).del()
  }
}

export default Position
