import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import folderRepository from '../repositories/folderRepository.js'
import {
  ensurePlainObjectPayload,
  normalizeOptionalId,
  normalizeRequiredTrimmedString
} from '../utils/managementPayload.js'
import { ensureQueryObject, normalizeOptionalIntegerQuery } from '../utils/queryValidation.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
import {
  createFolderDto,
  MANAGEMENT_ERROR_CODES,
  normalizeFolderListQuery,
  normalizeFolderParentId
} from '../../../shared/management.contract.js'

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key)
}

function getFolderParentFromBody(body = {}) {
  const hasParent = hasOwn(body, 'parentId') || hasOwn(body, 'parent_id')
  return {
    hasParent,
    parentId: hasParent
      ? normalizeFolderParentId(normalizeOptionalId(body.parentId ?? body.parent_id ?? null, {
          field: hasOwn(body, 'parentId') ? 'parentId' : 'parent_id',
          allowNull: true
        }))
      : undefined
  }
}

function ensureAuthenticated(actor) {
  throwManagementPolicyError(getAuthenticatedActorPolicy(actor))
}

function throwInvalidQuery(message) {
  throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
}

async function ensureParentFolder(parentId, creatorId, options = {}) {
  if (parentId == null) return null

  const parent = await folderRepository.findById(parentId, creatorId, options)
  if (!parent) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.FOLDER_PARENT_NOT_FOUND, 'Folder parent not found')
  }

  return parent
}

async function getManagedFolderOrThrow(folderId, actor, options = {}) {
  const folder = await folderRepository.findById(folderId, actor.sub, options)
  if (!folder) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.FOLDER_NOT_FOUND, 'Folder not found')
  }

  return folder
}

export async function listManagedFolders({ actor, query = {} }) {
  ensureAuthenticated(actor)
  ensureQueryObject(query, throwInvalidQuery)
  const normalized = normalizeFolderListQuery({
    ...query,
    parentId: Object.prototype.hasOwnProperty.call(query, 'parentId')
      ? normalizeOptionalIntegerQuery(query.parentId, 'parentId', throwInvalidQuery, { allowNull: true, positive: true })
      : undefined
  })

  const list = await folderRepository.list({
    creator_id: actor.sub,
    parent_id: normalized.hasParent ? normalized.parentId : undefined
  })
  return list.map(item => createFolderDto(item))
}

export async function listAllManagedFolders({ actor }) {
  ensureAuthenticated(actor)
  const list = await folderRepository.list({ creator_id: actor.sub })
  return list.map(item => createFolderDto(item))
}

export async function createManagedFolder({ actor, body = {} }) {
  ensureAuthenticated(actor)
  body = ensurePlainObjectPayload(body)
  return runManagementTransaction(async db => {
    const name = normalizeRequiredTrimmedString(body.name, {
      field: 'name',
      code: MANAGEMENT_ERROR_CODES.FOLDER_NAME_REQUIRED,
      message: 'Folder name is required'
    })
    const parent_id = normalizeFolderParentId(normalizeOptionalId(body.parentId ?? body.parent_id ?? null, {
      field: hasOwn(body, 'parentId') ? 'parentId' : 'parent_id',
      allowNull: true
    }))

    await ensureParentFolder(parent_id, actor.sub, { db })
    const folder = await folderRepository.create({
      creator_id: actor.sub,
      name,
      parent_id
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'folder.create',
        targetType: 'folder',
        targetId: folder.id,
        detail: `Created folder ${name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Folder created',
        content: `Folder "${name}" is ready.`,
        entityType: 'folder',
        entityId: folder.id
      }
    }, { db })

    return createFolderDto(folder)
  })
}

export async function updateManagedFolder({ actor, folderId, body = {} }) {
  ensureAuthenticated(actor)
  body = ensurePlainObjectPayload(body)
  return runManagementTransaction(async db => {
    const existing = await getManagedFolderOrThrow(folderId, actor, { db })
    const { hasParent, parentId } = getFolderParentFromBody(body)

    if (hasParent && parentId !== null && Number(parentId) === Number(existing.id)) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.FOLDER_SELF_PARENT, 'Folder cannot be its own parent')
    }

    if (hasParent) {
      await ensureParentFolder(parentId, actor.sub, { db })
    }

    const name = body.name === undefined
      ? undefined
      : normalizeRequiredTrimmedString(body.name, {
          field: 'name',
          code: MANAGEMENT_ERROR_CODES.FOLDER_NAME_REQUIRED,
          message: 'Folder name is required'
        })

    const folder = await folderRepository.update(existing.id, actor.sub, {
      name,
      parent_id: hasParent ? parentId : undefined
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'folder.update',
        targetType: 'folder',
        targetId: folder?.id || existing.id,
        detail: `Updated folder ${folder?.name || existing.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Folder updated',
        content: `Folder "${folder?.name || existing.name}" was updated.`,
        entityType: 'folder',
        entityId: folder?.id || existing.id
      }
    }, { db })

    return createFolderDto(folder)
  })
}

export async function deleteManagedFolder({ actor, folderId }) {
  ensureAuthenticated(actor)
  return runManagementTransaction(async db => {
    const existing = await getManagedFolderOrThrow(folderId, actor, { db })

    const childCount = await folderRepository.countChildren(existing.id, actor.sub, { db })
    if (childCount > 0) {
      throwManagementError(409, MANAGEMENT_ERROR_CODES.FOLDER_HAS_CHILDREN, 'Delete child folders first')
    }

    const movedSurveys = await folderRepository.moveSurveysToRoot(existing.id, actor.sub, { db })
    await folderRepository.delete(existing.id, actor.sub, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'folder.delete',
        targetType: 'folder',
        targetId: existing.id,
        detail: `Deleted folder ${existing.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Folder deleted',
        content: movedSurveys > 0
          ? `Folder "${existing.name}" was deleted and ${movedSurveys} surveys were moved to root.`
          : `Folder "${existing.name}" was deleted.`,
        entityType: 'folder',
        entityId: existing.id
      }
    }, { db })

    return { movedSurveys }
  })
}
