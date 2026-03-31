import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Survey from '../src/models/Survey.js'
import answerRepository from '../src/repositories/answerRepository.js'
import surveyAggregateRepository from '../src/repositories/surveyAggregateRepository.js'
import { deleteAnswersBatch } from '../src/services/answerCommandService.js'
import { UPLOAD_DIR } from '../src/utils/uploadStorage.js'
import { ANSWER_ERROR_CODES } from '../../shared/answer.contract.js'

const originalFindByIds = answerRepository.findByIds
const originalSurveyFindById = Survey.findById
const originalDeleteAnswersBatch = surveyAggregateRepository.deleteAnswersBatch

afterEach(() => {
  answerRepository.findByIds = originalFindByIds
  Survey.findById = originalSurveyFindById
  surveyAggregateRepository.deleteAnswersBatch = originalDeleteAnswersBatch
})

test('deleteAnswersBatch requires ids', async () => {
  await assert.rejects(
    () => deleteAnswersBatch({
      actor: { sub: 1, roleCode: 'user' },
      ids: []
    }),
    error => error?.status === 400 && error?.body?.error?.code === ANSWER_ERROR_CODES.VALIDATION
  )
})

test('deleteAnswersBatch rejects invalid id item structures', async () => {
  await assert.rejects(
    () => deleteAnswersBatch({
      actor: { sub: 1, roleCode: 'user' },
      ids: [501, { id: 502 }]
    }),
    error => error?.status === 400
      && error?.body?.error?.code === ANSWER_ERROR_CODES.VALIDATION
      && /ids\[1\] must be an integer/i.test(error?.body?.error?.message || '')
  )
})

test('deleteAnswersBatch authorizes surveys, deletes answers, and cleans up files', async () => {
  let deletePayload = null
  const fixtureName = 'answer-command-fixture.txt'
  const fixturePath = path.join(UPLOAD_DIR, fixtureName)
  fs.writeFileSync(fixturePath, 'answer command fixture')

  answerRepository.findByIds = async ids => ids.map(Number)
    .filter(id => id === 501 || id === 502)
    .map(id => ({ id, survey_id: id === 501 ? 71 : 72 }))
  Survey.findById = async id => ({
    id: Number(id),
    creator_id: 1,
    title: `Survey ${id}`
  })
  surveyAggregateRepository.deleteAnswersBatch = async payload => {
    deletePayload = payload
    return {
      deleted: 2,
      filesToCleanup: [{ url: `/uploads/${fixtureName}` }]
    }
  }

  try {
    const result = await deleteAnswersBatch({
      actor: { sub: 1, roleCode: 'user' },
      ids: [501, '502', 999]
    })

    assert.deepEqual(result, { deleted: 2 })
    assert.deepEqual(deletePayload, {
      answerIds: [501, 502],
      surveyIds: [71, 72]
    })
    assert.equal(fs.existsSync(fixturePath), false)
  } finally {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath)
  }
})
