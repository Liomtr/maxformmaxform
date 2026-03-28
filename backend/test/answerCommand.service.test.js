import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Answer from '../src/models/Answer.js'
import Survey from '../src/models/Survey.js'
import surveyAggregateRepository from '../src/repositories/surveyAggregateRepository.js'
import { deleteAnswersBatch } from '../src/services/answerCommandService.js'
import { UPLOAD_DIR } from '../src/utils/uploadStorage.js'

const originalAnswerFindById = Answer.findById
const originalSurveyFindById = Survey.findById
const originalDeleteAnswersBatch = surveyAggregateRepository.deleteAnswersBatch

afterEach(() => {
  Answer.findById = originalAnswerFindById
  Survey.findById = originalSurveyFindById
  surveyAggregateRepository.deleteAnswersBatch = originalDeleteAnswersBatch
})

test('deleteAnswersBatch requires ids', async () => {
  await assert.rejects(
    () => deleteAnswersBatch({
      actor: { sub: 1, roleCode: 'user' },
      ids: []
    }),
    error => error?.status === 400 && error?.body?.error?.code === 'VALIDATION'
  )
})

test('deleteAnswersBatch authorizes surveys, deletes answers, and cleans up files', async () => {
  let deletePayload = null
  const fixtureName = 'answer-command-fixture.txt'
  const fixturePath = path.join(UPLOAD_DIR, fixtureName)
  fs.writeFileSync(fixturePath, 'answer command fixture')

  Answer.findById = async id => {
    const numericId = Number(id)
    if (numericId === 501) return { id: 501, survey_id: 71 }
    if (numericId === 502) return { id: 502, survey_id: 72 }
    return null
  }
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
