import AuditLog from '../models/AuditLog.js'

const auditRepository = {
  async list(payload = {}) {
    return AuditLog.list(payload)
  }
}

export default auditRepository
