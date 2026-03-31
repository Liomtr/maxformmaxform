import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import auditRepository from '../repositories/auditRepository.js'
import {
  ensureQueryObject,
  normalizeOptionalStringQuery,
  normalizeStrictPagination
} from '../utils/queryValidation.js'
import { createAuditPageResult, normalizeAuditListQuery } from '../../../shared/management.contract.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function throwInvalidQuery(message) {
  throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
}

export async function listManagedAudits({ actor, query = {} }) {
  ensureAdmin(actor)

  ensureQueryObject(query, throwInvalidQuery)
  const pagination = normalizeStrictPagination(query, { page: 1, pageSize: 20 }, throwInvalidQuery)
  const normalized = normalizeAuditListQuery({
    ...query,
    ...pagination,
    username: normalizeOptionalStringQuery(query.username, 'username', throwInvalidQuery),
    action: normalizeOptionalStringQuery(query.action, 'action', throwInvalidQuery),
    targetType: normalizeOptionalStringQuery(query.targetType, 'targetType', throwInvalidQuery)
  })
  const result = await auditRepository.list(normalized)
  return createAuditPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}
