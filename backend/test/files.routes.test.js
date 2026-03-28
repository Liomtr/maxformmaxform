import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import jwt from 'jsonwebtoken'
import FileModel from '../src/models/File.js'
import config from '../src/config/index.js'
import { registerApiRouteHarness, UPLOAD_DIR } from './helpers/apiRouteHarness.js'

const { request, requestPublic } = registerApiRouteHarness()

function createUserToken(payload = {}) {
  return jwt.sign(
    { sub: 2, username: 'user', roleCode: 'user', ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

test('GET /api/files lists files through the query service flow', async () => {
  let listPayload = null

  FileModel.list = async payload => {
    listPayload = payload
    return { total: 1, list: [{ id: 1, name: 'a.pdf' }] }
  }

  const { response, json } = await request('/files?page=2&pageSize=5&uploader_id=9')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, { total: 1, list: [{ id: 1, name: 'a.pdf' }] })
  assert.deepEqual(listPayload, {
    page: 2,
    pageSize: 5,
    uploader_id: 9
  })
})

test('POST /api/files/upload saves the uploaded file through the command service flow', async () => {
  let createdPayload = null
  let uploadedFilePath = null

  FileModel.create = async payload => {
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

test('POST /api/files/upload/image returns image payload through the command service flow', async () => {
  let uploadedFilePath = null

  FileModel.create = async payload => ({ id: 502, ...payload })

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
  FileModel.findById = async () => ({
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
  assert.equal(json.error.code, 'FORBIDDEN')
})

test('DELETE /api/files/:id removes the stored file from db and disk', async () => {
  const fixtureName = 'files-route-delete-fixture.txt'
  const fixturePath = `${UPLOAD_DIR}/${fixtureName}`
  fs.writeFileSync(fixturePath, 'delete me')

  let deletedId = null
  FileModel.findById = async () => ({
    id: 602,
    url: `/uploads/${fixtureName}`,
    uploader_id: 1
  })
  FileModel.delete = async id => {
    deletedId = id
    return 1
  }

  try {
    const { response, json } = await request('/files/602', { method: 'DELETE' })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(deletedId, '602')
    assert.equal(fs.existsSync(fixturePath), false)
  } finally {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath)
  }
})
