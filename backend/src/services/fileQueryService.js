import FileModel from '../models/File.js'
import { resolveFileListUploaderId } from '../policies/filePolicy.js'

export async function listManagedFiles({ actor, query = {} }) {
  const { page = 1, pageSize = 20, uploader_id } = query
  return FileModel.list({
    page: Number(page),
    pageSize: Number(pageSize),
    uploader_id: resolveFileListUploaderId(actor, uploader_id)
  })
}
