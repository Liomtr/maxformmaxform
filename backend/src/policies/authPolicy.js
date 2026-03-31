import { AUTH_ERROR_CODES } from '../../../shared/auth.contract.js'
import { getAuthenticatedActorPolicy } from './actorPolicy.js'

export function getCurrentAuthSessionPolicy(actor) {
  return getAuthenticatedActorPolicy(actor, {
    code: AUTH_ERROR_CODES.INVALID_TOKEN,
    message: 'Current user is not available'
  })
}
