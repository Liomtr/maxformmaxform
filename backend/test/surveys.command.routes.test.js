import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import AuditLog from '../src/models/AuditLog.js'
import Message from '../src/models/Message.js'
import Survey from '../src/models/Survey.js'
import Folder from '../src/models/Folder.js'
import Answer from '../src/models/Answer.js'
import FileModel from '../src/models/File.js'
import { registerApiRouteHarness, UPLOAD_DIR } from './helpers/apiRouteHarness.js'
const { request, requestRaw, requestPublic } = registerApiRouteHarness()

test('POST /api/surveys creates a survey through the service flow', async () => {
  const createdPayloads = []

  Survey.create = async payload => {
    createdPayloads.push(payload)
    return {
      id: 10,
      title: payload.title,
      creator_id: payload.creator_id,
      questions: payload.questions
    }
  }
  AuditLog.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys', {
    method: 'POST',
    body: {
      title: 'New Survey',
      description: 'desc',
      questions: [{ type: 'input', title: 'Question 1' }],
      settings: { submitOnce: true },
      style: { theme: 'clean' }
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 10)
  assert.equal(createdPayloads.length, 1)
  assert.equal(createdPayloads[0].creator_id, 1)
  assert.equal(createdPayloads[0].questions[0].type, 'input')
})

test('PUT /api/surveys/:id updates a survey through the service flow', async () => {
  let updatedPayload = null

  Survey.findByIdentifier = async () => ({ id: 12, creator_id: 1, title: 'Before Update' })
  Survey.update = async (_id, payload) => {
    updatedPayload = payload
    return { id: 12, ...payload }
  }

  const { response, json } = await request('/surveys/12', {
    method: 'PUT',
    body: {
      title: 'After Update',
      questions: [{ type: 'rating', title: 'Rate us' }]
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.title, 'After Update')
  assert.equal(updatedPayload.title, 'After Update')
  assert.equal(updatedPayload.questions[0].type, 'rating')
})

test('POST /api/surveys/:id/close closes a survey through the service flow', async () => {
  Survey.findByIdentifier = async () => ({ id: 13, creator_id: 1, title: 'Close Me' })
  Survey.update = async () => ({ id: 13, status: 'closed' })
  AuditLog.create = async () => ({ id: 1 })
  Message.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys/13/close', { method: 'POST' })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.status, 'closed')
})

test('PUT /api/surveys/:id/folder moves a survey through the service flow', async () => {
  let updatedPayload = null

  Survey.findByIdentifier = async () => ({ id: 14, creator_id: 1, title: 'Move Me', folder_id: null })
  Folder.findById = async (id, creatorId) => ({ id: Number(id), creator_id: creatorId, name: 'Target Folder' })
  Survey.update = async (_id, payload) => {
    updatedPayload = payload
    return { id: 14, ...payload }
  }
  AuditLog.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys/14/folder', {
    method: 'PUT',
    body: { folder_id: 9 }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.folder_id, 9)
  assert.deepEqual(updatedPayload, { folder_id: 9 })
})

test('DELETE /api/surveys/:id soft deletes a survey into trash', async () => {
  Survey.findByIdentifier = async () => ({ id: 11, creator_id: 1, title: 'Q1', deletedAt: null })
  Survey.softDelete = async () => ({ id: 11, deletedAt: '2026-03-23T10:00:00.000Z' })
  AuditLog.create = async () => ({ id: 1 })
  Message.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys/11', { method: 'DELETE' })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 11)
  assert.ok(json.data.deletedAt)
})

test('POST /api/surveys/:id/restore restores a trashed survey through the service flow', async () => {
  Survey.findByIdentifier = async () => ({
    id: 15,
    creator_id: 1,
    title: 'Restore Me',
    deletedAt: '2026-03-23T10:00:00.000Z'
  })
  Survey.restore = async () => ({ id: 15, deletedAt: null })
  AuditLog.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys/15/restore', { method: 'POST' })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 15)
  assert.equal(json.data.deletedAt, null)
})

test('DELETE /api/surveys/trash clears trashed surveys, answers, and files', async () => {
  let deletedSurveyIds = []
  let deletedFileSurveyIds = []
  const trashFixtureName = 'trash-clear-fixture.txt'
  const trashFixturePath = `${UPLOAD_DIR}/${trashFixtureName}`
  fs.writeFileSync(trashFixturePath, 'trash clear fixture')

  Survey.listTrashIds = async () => [21, 22]
  FileModel.listBySurveyIds = async () => ([
    { id: 801, survey_id: 21, url: `/uploads/${trashFixtureName}` }
  ])
  FileModel.deleteBySurveyIds = async ids => { deletedFileSurveyIds = ids; return ids.length }
  Answer.deleteBySurveyIds = async ids => { deletedSurveyIds = ids; return ids.length }
  Survey.clearTrash = async () => 2
  AuditLog.create = async () => ({ id: 1 })

  try {
    const { response, json } = await request('/surveys/trash', { method: 'DELETE' })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.deleted, 2)
    assert.deepEqual(deletedSurveyIds, [21, 22])
    assert.deepEqual(deletedFileSurveyIds, [21, 22])
    assert.equal(fs.existsSync(trashFixturePath), false)
  } finally {
    if (fs.existsSync(trashFixturePath)) fs.unlinkSync(trashFixturePath)
  }
})

test('DELETE /api/surveys/:id/force removes survey files from db and disk', async () => {
  let deletedSurveyIds = []
  let deletedFileSurveyIds = []
  const forceFixtureName = 'force-delete-fixture.txt'
  const forceFixturePath = `${UPLOAD_DIR}/${forceFixtureName}`
  fs.writeFileSync(forceFixturePath, 'force delete fixture')

  Survey.findByIdentifier = async () => ({ id: 31, creator_id: 1, title: 'Force Delete Survey', deletedAt: '2026-03-23T10:00:00.000Z' })
  FileModel.listBySurveyIds = async () => ([
    { id: 901, survey_id: 31, url: `/uploads/${forceFixtureName}` }
  ])
  FileModel.deleteBySurveyIds = async ids => { deletedFileSurveyIds = ids; return ids.length }
  Answer.deleteBySurveyIds = async ids => { deletedSurveyIds = ids; return ids.length }
  Survey.delete = async id => id
  AuditLog.create = async () => ({ id: 1 })

  try {
    const { response, json } = await request('/surveys/31/force', { method: 'DELETE' })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.deepEqual(deletedSurveyIds, [31])
    assert.deepEqual(deletedFileSurveyIds, [31])
    assert.equal(fs.existsSync(forceFixturePath), false)
  } finally {
    if (fs.existsSync(forceFixturePath)) fs.unlinkSync(forceFixturePath)
  }
})

test('DELETE /api/answers/batch removes answer attachments from db and disk and syncs survey counts', async () => {
  let deletedAnswerIds = []
  let deletedFileAnswerIds = []
  const syncedSurveyIds = []
  const answerFixtureName = 'answer-delete-fixture.txt'
  const answerFixturePath = `${UPLOAD_DIR}/${answerFixtureName}`
  fs.writeFileSync(answerFixturePath, 'answer delete fixture')

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
  FileModel.listByAnswerIds = async ids => ([
    { id: 9901, answer_id: ids[0], url: `/uploads/${answerFixtureName}` }
  ])
  FileModel.deleteByAnswerIds = async ids => { deletedFileAnswerIds = ids; return ids.length }
  Answer.deleteBatch = async ids => { deletedAnswerIds = ids; return ids.length }
  Survey.syncResponseCount = async id => {
    syncedSurveyIds.push(Number(id))
    return 0
  }

  try {
    const { response, json } = await request('/answers/batch', {
      method: 'DELETE',
      body: { ids: [501, 502, 999] }
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.deleted, 2)
    assert.deepEqual(deletedAnswerIds, [501, 502])
    assert.deepEqual(deletedFileAnswerIds, [501, 502])
    assert.deepEqual(syncedSurveyIds, [71, 72])
    assert.equal(fs.existsSync(answerFixturePath), false)
  } finally {
    if (fs.existsSync(answerFixturePath)) fs.unlinkSync(answerFixturePath)
  }
})

