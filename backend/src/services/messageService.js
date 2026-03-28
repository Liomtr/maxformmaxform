import { createHttpError } from '../http/errors.js'
import messageRepository from '../repositories/messageRepository.js'
import {
  createMessageDto,
  MANAGEMENT_ERROR_CODES,
  normalizeMessageListQuery
} from '../../../shared/management.contract.js'

export async function listActorMessages({ actor, query = {} }) {
  const normalized = normalizeMessageListQuery(query)
  const list = await messageRepository.list({
    recipient_id: actor.sub,
    page: normalized.page,
    pageSize: normalized.pageSize,
    unread: normalized.unread,
    types: normalized.types
  })

  return list.map(item => createMessageDto(item))
}

export async function markActorMessageRead({ actor, messageId }) {
  const message = await messageRepository.markRead(messageId, actor.sub)
  if (!message) {
    throw createHttpError(404, MANAGEMENT_ERROR_CODES.NOT_FOUND, 'Message not found')
  }

  return createMessageDto(message)
}
