import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import messageRepository from '../repositories/messageRepository.js'
import {
  ensureQueryObject,
  normalizeOptionalBooleanQuery,
  normalizeOptionalStringArrayQuery,
  normalizeStrictPagination
} from '../utils/queryValidation.js'
import {
  createMessageDto,
  createMessagePageResult,
  MANAGEMENT_ERROR_CODES,
  normalizeMessageListQuery
} from '../../../shared/management.contract.js'

function ensureAuthenticated(actor) {
  throwManagementPolicyError(getAuthenticatedActorPolicy(actor))
}

function throwInvalidQuery(message) {
  throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
}

export async function listActorMessages({ actor, query = {} }) {
  ensureAuthenticated(actor)
  ensureQueryObject(query, throwInvalidQuery)
  const pagination = normalizeStrictPagination(query, { page: 1, pageSize: 50 }, throwInvalidQuery)
  const normalized = normalizeMessageListQuery({
    ...query,
    ...pagination,
    unread: normalizeOptionalBooleanQuery(query.unread, 'unread', throwInvalidQuery),
    types: normalizeOptionalStringArrayQuery(query.types, 'types', throwInvalidQuery)
  })
  const result = await messageRepository.list({
    recipient_id: actor.sub,
    page: normalized.page,
    pageSize: normalized.pageSize,
    unread: normalized.unread,
    types: normalized.types
  })

  return createMessagePageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}

export async function markActorMessageRead({ actor, messageId }) {
  ensureAuthenticated(actor)
  const message = await messageRepository.markRead(messageId, actor.sub)
  if (!message) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.MESSAGE_NOT_FOUND, 'Message not found')
  }

  return createMessageDto(message)
}
