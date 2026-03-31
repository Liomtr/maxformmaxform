import { throwAnswerError, throwAnswerPolicyError } from '../http/answerErrors.js'
import {
  getAnswerListPolicy,
  getAnswerSurveyRequiredPolicy
} from '../policies/answerPolicy.js'
import answerRepository from '../repositories/answerRepository.js'
import { getSurveyForManagement } from './surveyAccessService.js'
import { normalizeAnswerSurveyId } from '../utils/answerPayload.js'
import {
  ensureQueryObject,
  normalizeOptionalDateTimeQuery,
  normalizeOptionalStringQuery,
  normalizeStrictPagination
} from '../utils/queryValidation.js'
import {
  ANSWER_ERROR_CODES,
  createAnswerDto,
  createAnswerCountDto,
  createAnswerPageResult,
  normalizeAnswerListQuery
} from '../../../shared/answer.contract.js'

export async function getManagedSurveyForAnswerRequest({ actor, surveyId }) {
  const normalizedSurveyId = normalizeAnswerSurveyId(surveyId)
  throwAnswerPolicyError(getAnswerSurveyRequiredPolicy(normalizedSurveyId))
  return getSurveyForManagement({ actor, identifier: normalizedSurveyId })
}

export async function listAnswers({ actor, query = {} }) {
  const throwValidation = message => {
    throwAnswerError(400, ANSWER_ERROR_CODES.VALIDATION, message)
  }
  ensureQueryObject(query, message => {
    throwAnswerError(400, ANSWER_ERROR_CODES.VALIDATION, message)
  })
  const pagination = normalizeStrictPagination(query, { page: 1, pageSize: 20 }, throwValidation)
  const normalized = normalizeAnswerListQuery({
    ...query,
    ...pagination,
    survey_id: normalizeAnswerSurveyId(query.survey_id),
    startTime: normalizeOptionalDateTimeQuery(query.startTime, 'startTime', throwValidation),
    endTime: normalizeOptionalDateTimeQuery(query.endTime, 'endTime', throwValidation)
  })

  if (normalized.startTime && normalized.endTime) {
    const startTime = new Date(normalized.startTime)
    const endTime = new Date(normalized.endTime)
    if (startTime.getTime() > endTime.getTime()) {
      throwValidation('startTime must be earlier than or equal to endTime')
    }
  }
  throwAnswerPolicyError(getAnswerListPolicy(actor, normalized))

  let survey = null
  if (normalized.survey_id) {
    survey = await getManagedSurveyForAnswerRequest({ actor, surveyId: normalized.survey_id })
  }

  const result = await answerRepository.list({
    survey_id: survey?.id,
    page: normalized.page,
    pageSize: normalized.pageSize,
    startTime: normalized.startTime,
    endTime: normalized.endTime
  })

  return createAnswerPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}

export async function countAnswers({ actor, query = {} }) {
  const survey = await getManagedSurveyForAnswerRequest({
    actor,
    surveyId: query.survey_id
  })

  const count = await answerRepository.countBySurveyId(survey.id)
  return createAnswerCountDto(count)
}

export async function getAnswerForManagement({ actor, answerId }) {
  const answer = await answerRepository.findById(answerId)
  if (!answer) {
    throwAnswerError(404, ANSWER_ERROR_CODES.NOT_FOUND, 'Answer not found')
  }

  await getSurveyForManagement({ actor, identifier: answer.survey_id })
  return createAnswerDto(answer)
}
