import Answer from '../models/Answer.js'
import { isAdmin } from '../policies/accessPolicy.js'
import { getSurveyForManagement } from './surveyQueryService.js'

function createHttpError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function createResponseError(status, body) {
  const error = Object.assign(new Error(body?.error?.message || 'Request failed'), {
    status,
    body
  })
  if (body?.error?.code) error.code = body.error.code
  return error
}

export async function getManagedSurveyForAnswerRequest({ actor, surveyId }) {
  if (!surveyId) {
    throw createResponseError(400, {
      success: false,
      error: { code: 'VALIDATION', message: 'survey_id is required' }
    })
  }

  return getSurveyForManagement({ actor, identifier: surveyId })
}

export async function listAnswers({ actor, query = {} }) {
  const { survey_id, page = 1, pageSize = 20, startTime, endTime } = query

  if (!survey_id && !isAdmin(actor)) {
    throw createResponseError(400, {
      success: false,
      error: { code: 'VALIDATION', message: 'survey_id is required' }
    })
  }

  let survey = null
  if (survey_id) {
    survey = await getManagedSurveyForAnswerRequest({ actor, surveyId: survey_id })
  }

  return Answer.list({
    survey_id: survey?.id,
    page: Number(page),
    pageSize: Number(pageSize),
    startTime,
    endTime
  })
}

export async function countAnswers({ actor, query = {} }) {
  const survey = await getManagedSurveyForAnswerRequest({
    actor,
    surveyId: query.survey_id
  })

  const count = await Answer.count(survey.id)
  return { count }
}

export async function getAnswerForManagement({ actor, answerId }) {
  const answer = await Answer.findById(answerId)
  if (!answer) {
    throw createHttpError(404, 'NOT_FOUND', 'Answer not found')
  }

  await getSurveyForManagement({ actor, identifier: answer.survey_id })
  return answer
}
