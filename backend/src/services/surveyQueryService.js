import surveyRepository from '../repositories/surveyRepository.js'
import { resolveRequestedSurveyCreatorId } from './surveyAccessService.js'
import {
  ensureQueryObject,
  normalizeOptionalIntegerQuery,
  normalizeOptionalStringQuery,
  normalizeStrictPagination
} from '../utils/queryValidation.js'
import {
  createSurveyPageResult,
  SURVEY_ERROR_CODES,
  SURVEY_STATUS,
  normalizeSurveyListQuery,
  normalizeSurveyTrashListQuery
} from '../../../shared/survey.contract.js'

function throwSurveyValidation(message) {
  throw Object.assign(new Error(message), { status: 400, code: SURVEY_ERROR_CODES.VALIDATION })
}

const SURVEY_STATUS_SET = new Set(Object.values(SURVEY_STATUS))

export async function listSurveys({ actor, query = {} }) {
  ensureQueryObject(query, throwSurveyValidation)
  const pagination = normalizeStrictPagination(query, { page: 1, pageSize: 20 }, throwSurveyValidation)
  const status = normalizeOptionalStringQuery(query.status, 'status', throwSurveyValidation)
  if (status !== undefined && !SURVEY_STATUS_SET.has(status)) {
    throwSurveyValidation('status is invalid')
  }

  const normalized = normalizeSurveyListQuery({
    ...query,
    ...pagination,
    status,
    creator_id: normalizeOptionalIntegerQuery(query.creator_id, 'creator_id', throwSurveyValidation, { positive: true }),
    createdBy: normalizeOptionalStringQuery(query.createdBy, 'createdBy', throwSurveyValidation),
    folder_id: Object.prototype.hasOwnProperty.call(query, 'folder_id')
      ? normalizeOptionalIntegerQuery(query.folder_id, 'folder_id', throwSurveyValidation, { allowNull: true, positive: true })
      : undefined
  })
  const result = await surveyRepository.list({
    page: normalized.page,
    pageSize: normalized.pageSize,
    status: normalized.status,
    folder_id: normalized.folder_id,
    creator_id: await resolveRequestedSurveyCreatorId({ actor, query })
  })

  return createSurveyPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}

export async function listManagedSurveys({ actor, query = {} }) {
  return listSurveys({ actor, query })
}

export async function listSurveyTrash({ actor, query = {} }) {
  ensureQueryObject(query, throwSurveyValidation)
  const pagination = normalizeStrictPagination(query, { page: 1, pageSize: 100 }, throwSurveyValidation)
  const normalized = normalizeSurveyTrashListQuery({
    ...query,
    ...pagination,
    creator_id: normalizeOptionalIntegerQuery(query.creator_id, 'creator_id', throwSurveyValidation, { positive: true }),
    createdBy: normalizeOptionalStringQuery(query.createdBy, 'createdBy', throwSurveyValidation)
  })
  const result = await surveyRepository.listTrash({
    page: normalized.page,
    pageSize: normalized.pageSize,
    creator_id: await resolveRequestedSurveyCreatorId({ actor, query })
  })

  return createSurveyPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}

export async function listManagedSurveyTrash({ actor, query = {} }) {
  return listSurveyTrash({ actor, query })
}
