import Survey from '../models/Survey.js'

const surveyRepository = {
  async findById(id, options = {}) {
    return Survey.findById(id, options)
  },

  async findByShareCode(code, options = {}) {
    return Survey.findByShareCode(code, options)
  },

  async findByIdentifier(identifier, options = {}) {
    return Survey.findByIdentifier(identifier, options)
  },

  async create(payload, options = {}) {
    return Survey.create(payload, options)
  },

  async update(id, fields, options = {}) {
    return Survey.update(id, fields, options)
  },

  async delete(id, options = {}) {
    return Survey.delete(id, options)
  },

  async softDelete(id, deletedBy, options = {}) {
    return Survey.softDelete(id, deletedBy, options)
  },

  async restore(id, options = {}) {
    return Survey.restore(id, options)
  },

  async incrementResponseCount(id, options = {}) {
    return Survey.incrementResponseCount(id, options)
  },

  async syncResponseCount(id, options = {}) {
    return Survey.syncResponseCount(id, options)
  },

  async list(payload = {}, options = {}) {
    return Survey.list(payload, options)
  },

  async listTrash(payload = {}, options = {}) {
    return Survey.listTrash(payload, options)
  },

  async listTrashIds(payload = {}, options = {}) {
    return Survey.listTrashIds(payload, options)
  },

  async clearTrash(payload = {}, options = {}) {
    return Survey.clearTrash(payload, options)
  }
}

export default surveyRepository
