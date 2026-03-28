import { createResponseError, throwPolicyError } from '../http/errors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import deptRepository from '../repositories/deptRepository.js'
import { createAuditMessage, recordAudit } from './activity.js'
import { createDeptDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwPolicyError(getAdminPolicy(actor))
}

export async function listManagedDepts() {
  const list = await deptRepository.list()
  return list.map(item => createDeptDto(item))
}

export async function getManagedDeptTree() {
  const tree = await deptRepository.tree()
  return tree.map(item => createDeptDto(item))
}

export async function createManagedDept({ actor, body = {} }) {
  ensureAdmin(actor)

  const name = String(body.name || '').trim()
  if (!name) {
    throw createResponseError(400, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.VALIDATION, message: 'Department name is required' }
    })
  }

  const dept = await deptRepository.create({
    name,
    parent_id: body.parent_id,
    sort_order: body.sort_order
  })

  await recordAudit({
    actor,
    action: 'dept.create',
    targetType: 'dept',
    targetId: dept.id,
    detail: `Created department ${dept.name}`
  })
  await createAuditMessage({
    recipientId: actor.sub,
    createdBy: actor.sub,
    title: 'Department created',
    content: `Department "${dept.name}" was created.`,
    entityType: 'dept',
    entityId: dept.id
  })

  return createDeptDto(dept)
}

export async function updateManagedDept({ actor, deptId, body = {} }) {
  ensureAdmin(actor)

  const dept = await deptRepository.update(deptId, {
    name: body.name === undefined ? undefined : String(body.name).trim(),
    parent_id: body.parent_id,
    sort_order: body.sort_order
  })

  if (!dept) {
    throw createResponseError(404, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.NOT_FOUND, message: 'Department not found' }
    })
  }

  await recordAudit({
    actor,
    action: 'dept.update',
    targetType: 'dept',
    targetId: dept.id,
    detail: `Updated department ${dept.name}`
  })

  return createDeptDto(dept)
}

export async function deleteManagedDept({ actor, deptId }) {
  ensureAdmin(actor)

  const dept = await deptRepository.findById(deptId)
  if (!dept) {
    throw createResponseError(404, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.NOT_FOUND, message: 'Department not found' }
    })
  }

  const childCount = await deptRepository.countChildren(deptId)
  if (childCount > 0) {
    throw createResponseError(409, {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.DEPT_HAS_CHILDREN, message: 'Delete child departments first' }
    })
  }

  const userCount = await deptRepository.countUsers(deptId)
  if (userCount > 0) {
    await deptRepository.clearUsersDept(deptId)
  }

  await deptRepository.delete(deptId)
  await recordAudit({
    actor,
    action: 'dept.delete',
    targetType: 'dept',
    targetId: dept.id,
    detail: `Deleted department ${dept.name}`
  })
  await createAuditMessage({
    recipientId: actor.sub,
    createdBy: actor.sub,
    title: 'Department deleted',
    content: userCount > 0
      ? `Department "${dept.name}" was deleted and ${userCount} users were detached.`
      : `Department "${dept.name}" was deleted.`,
    entityType: 'dept',
    entityId: dept.id
  })

  return { clearedUsers: userCount }
}
