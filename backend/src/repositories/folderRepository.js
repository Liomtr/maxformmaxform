import Folder from '../models/Folder.js'

const folderRepository = {
  async findById(id, creatorId) {
    return Folder.findById(id, creatorId)
  },

  async list(payload = {}) {
    return Folder.list(payload)
  },

  async create(payload) {
    return Folder.create(payload)
  },

  async update(id, creatorId, fields) {
    return Folder.update(id, creatorId, fields)
  },

  async delete(id, creatorId) {
    return Folder.delete(id, creatorId)
  },

  async countChildren(id, creatorId) {
    return Folder.countChildren(id, creatorId)
  },

  async moveSurveysToRoot(id, creatorId) {
    return Folder.moveSurveysToRoot(id, creatorId)
  }
}

export default folderRepository
