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

test('GET /api/surveys lists surveys through the service flow', async () => {
  let receivedParams = null

  Survey.list = async params => {
    receivedParams = params
    return {
      total: 1,
      list: [{ id: 1, title: 'Listed Survey' }]
    }
  }

  const { response, json } = await request('/surveys?page=2&pageSize=5&folder_id=null')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 1)
  assert.equal(json.data.page, 2)
  assert.equal(json.data.pageSize, 5)
  assert.equal(json.data.list[0].title, 'Listed Survey')
  assert.equal(receivedParams.page, 2)
  assert.equal(receivedParams.pageSize, 5)
  assert.equal(receivedParams.folder_id, null)
})

test('GET /api/surveys/trash lists trashed surveys through the service flow', async () => {
  let receivedParams = null

  Survey.listTrash = async params => {
    receivedParams = params
    return {
      total: 1,
      list: [{ id: 2, title: 'Trash Survey', deletedAt: '2026-03-23T10:00:00.000Z' }]
    }
  }

  const { response, json } = await request('/surveys/trash?page=3&pageSize=7')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.total, 1)
  assert.equal(json.data.total, 1)
  assert.equal(json.data.page, 3)
  assert.equal(json.data.pageSize, 7)
  assert.equal(json.data.list[0].title, 'Trash Survey')
  assert.equal(receivedParams.page, 3)
  assert.equal(receivedParams.pageSize, 7)
})

test('GET /api/surveys/share/:code returns a public survey through the service flow', async () => {
  Survey.findByShareCode = async code => ({
    id: 3,
    share_code: code,
    creator_id: 1,
    status: 'published',
    title: 'Shared Survey'
  })

  const { response, json } = await requestPublic('/surveys/share/abc123')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.title, 'Shared Survey')
})

