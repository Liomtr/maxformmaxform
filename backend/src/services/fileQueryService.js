import { resolveFileListUploaderId } from '../policies/filePolicy.js'
import fileRepository from '../repositories/fileRepository.js'
import {
  ensureQueryObject,
  normalizeOptionalIntegerQuery,
  normalizeStrictPagination
} from '../utils/queryValidation.js'
import {
  createFilePageResult,
  MANAGEMENT_ERROR_CODES,
  normalizeFileListQuery
} from '../../../shared/management.contract.js'
import { throwManagementError } from '../http/managementErrors.js'

function throwInvalidQuery(message) {
  throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
}

export async function listManagedFiles({ actor, query = {} }) {
  ensureQueryObject(query, throwInvalidQuery)
  const pagination = normalizeStrictPagination(query, { page: 1, pageSize: 20 }, throwInvalidQuery)
  const normalized = normalizeFileListQuery({
    ...query,
    ...pagination,
    uploader_id: normalizeOptionalIntegerQuery(query.uploader_id, 'uploader_id', throwInvalidQuery, { positive: true }),
    survey_id: normalizeOptionalIntegerQuery(query.survey_id, 'survey_id', throwInvalidQuery, { positive: true })
  })
  const result = await fileRepository.list({
    page: normalized.page,
    pageSize: normalized.pageSize,
    uploader_id: resolveFileListUploaderId(actor, normalized.uploader_id),
    ...(normalized.survey_id !== undefined ? { survey_id: normalized.survey_id } : {})
  })

  return createFilePageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}
