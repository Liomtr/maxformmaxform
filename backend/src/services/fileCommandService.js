import FileModel from '../models/File.js'
import { getManageFilePolicy } from '../policies/filePolicy.js'
import { buildUploadedFileUrl, removeUploadedFile } from '../utils/uploadStorage.js'

function createResponseError(status, body) {
  const error = Object.assign(new Error(body?.error?.message || 'Request failed'), {
    status,
    body
  })
  if (body?.error?.code) error.code = body.error.code
  return error
}

function ensureUploadedFile(file) {
  if (file) return
  throw createResponseError(400, {
    success: false,
    error: { code: 'NO_FILE', message: 'File is required' }
  })
}

async function createManagedFileRecord({ actor, file }) {
  ensureUploadedFile(file)

  const url = buildUploadedFileUrl(file)
  return FileModel.create({
    name: file.originalname || file.filename,
    url,
    size: file.size,
    type: file.mimetype,
    uploader_id: actor.sub
  })
}

export async function uploadManagedFile({ actor, file }) {
  return createManagedFileRecord({ actor, file })
}

export async function uploadManagedImage({ actor, file }) {
  const saved = await createManagedFileRecord({ actor, file })
  return {
    id: saved.id,
    url: saved.url,
    filename: saved.name
  }
}

export async function deleteManagedFile({ actor, fileId }) {
  const file = await FileModel.findById(fileId)
  if (!file) {
    throw createResponseError(404, {
      success: false,
      error: { code: 'NOT_FOUND', message: 'File not found' }
    })
  }

  const policy = getManageFilePolicy(actor, file)
  if (!policy.allowed) {
    throw createResponseError(policy.status, policy.body)
  }

  removeUploadedFile(file)
  await FileModel.delete(fileId)
}
