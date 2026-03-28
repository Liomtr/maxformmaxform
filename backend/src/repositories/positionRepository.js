import Position from '../models/Position.js'

const positionRepository = {
  async findById(id) {
    return Position.findById(id)
  },

  async findByCode(code) {
    return Position.findByCode(code)
  },

  async list() {
    return Position.list()
  },

  async create(payload) {
    return Position.create(payload)
  },

  async update(id, fields) {
    return Position.update(id, fields)
  },

  async delete(id) {
    return Position.delete(id)
  }
}

export default positionRepository
