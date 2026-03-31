import SystemConfig from '../models/SystemConfig.js'

const systemConfigRepository = {
  async findByKey(configKey, options = {}) {
    return SystemConfig.findByKey(configKey, options)
  },

  async upsert(payload, options = {}) {
    return SystemConfig.upsert(payload, options)
  }
}

export default systemConfigRepository
