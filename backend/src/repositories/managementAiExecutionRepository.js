import ManagementAiExecution from '../models/ManagementAiExecution.js'

const managementAiExecutionRepository = {
  async list(query = {}, options = {}) {
    return ManagementAiExecution.list(query, options)
  },

  async listAll(query = {}, options = {}) {
    return ManagementAiExecution.listAll(query, options)
  },

  async findByActorAndKey(actorId, idempotencyKey, options = {}) {
    return ManagementAiExecution.findByActorAndKey(actorId, idempotencyKey, options)
  },

  async create(payload, options = {}) {
    return ManagementAiExecution.create(payload, options)
  },

  async update(id, fields, options = {}) {
    return ManagementAiExecution.update(id, fields, options)
  }
}

export default managementAiExecutionRepository
