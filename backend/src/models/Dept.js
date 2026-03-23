import knex from '../db/knex.js'

const TABLE = 'depts'
const USER_TABLE = 'users'

const Dept = {
  async findById(id) {
    return knex(TABLE).where('id', id).first()
  },

  async create({ name, parent_id, sort_order = 0 }) {
    const [id] = await knex(TABLE).insert({ name, parent_id, sort_order })
    return Dept.findById(id)
  },

  async update(id, fields) {
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.parent_id !== undefined) data.parent_id = fields.parent_id
    if (fields.sort_order !== undefined) data.sort_order = fields.sort_order
    await knex(TABLE).where('id', id).update(data)
    return Dept.findById(id)
  },

  async delete(id) {
    return knex(TABLE).where('id', id).del()
  },

  async countChildren(id) {
    const row = await knex(TABLE).where('parent_id', id).count('* as cnt').first()
    return Number(row?.cnt || 0)
  },

  async countUsers(id) {
    const row = await knex(USER_TABLE).where('dept_id', id).count('* as cnt').first()
    return Number(row?.cnt || 0)
  },

  async clearUsersDept(id) {
    await knex(USER_TABLE).where('dept_id', id).update({ dept_id: null, updated_at: knex.fn.now() })
  },

  async list() {
    return knex(TABLE).orderBy('sort_order', 'asc').orderBy('id', 'asc')
  },

  async tree() {
    const all = await Dept.list()
    const map = new Map()
    all.forEach(d => map.set(d.id, { ...d, children: [] }))
    const roots = []
    for (const node of map.values()) {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id).children.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }
}

export default Dept
