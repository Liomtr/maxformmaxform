import Dept from '../models/Dept.js'

const deptRepository = {
  async findById(id) {
    return Dept.findById(id)
  },

  async create(payload) {
    return Dept.create(payload)
  },

  async update(id, fields) {
    return Dept.update(id, fields)
  },

  async delete(id) {
    return Dept.delete(id)
  },

  async countChildren(id) {
    return Dept.countChildren(id)
  },

  async countUsers(id) {
    return Dept.countUsers(id)
  },

  async clearUsersDept(id) {
    return Dept.clearUsersDept(id)
  },

  async list() {
    return Dept.list()
  },

  async tree() {
    return Dept.tree()
  }
}

export default deptRepository
