import Role from '../models/Role.js'

const roleRepository = {
  async findById(id) {
    return Role.findById(id)
  },

  async findByCode(code) {
    return Role.findByCode(code)
  },

  async create(payload) {
    return Role.create(payload)
  },

  async update(id, fields) {
    return Role.update(id, fields)
  },

  async delete(id) {
    return Role.delete(id)
  },

  async list() {
    return Role.list()
  }
}

export default roleRepository
