import { isAdmin, isOwner } from './accessPolicy.js'

export function canManageFile(user, file) {
  return isAdmin(user) || isOwner(user, file?.uploader_id)
}

export function getManageFilePolicy(user, file) {
  if (canManageFile(user, file)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    status: 403,
    body: {
      success: false,
      error: { code: 'FORBIDDEN', message: '无权删除该文件' }
    }
  }
}

export function resolveFileListUploaderId(user, requestedUploaderId) {
  if (isAdmin(user)) {
    return requestedUploaderId !== undefined ? Number(requestedUploaderId) : undefined
  }

  return user?.sub
}
