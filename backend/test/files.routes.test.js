import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import jwt from 'jsonwebtoken'
import config from '../src/config/index.js'
import fileRepository from '../src/repositories/fileRepository.js'
import { registerApiRouteHarness, UPLOAD_DIR } from './helpers/apiRouteHarness.js'

const { request, requestPublic } = registerApiRouteHarness()
const originalList = fileRepository.list
const originalCreate = fileRepository.create
const originalFindById = fileRepository.findById
const originalDelete = fileRepository.delete

afterEach(() => {
  fileRepository.list = originalList
  fileRepository.create = originalCreate
  fileRepository.findById = originalFindById
  fileRepository.delete = originalDelete
})

function createUserToken(payload = {}) {
  return jwt.sign(
    { sub: 2, username: 'user', roleCode: 'user', ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

test('GET /api/files lists files through the query service flow', async () => {
  let listPayload = null

  fileRepository.list = async payload => {
    listPayload = payload
    return { total: 1, list: [{ id: 1, name: 'a.pdf' }] }
  }

  const { response, json } = await request('/files?page=2&pageSize=5&uploader_id=9')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, {
    total: 1,
    page: 2,
    pageSize: 5,
    list: [{ id: 1, name: 'a.pdf' }]
  })
  assert.deepEqual(listPayload, {
    page: 2,
    pageSize: 5,
    uploader_id: 9
  })
})

test('GET /api/files rejects invalid uploader_id query structure', async () => {
  const { response, json } = await request('/files?uploader_id=abc')

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /uploader_id must be an integer/i)
})

test('POST /api/files/upload saves the uploaded file through the command service flow', async () => {
  let createdPayload = null
  let uploadedFilePath = null

  fileRepository.create = async payload => {
    createdPayload = payload
    return { id: 501, ...payload }
  }

  const form = new FormData()
  form.append('file', new Blob(['hello file upload'], { type: 'application/pdf' }), 'manual.pdf')

  try {
    const { response, json } = await requestPublic('/files/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${createUserToken()}` },
      body: form
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.id, 501)
    assert.equal(json.data.name, 'manual.pdf')
    assert.equal(createdPayload.uploader_id, 2)
    assert.equal(createdPayload.type, 'application/pdf')
    assert.match(createdPayload.url, /^\/uploads\//)
    uploadedFilePath = `${UPLOAD_DIR}/${createdPayload.url.split('/').pop()}`
  } finally {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath)
  }
})

test('POST /api/files/upload validates missing file with management error code', async () => {
  const { response, json } = await request('/files/upload', { method: 'POST' })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_FILE_REQUIRED')
})

test('POST /api/files/upload/image returns image payload through the command service flow', async () => {
  let uploadedFilePath = null

  fileRepository.create = async payload => ({ id: 502, ...payload })

  const form = new FormData()
  form.append('file', new Blob(['hello image upload'], { type: 'image/png' }), 'image.png')

  try {
    const { response, json } = await requestPublic('/files/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${createUserToken()}` },
      body: form
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.id, 502)
    assert.equal(json.data.filename, 'image.png')
    assert.match(json.data.url, /^\/uploads\//)
    uploadedFilePath = `${UPLOAD_DIR}/${json.data.url.split('/').pop()}`
  } finally {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath)
  }
})

test('DELETE /api/files/:id rejects deleting files owned by another user', async () => {
  fileRepository.findById = async () => ({
    id: 601,
    url: '/uploads/other.pdf',
    uploader_id: 9
  })

  const { response, json } = await requestPublic('/files/601', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${createUserToken()}` }
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
})

test('DELETE /api/files/:id returns management not found code for missing files', async () => {
  fileRepository.findById = async () => null

  const { response, json } = await request('/files/999', { method: 'DELETE' })

  assert.equal(response.status, 404)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_FILE_NOT_FOUND')
})

test('DELETE /api/files/:id rejects invalid file id structure', async () => {
  const { response, json } = await request('/files/abc', { method: 'DELETE' })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /id must be an integer/i)
})

test('DELETE /api/files/:id removes the stored file from db and disk', async () => {
  const fixtureName = 'files-route-delete-fixture.txt'
  const fixturePath = `${UPLOAD_DIR}/${fixtureName}`
  fs.writeFileSync(fixturePath, 'delete me')

  let deletedId = null
  fileRepository.findById = async () => ({
    id: 602,
    url: `/uploads/${fixtureName}`,
    uploader_id: 1
  })
  fileRepository.delete = async id => {
    deletedId = id
    return 1
  }

  try {
    const { response, json } = await request('/files/602', { method: 'DELETE' })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(deletedId, 602)
    assert.equal(fs.existsSync(fixturePath), false)
  } finally {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath)
  }
})
