import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import Answer from '../src/models/Answer.js'
import Survey from '../src/models/Survey.js'
import {
  countAnswers,
  getAnswerForManagement,
  listAnswers
} from '../src/services/answerQueryService.js'

const originalAnswerCount = Answer.count
const originalAnswerFindById = Answer.findById
const originalAnswerList = Answer.list
const originalSurveyFindById = Survey.findById

afterEach(() => {
  Answer.count = originalAnswerCount
  Answer.findById = originalAnswerFindById
  Answer.list = originalAnswerList
  Survey.findById = originalSurveyFindById
})

test('listAnswers requires survey_id for non-admin actors', async () => {
  await assert.rejects(
    () => listAnswers({
      actor: { sub: 1, roleCode: 'user' },
      query: {}
    }),
    error => error?.status === 400 && error?.body?.error?.code === 'VALIDATION'
  )
})

test('listAnswers validates survey access and forwards normalized paging args', async () => {
  let listPayload = null

  Survey.findById = async id => ({
    id: Number(id),
    creator_id: 1,
    title: `Survey ${id}`
  })
  Answer.list = async payload => {
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

  assert.deepEqual(result, { total: 1, list: [{ id: 11 }] })
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
  Answer.count = async surveyId => {
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
  Answer.findById = async id => ({
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
})
