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

test('POST /api/surveys strips non-writable settings and style fields before persistence', async () => {
  let createdPayload = null

  Survey.create = async payload => {
    createdPayload = payload
    return {
      id: 18,
      title: payload.title,
      creator_id: payload.creator_id,
      settings: payload.settings,
      style: payload.style,
      questions: payload.questions
    }
  }
  AuditLog.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys', {
    method: 'POST',
    body: {
      title: 'Settings Whitelist Survey',
      questions: [{ type: 'input', title: 'Question 1' }],
      settings: {
        submitOnce: true,
        randomizeQuestions: true,
        showProgress: false,
        debug: true,
        uiState: { activeTab: 'publish' }
      },
      style: {
        theme: 'clean',
        backgroundColor: '#ffffff',
        headerImage: '/demo.png',
        injectedCss: 'body{display:none}'
      }
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.ok(createdPayload)
  assert.deepEqual(createdPayload.settings, {
    showProgress: false,
    submitOnce: true,
    randomizeQuestions: true
  })
  assert.deepEqual(createdPayload.style, {
    theme: 'clean',
    backgroundColor: '#ffffff',
    headerImage: '/demo.png'
  })
})

test('POST /api/surveys strips non-writable QuestionDTO fields before persistence', async () => {
  let createdPayload = null

  Survey.create = async payload => {
    createdPayload = payload
    return {
      id: 16,
      title: payload.title,
      creator_id: payload.creator_id,
      questions: payload.questions
    }
  }
  AuditLog.create = async () => ({ id: 1 })

  const { response, json } = await request('/surveys', {
    method: 'POST',
    body: {
      title: 'Whitelist Survey',
      questions: [
        {
          type: 'input',
          title: 'Question 1'
        },
        {
          type: 'radio',
          title: 'Favorite option',
          required: true,
          runtimeOnly: 'drop-me',
          options: [
            {
              label: 'A',
              value: '1',
              quotaUsed: 99,
              __quotaFull: true,
              visibleWhen: [[{
                qid: '1',
                op: 'eq',
                value: 'demo',
                transient: 'drop-me-too'
              }]]
            },
            {
              label: 'B',
              value: '2'
            }
          ],
          logic: {
            visibleWhen: [[{
              qid: '1',
              op: 'eq',
              value: 'demo',
              debug: true
            }]],
            debug: true
          },
          jumpLogic: {
            byOption: { '1': 'end' },
            unconditional: 'end',
            traceId: 'drop-me'
          },
          optionGroups: [{
            name: 'Group A',
            from: 1,
            to: 1,
            random: false,
            debug: true
          }],
          id: 'should-not-be-writable'
        }
      ]
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.ok(createdPayload)
  assert.equal(createdPayload.questions[1].id, undefined)
  assert.equal(createdPayload.questions[1].runtimeOnly, undefined)
  assert.equal(createdPayload.questions[1].logic.debug, undefined)
  assert.equal(createdPayload.questions[1].logic.visibleWhen[0][0].debug, undefined)
  assert.equal(createdPayload.questions[1].jumpLogic.traceId, undefined)
  assert.equal(createdPayload.questions[1].optionGroups[0].debug, undefined)
  assert.equal(createdPayload.questions[1].options[0].quotaUsed, undefined)
  assert.equal(createdPayload.questions[1].options[0].__quotaFull, undefined)
  assert.equal(createdPayload.questions[1].options[0].visibleWhen[0][0].transient, undefined)
})

test('POST /api/surveys rejects invalid survey structure before persistence', async () => {
  let createCalled = false

  Survey.create = async () => {
    createCalled = true
    return { id: 1000 }
  }

  const { response, json } = await request('/surveys', {
    method: 'POST',
    body: {
      title: 'Invalid Create Survey',
      questions: [{
        type: 'radio',
        title: 'Question 1',
        options: [{ label: 'Only option', value: '1' }]
      }]
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /at least 2 options/i)
  assert.equal(createCalled, false)
})

test('POST /api/surveys/validate returns normalized payload for a valid draft', async () => {
  const { response, json } = await request('/surveys/validate', {
    method: 'POST',
    body: {
      title: 'Dry Run Survey',
      description: 'preview only',
      settings: {
        showProgress: true,
        submitOnce: true,
        debug: true
      },
      style: {
        theme: 'clean',
        runtimeOnly: true
      },
      questions: [{
        type: 'radio',
        title: 'Favorite option',
        runtimeOnly: 'drop-me',
        options: [
          { label: 'A', value: '1', quotaUsed: 99 },
          { label: 'B', value: '2', __remaining: 1 }
        ]
      }]
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.valid, true)
  assert.equal(json.data.error, null)
  assert.equal(json.data.normalized.questions[0].runtimeOnly, undefined)
  assert.equal(json.data.normalized.questions[0].options[0].quotaUsed, undefined)
  assert.equal(json.data.normalized.questions[0].options[1].__remaining, undefined)
  assert.deepEqual(json.data.normalized.settings, {
    showProgress: true,
    submitOnce: true
  })
  assert.deepEqual(json.data.normalized.style, {
    theme: 'clean'
  })
})

test('POST /api/surveys/validate returns validation errors without creating a survey', async () => {
  let createCalled = false
  Survey.create = async () => {
    createCalled = true
    return { id: 999 }
  }

  const { response, json } = await request('/surveys/validate', {
    method: 'POST',
    body: {
      title: 'Invalid Dry Run Survey',
      questions: [
        {
          type: 'radio',
          title: 'Question 1',
          options: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }]
        },
        {
          type: 'input',
          title: 'Question 2',
          logic: {
            visibleWhen: [[{ qid: 2, op: 'eq', value: '1' }]]
          }
        }
      ]
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.valid, false)
  assert.match(json.data.error, /logic\.visibleWhen/i)
  assert.equal(createCalled, false)
  assert.equal(json.data.normalized.questions.length, 2)
})

test('POST /api/surveys/validate rejects invalid endTime format', async () => {
  const { response, json } = await request('/surveys/validate', {
    method: 'POST',
    body: {
      title: 'Invalid End Time Survey',
      settings: {
        endTime: 'not-a-date'
      },
      questions: [{ type: 'input', title: 'Question 1' }]
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.valid, false)
  assert.equal(json.data.error, 'End time is invalid')
})

test('POST /api/surveys/dry-run validates survey JSON strings without creating a survey', async () => {
  let createCalled = false
  Survey.create = async () => {
    createCalled = true
    return { id: 1000 }
  }

  const { response, json } = await request('/surveys/dry-run', {
    method: 'POST',
    body: {
      json: JSON.stringify({
        title: 'JSON Dry Run Survey',
        description: 'from ai',
        settings: {
          submitOnce: true,
          debug: true
        },
        questions: [{
          type: 'radio',
          title: 'Favorite option',
          runtimeOnly: 'drop-me',
          options: [
            { label: 'A', value: '1', quotaUsed: 10 },
            { label: 'B', value: '2' }
          ]
        }]
      })
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.valid, true)
  assert.equal(json.data.error, null)
  assert.equal(json.data.normalized.questions[0].runtimeOnly, undefined)
  assert.equal(json.data.normalized.questions[0].options[0].quotaUsed, undefined)
  assert.deepEqual(json.data.normalized.settings, {
    submitOnce: true
  })
  assert.equal(createCalled, false)
})

test('POST /api/surveys/dry-run rejects invalid survey JSON strings', async () => {
  const { response, json } = await request('/surveys/dry-run', {
    method: 'POST',
    body: {
      json: '{"title":"broken"'
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /survey json is invalid/i)
})

test('POST /api/surveys rejects invalid endTime format before persistence', async () => {
  let createCalled = false
  Survey.create = async () => {
    createCalled = true
    return { id: 1001 }
  }

  const { response, json } = await request('/surveys', {
    method: 'POST',
    body: {
      title: 'Invalid End Time Create',
      settings: {
        endTime: 'not-a-date'
      },
      questions: [{ type: 'input', title: 'Question 1' }]
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /end time is invalid/i)
  assert.equal(createCalled, false)
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

test('PUT /api/surveys/:id rejects invalid survey structure before persistence', async () => {
  let updateCalled = false

  Survey.findByIdentifier = async () => ({
    id: 24,
    creator_id: 1,
    title: 'Before Update',
    questions: [{ type: 'input', title: 'Question 1' }],
    settings: {},
    style: {}
  })
  Survey.update = async () => {
    updateCalled = true
    return { id: 24 }
  }

  const { response, json } = await request('/surveys/24', {
    method: 'PUT',
    body: {
      questions: [{
        type: 'radio',
        title: 'Question 1',
        options: [{ label: 'Only option', value: '1' }]
      }]
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /at least 2 options/i)
  assert.equal(updateCalled, false)
})

test('PUT /api/surveys/:id keeps writable QuestionDTO fields while dropping extras', async () => {
  let updatedPayload = null

  Survey.findByIdentifier = async () => ({ id: 17, creator_id: 1, title: 'Before Update' })
  Survey.update = async (_id, payload) => {
    updatedPayload = payload
    return { id: 17, ...payload }
  }

  const { response, json } = await request('/surveys/17', {
    method: 'PUT',
    body: {
      questions: [{
        type: 'matrix',
        title: 'Matrix Question',
        options: [
          { label: 'Column 1', value: '1' },
          { label: 'Column 2', value: '2' }
        ],
        matrix: {
          selectionType: 'single',
          rows: [{
            label: 'Row 1',
            value: 'r1',
            helper: 'drop-me'
          }]
        },
        validation: {
          min: 1,
          max: 5,
          unknownFlag: 'drop-me'
        },
        examConfig: {
          score: 10,
          correctAnswer: '1',
          secret: 'drop-me'
        }
      }]
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.ok(updatedPayload)
  assert.equal(updatedPayload.questions[0].matrix.rows[0].helper, undefined)
  assert.equal(updatedPayload.questions[0].validation.unknownFlag, undefined)
  assert.equal(updatedPayload.questions[0].examConfig.secret, undefined)
  assert.equal(updatedPayload.questions[0].examConfig.score, 10)
  assert.equal(updatedPayload.questions[0].examConfig.correctAnswer, '1')
})

test('PUT /api/surveys/:id strips non-writable settings and style fields before persistence', async () => {
  let updatedPayload = null

  Survey.findByIdentifier = async () => ({
    id: 19,
    creator_id: 1,
    title: 'Before Update',
    questions: [{ type: 'input', title: 'Question 1' }],
    settings: {},
    style: {}
  })
  Survey.update = async (_id, payload) => {
    updatedPayload = payload
    return { id: 19, ...payload }
  }

  const { response, json } = await request('/surveys/19', {
    method: 'PUT',
    body: {
      settings: {
        allowMultipleSubmissions: true,
        collectIP: true,
        syncToken: 'drop-me'
      },
      style: {
        theme: 'bold',
        runtimePreview: true
      }
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.ok(updatedPayload)
  assert.deepEqual(updatedPayload.settings, {
    allowMultipleSubmissions: true,
    collectIP: true
  })
  assert.deepEqual(updatedPayload.style, {
    theme: 'bold'
  })
})

test('POST /api/surveys/:id/publish rejects invalid visibleWhen logic', async () => {
  Survey.findByIdentifier = async () => ({
    id: 20,
    creator_id: 1,
    title: 'Invalid Logic Survey',
    questions: [
      {
        type: 'radio',
        title: 'Question 1',
        options: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }]
      },
      {
        type: 'input',
        title: 'Question 2',
        logic: {
          visibleWhen: [[{ qid: 2, op: 'eq', value: '1' }]]
        }
      }
    ]
  })

  const { response, json } = await request('/surveys/20/publish', { method: 'POST' })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /logic\.visibleWhen/i)
})

test('POST /api/surveys/:id/publish rejects invalid jumpLogic targets', async () => {
  Survey.findByIdentifier = async () => ({
    id: 21,
    creator_id: 1,
    title: 'Invalid Jump Survey',
    questions: [
      {
        type: 'radio',
        title: 'Question 1',
        options: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }],
        jumpLogic: {
          byOption: { '1': '1' }
        }
      },
      {
        type: 'input',
        title: 'Question 2'
      }
    ]
  })

  const { response, json } = await request('/surveys/21/publish', { method: 'POST' })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /jumpLogic/i)
})

test('POST /api/surveys/:id/publish rejects overlapping optionGroups', async () => {
  Survey.findByIdentifier = async () => ({
    id: 22,
    creator_id: 1,
    title: 'Invalid Group Survey',
    questions: [
      {
        type: 'radio',
        title: 'Question 1',
        options: [
          { label: 'A', value: '1' },
          { label: 'B', value: '2' },
          { label: 'C', value: '3' }
        ],
        optionGroups: [
          { name: 'Group A', from: 1, to: 2, random: false },
          { name: 'Group B', from: 2, to: 3, random: false }
        ]
      }
    ]
  })

  const { response, json } = await request('/surveys/22/publish', { method: 'POST' })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /optionGroups/i)
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

test('DELETE /api/answers/batch rejects invalid ids payload structures', async () => {
  const { response, json } = await request('/answers/batch', {
    method: 'DELETE',
    body: { ids: [501, { id: 502 }] }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /ids\[1\] must be an integer/i)
})

