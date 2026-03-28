import AuditLog from '../models/AuditLog.js'
import Message from '../models/Message.js'

export async function recordAudit({ actor, action, targetType, targetId, detail }, options = {}) {
  return AuditLog.create({
    actor_id: actor?.sub ?? null,
    actor_username: actor?.username || null,
    action,
    target_type: targetType,
    target_id: targetId,
    detail
  }, options)
}

export async function createAuditMessage({ recipientId, title, content, entityType, entityId, level = 'info', createdBy }, options = {}) {
  return Message.create({
    recipient_id: recipientId,
    type: 'audit',
    level,
    title,
    content,
    entity_type: entityType,
    entity_id: entityId,
    created_by: createdBy
  }, options)
}

export async function createSystemMessage({ recipientId, title, content, entityType, entityId, level = 'info', createdBy }, options = {}) {
  return Message.create({
    recipient_id: recipientId,
    type: 'system',
    level,
    title,
    content,
    entity_type: entityType,
    entity_id: entityId,
    created_by: createdBy
  }, options)
}
