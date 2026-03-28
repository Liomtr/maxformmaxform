import User from '../models/User.js'

const userRepository = {
  async findById(id) {
    return User.findById(id)
  },

  async findByUsername(username) {
    return User.findByUsername(username)
  },

  async findByIdentity(identity) {
    if (/^\d+$/.test(String(identity))) {
      const user = await User.findById(identity)
      if (user) return user
    }

    return User.findByUsername(String(identity))
  },

  async create(payload) {
    return User.create(payload)
  },

  async update(id, fields) {
    return User.update(id, fields)
  },

  async updatePassword(id, password) {
    return User.updatePassword(id, password)
  },

  async list(payload = {}) {
    return User.list(payload)
  },

  async delete(id) {
    return User.delete(id)
  },

  toSafe(user) {
    return User.toSafe(user)
  }
}

export default userRepository
