import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import Survey from '../src/models/Survey.js'
import answerRepository from '../src/repositories/answerRepository.js'
import {
  countAnswers,
  getAnswerForManagement,
  listAnswers
} from '../src/services/answerQueryService.js'
import { ANSWER_ERROR_CODES } from '../../shared/answer.contract.js'

const originalAnswerCountBySurveyId = answerRepository.countBySurveyId
const originalAnswerFindById = answerRepository.findById
const originalAnswerList = answerRepository.list
const originalSurveyFindById = Survey.findById

afterEach(() => {
  answerRepository.countBySurveyId = originalAnswerCountBySurveyId
  answerRepository.findById = originalAnswerFindById
  answerRepository.list = originalAnswerList
  Survey.findById = originalSurveyFindById
})

test('listAnswers requires survey_id for non-admin actors', async () => {
  await assert.rejects(
    () => listAnswers({
      actor: { sub: 1, roleCode: 'user' },
      query: {}
    }),
    error => error?.status === 400 && error?.body?.error?.code === ANSWER_ERROR_CODES.VALIDATION
  )
})

test('listAnswers rejects invalid paging query structures', async () => {
  await assert.rejects(
    () => listAnswers({
      actor: { sub: 1, roleCode: 'admin' },
      query: { page: 'oops' }
    }),
    error => error?.status === 400
      && error?.body?.error?.code === ANSWER_ERROR_CODES.VALIDATION
      && /page must be a positive integer/i.test(error?.body?.error?.message || '')
  )
})

test('listAnswers rejects invalid datetime query structures', async () => {
  await assert.rejects(
    () => listAnswers({
      actor: { sub: 1, roleCode: 'admin' },
      query: { startTime: 'not-a-date' }
    }),
    error => error?.status === 400
      && error?.body?.error?.code === ANSWER_ERROR_CODES.VALIDATION
      && /starttime must be a valid datetime/i.test(error?.body?.error?.message || '')
  )
})

test('listAnswers rejects reversed datetime query ranges', async () => {
  await assert.rejects(
    () => listAnswers({
      actor: { sub: 1, roleCode: 'admin' },
      query: { startTime: '2026-04-01', endTime: '2026-03-01' }
    }),
    error => error?.status === 400
      && error?.body?.error?.code === ANSWER_ERROR_CODES.VALIDATION
      && /starttime must be earlier than or equal to endtime/i.test(error?.body?.error?.message || '')
  )
})

test('listAnswers validates survey access and forwards normalized paging args', async () => {
  let listPayload = null

  Survey.findById = async id => ({
    id: Number(id),
    creator_id: 1,
    title: `Survey ${id}`
  })
  answerRepository.list = async payload => {
    listPayload = payload
    return { total: 1, list: [{ id: 11 }] }
  }

  const result = await listAnswers({
    actor: { sub: 1, roleCode: 'user' },
    query: {
      survey_id: '9',
      page: '2',
      pageSize: '5',
      startTime: '2026-03-01',
      endTime: '2026-03-31'
    }
  })

  assert.deepEqual(result, {
    total: 1,
    page: 2,
    pageSize: 5,
    list: [{
      id: 11,
      survey_id: undefined,
      surveyId: undefined,
      answers_data: [],
      ip_address: undefined,
      user_agent: undefined,
      duration: undefined,
      status: undefined,
      submitted_at: undefined,
      submittedAt: undefined
    }]
  })
  assert.deepEqual(listPayload, {
    survey_id: 9,
    page: 2,
    pageSize: 5,
    startTime: '2026-03-01',
    endTime: '2026-03-31'
  })
})

test('countAnswers returns the managed survey submission count', async () => {
  Survey.findById = async () => ({
    id: 12,
    creator_id: 1,
    title: 'Managed Survey'
  })
  answerRepository.countBySurveyId = async surveyId => {
    assert.equal(surveyId, 12)
    return 7
  }

  const result = await countAnswers({
    actor: { sub: 1, roleCode: 'user' },
    query: { survey_id: '12' }
  })

  assert.deepEqual(result, { count: 7 })
})

test('getAnswerForManagement loads the answer after survey authorization', async () => {
  answerRepository.findById = async id => ({
    id: Number(id),
    survey_id: 21,
    answers_data: []
  })
  Survey.findById = async () => ({
    id: 21,
    creator_id: 1,
    title: 'Managed Survey'
  })

  const result = await getAnswerForManagement({
    actor: { sub: 1, roleCode: 'user' },
    answerId: '33'
  })

  assert.equal(result.id, 33)
  assert.equal(result.survey_id, 21)
  assert.equal(result.surveyId, 21)
})
