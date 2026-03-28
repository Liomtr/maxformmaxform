import { throwPolicyError } from '../http/errors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import auditRepository from '../repositories/auditRepository.js'
import { createAuditPageResult, normalizeAuditListQuery } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwPolicyError(getAdminPolicy(actor))
}

export async function listManagedAudits({ actor, query = {} }) {
  ensureAdmin(actor)

  const normalized = normalizeAuditListQuery(query)
  const result = await auditRepository.list(normalized)
  return createAuditPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}
