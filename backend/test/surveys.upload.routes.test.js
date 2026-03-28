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

test('POST /api/surveys/:id/responses rejects unpublished surveys through the service flow', async () => {
  Survey.findByIdentifier = async () => ({
    id: 16,
    creator_id: 1,
    status: 'draft',
    title: 'Draft Survey'
  })

  const { response, json } = await requestPublic('/surveys/16/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [] })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'NOT_PUBLISHED')
})

test('POST /api/surveys/:id/uploads allows public uploads for published surveys', async () => {
  let createdPayload = null
  let uploadedFilePath = null

  Survey.findByIdentifier = async () => ({
    id: 31,
    creator_id: 1,
    title: 'Upload Survey',
    status: 'published',
    settings: {},
    questions: [{ type: 'upload', title: '闄勪欢', required: false, order: 1 }]
  })
  FileModel.create = async payload => {
    createdPayload = payload
    return { id: 501, ...payload }
  }

  const form = new FormData()
  form.append('file', new Blob(['hello public upload'], { type: 'application/pdf' }), 'public-upload.pdf')

  try {
    const { response, json } = await requestPublic('/surveys/31/uploads', {
      method: 'POST',
      body: form
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.id, 501)
    assert.equal(json.data.surveyId, 31)
    assert.ok(typeof json.data.uploadToken === 'string' && json.data.uploadToken.length >= 20)
    assert.equal(createdPayload.survey_id, 31)
    assert.equal(createdPayload.name, 'public-upload.pdf')
    assert.equal(createdPayload.type, 'application/pdf')
    assert.ok(createdPayload.public_token)
    uploadedFilePath = `${UPLOAD_DIR}/${createdPayload.url.split('/').pop()}`
  } finally {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath)
  }
})

test('POST /api/surveys/:id/uploads rejects files beyond the upload question limit', async () => {
  Survey.findByIdentifier = async () => ({
    id: 32,
    creator_id: 1,
    title: 'Limited Upload Survey',
    status: 'published',
    settings: {},
    questions: [{
      type: 'upload',
      title: '闄勪欢',
      required: false,
      order: 1,
      upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' }
    }]
  })

  let createCalled = false
  FileModel.create = async () => {
    createCalled = true
    return { id: 999 }
  }
  FileModel.countPendingBySurveyQuestionSession = async () => 1

  const form = new FormData()
  form.append('questionId', '1')
  form.append('submissionToken', 'session-32')
  form.append('file', new Blob(['hello again'], { type: 'application/pdf' }), 'limit.pdf')

  const { response, json } = await requestPublic('/surveys/32/uploads', {
    method: 'POST',
    body: form
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'UPLOAD_VALIDATION')
  assert.equal(createCalled, false)
})

test('POST /api/surveys/:id/responses rejects upload answers with invalid upload tokens', async () => {
  Survey.findByIdentifier = async () => ({
    id: 41,
    creator_id: 1,
    title: 'Upload Answer Survey',
    status: 'published',
    settings: {},
    questions: [{ type: 'upload', title: '闄勪欢', required: true, order: 1 }]
  })
  FileModel.findByIds = async () => ([
    { id: 9001, survey_id: 41, submission_token: 'session-41', public_token: 'correct-token', name: 'x.pdf', url: '/uploads/x.pdf', size: 123, type: 'application/pdf' }
  ])

  const { response, json } = await requestPublic('/surveys/41/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSubmissionToken: 'session-41',
      answers: [
        {
          questionId: 1,
          value: [{ id: 9001, uploadToken: 'wrong-token' }]
        }
      ]
    })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
})

test('POST /api/surveys/:id/responses accepts matrix multiple and dropdown answers', async () => {
  let createdPayload = null

  Survey.findByIdentifier = async () => ({
    id: 44,
    creator_id: 1,
    title: 'Matrix Submission Survey',
    status: 'published',
    settings: {},
    questions: [
      {
        type: 'matrix',
        title: 'Matrix Multiple',
        required: true,
        order: 1,
        options: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }, { label: 'C', value: '3' }],
        matrix: {
          selectionType: 'multiple',
          rows: [{ label: 'Skill 1', value: '1' }, { label: 'Skill 2', value: '2' }]
        }
      },
      {
        type: 'matrix',
        uiType: 24,
        title: 'Matrix Dropdown',
        required: true,
        order: 2,
        options: [{ label: 'High', value: '1' }, { label: 'Medium', value: '2' }],
        matrix: {
          selectionType: 'single',
          rows: [{ label: 'Quality', value: '1' }]
        }
      }
    ]
  })
  Answer.countByIp = async () => 0
  Answer.create = async payload => {
    createdPayload = payload
    return { id: 601, ...payload }
  }
  Survey.incrementResponseCount = async () => 1
  Message.create = async () => ({ id: 1 })

  const { response, json } = await requestPublic('/surveys/44/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: [
        { questionId: 1, value: { 1: ['1', '2'], 2: ['3'] } },
        { questionId: 2, value: { 1: '2' } }
      ]
    })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(createdPayload?.answers_data, [
    { questionId: 1, questionType: 'matrix', value: { 1: ['1', '2'], 2: ['3'] } },
    { questionId: 2, questionType: 'matrix', value: { 1: '2' } }
  ])
})

test('POST /api/surveys/:id/responses accepts ratio answers totaling 100', async () => {
  let createdPayload = null

  Survey.findByIdentifier = async () => ({
    id: 45,
    creator_id: 1,
    title: 'Ratio Submission Survey',
    status: 'published',
    settings: {},
    questions: [
      {
        type: 'ratio',
        title: 'Ratio',
        required: true,
        order: 1,
        options: [{ label: 'Brand', value: '1' }, { label: 'Price', value: '2' }, { label: 'Service', value: '3' }]
      }
    ]
  })
  Answer.countByIp = async () => 0
  Answer.create = async payload => {
    createdPayload = payload
    return { id: 602, ...payload }
  }
  Survey.incrementResponseCount = async () => 1
  Message.create = async () => ({ id: 1 })

  const { response, json } = await requestPublic('/surveys/45/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: [
        { questionId: 1, value: { 1: 40, 2: 35, 3: 25 } }
      ]
    })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(createdPayload?.answers_data, [
    { questionId: 1, questionType: 'ratio', value: { 1: 40, 2: 35, 3: 25 } }
  ])
})

test('POST /api/surveys/:id/responses accepts upload answers with minimal file references', async () => {
  let createdPayload = null
  let attachedIds = null
  let incrementedSurveyId = null
  let systemMessageCreated = false

  Survey.findByIdentifier = async () => ({
    id: 40,
    creator_id: 1,
    title: 'Upload Answer Survey',
    status: 'published',
    settings: {},
    questions: [{
      type: 'upload',
      title: 'Attachment',
      required: true,
      order: 1,
      upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' }
    }]
  })
  FileModel.findByIds = async () => ([
    {
      id: 9000,
      survey_id: 40,
      question_order: 1,
      submission_token: 'session-40',
      public_token: 'token-40',
      name: 'ok.pdf',
      url: '/uploads/ok.pdf',
      size: 123,
      type: 'application/pdf'
    }
  ])
  Answer.countByIp = async () => 0
  Answer.create = async payload => {
    createdPayload = payload
    return { id: 501, ...payload }
  }
  FileModel.attachToAnswer = async (ids, answerId) => {
    attachedIds = { ids, answerId }
    return ids.length
  }
  Survey.incrementResponseCount = async id => {
    incrementedSurveyId = id
  }
  Message.create = async () => {
    systemMessageCreated = true
    return { id: 1 }
  }

  const { response, json } = await requestPublic('/surveys/40/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSubmissionToken: 'session-40',
      answers: [
        {
          questionId: 1,
          value: [{ id: 9000, uploadToken: 'token-40' }]
        }
      ]
    })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 501)
  assert.deepEqual(createdPayload?.answers_data, [
    {
      questionId: 1,
      questionType: 'upload',
      value: [{
        id: 9000,
        name: 'ok.pdf',
        url: '/uploads/ok.pdf',
        size: 123,
        type: 'application/pdf'
      }]
    }
  ])
  assert.deepEqual(attachedIds, { ids: [9000], answerId: 501 })
  assert.equal(incrementedSurveyId, 40)
  assert.equal(systemMessageCreated, true)
})

test('POST /api/surveys/:id/responses rejects upload answers beyond the configured maxFiles', async () => {
  Survey.findByIdentifier = async () => ({
    id: 42,
    creator_id: 1,
    title: 'Upload Limit Survey',
    status: 'published',
    settings: {},
    questions: [{
      type: 'upload',
      title: '闄勪欢',
      required: true,
      order: 1,
      upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' }
    }]
  })
  FileModel.findByIds = async () => ([
    { id: 9101, survey_id: 42, submission_token: 'session-42', public_token: 'token-1', name: 'a.pdf', url: '/uploads/a.pdf', size: 123, type: 'application/pdf' },
    { id: 9102, survey_id: 42, submission_token: 'session-42', public_token: 'token-2', name: 'b.pdf', url: '/uploads/b.pdf', size: 456, type: 'application/pdf' }
  ])

  const { response, json } = await requestPublic('/surveys/42/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSubmissionToken: 'session-42',
      answers: [
        {
          questionId: 1,
          value: [
            { id: 9101, uploadToken: 'token-1' },
            { id: 9102, uploadToken: 'token-2' }
          ]
        }
      ]
    })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
})

test('POST /api/surveys/:id/responses rejects upload answers bound to another upload question', async () => {
  Survey.findByIdentifier = async () => ({
    id: 43,
    creator_id: 1,
    title: 'Upload Question Binding Survey',
    status: 'published',
    settings: {},
    questions: [
      { type: 'upload', title: 'Attachment 1', required: true, order: 1, upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' } },
      { type: 'upload', title: 'Attachment 2', required: false, order: 2, upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' } }
    ]
  })
  FileModel.findByIds = async () => ([
    { id: 9201, survey_id: 43, question_order: 2, submission_token: 'session-43', public_token: 'token-x', name: 'x.pdf', url: '/uploads/x.pdf', size: 123, type: 'application/pdf' }
  ])

  const { response, json } = await requestPublic('/surveys/43/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSubmissionToken: 'session-43',
      answers: [
        {
          questionId: 1,
          value: [{ id: 9201, uploadToken: 'token-x' }]
        }
      ]
    })
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
})


