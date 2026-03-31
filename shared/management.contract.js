import { createPaginatedResult, normalizePaginationQuery } from './pagination.contract.js'

export const MANAGEMENT_ERROR_PREFIX = 'MGMT'

export const MANAGEMENT_ERROR_FAMILIES = Object.freeze({
  ACCESS: `${MANAGEMENT_ERROR_PREFIX}_ACCESS`,
  AI: `${MANAGEMENT_ERROR_PREFIX}_AI`,
  USER: `${MANAGEMENT_ERROR_PREFIX}_USER`,
  ROLE: `${MANAGEMENT_ERROR_PREFIX}_ROLE`,
  DEPT: `${MANAGEMENT_ERROR_PREFIX}_DEPT`,
  POSITION: `${MANAGEMENT_ERROR_PREFIX}_POSITION`,
  FOLDER: `${MANAGEMENT_ERROR_PREFIX}_FOLDER`,
  MESSAGE: `${MANAGEMENT_ERROR_PREFIX}_MESSAGE`,
  FILE: `${MANAGEMENT_ERROR_PREFIX}_FILE`,
  FLOW: `${MANAGEMENT_ERROR_PREFIX}_FLOW`,
  QUESTION_BANK_REPO: `${MANAGEMENT_ERROR_PREFIX}_QUESTION_BANK_REPO`,
  QUESTION_BANK_QUESTION: `${MANAGEMENT_ERROR_PREFIX}_QUESTION_BANK_QUESTION`
})

function createManagementErrorCode(family, reason) {
  return `${family}_${reason}`
}

export const MANAGEMENT_ERROR_CODES = Object.freeze({
  ACCESS_FORBIDDEN: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.ACCESS, 'FORBIDDEN'),
  INVALID_PAYLOAD: createManagementErrorCode(MANAGEMENT_ERROR_PREFIX, 'INVALID_PAYLOAD'),
  AI_IDEMPOTENCY_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.AI, 'IDEMPOTENCY_REQUIRED'),
  AI_IDEMPOTENCY_CONFLICT: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.AI, 'IDEMPOTENCY_CONFLICT'),
  USER_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'NOT_FOUND'),
  USER_REQUIRED_FIELDS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'REQUIRED_FIELDS'),
  USER_EXISTS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'EXISTS'),
  USER_IMPORT_PAYLOAD_INVALID: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'IMPORT_PAYLOAD_INVALID'),
  USER_PASSWORD_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'PASSWORD_REQUIRED'),
  ROLE_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.ROLE, 'NOT_FOUND'),
  ROLE_REQUIRED_FIELDS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.ROLE, 'REQUIRED_FIELDS'),
  ROLE_EXISTS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.ROLE, 'EXISTS'),
  DEPT_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.DEPT, 'NAME_REQUIRED'),
  DEPT_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.DEPT, 'NOT_FOUND'),
  DEPT_HAS_CHILDREN: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.DEPT, 'HAS_CHILDREN'),
  POSITION_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.POSITION, 'NAME_REQUIRED'),
  POSITION_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.POSITION, 'NOT_FOUND'),
  POSITION_EXISTS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.POSITION, 'EXISTS'),
  FOLDER_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'NOT_FOUND'),
  FOLDER_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'NAME_REQUIRED'),
  FOLDER_PARENT_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'PARENT_NOT_FOUND'),
  FOLDER_SELF_PARENT: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'SELF_PARENT'),
  FOLDER_HAS_CHILDREN: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'HAS_CHILDREN'),
  MESSAGE_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.MESSAGE, 'NOT_FOUND'),
  FILE_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FILE, 'REQUIRED'),
  FILE_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FILE, 'NOT_FOUND'),
  FLOW_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FLOW, 'NAME_REQUIRED'),
  FLOW_STATUS_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FLOW, 'STATUS_REQUIRED'),
  FLOW_STATUS_INVALID: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FLOW, 'STATUS_INVALID'),
  FLOW_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FLOW, 'NOT_FOUND'),
  QUESTION_BANK_REPO_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_REPO, 'NAME_REQUIRED'),
  QUESTION_BANK_REPO_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_REPO, 'NOT_FOUND'),
  QUESTION_BANK_QUESTION_TITLE_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_QUESTION, 'TITLE_REQUIRED'),
  QUESTION_BANK_QUESTION_CONTENT_INVALID: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_QUESTION, 'CONTENT_INVALID'),
  QUESTION_BANK_QUESTION_SCORE_INVALID: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_QUESTION, 'SCORE_INVALID'),
  QUESTION_BANK_QUESTION_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_QUESTION, 'NOT_FOUND')
})

export const MANAGEMENT_PAGINATION_DEFAULTS = Object.freeze({
  page: 1,
  pageSize: 20,
  usersPageSize: 20,
  auditsPageSize: 20,
  messagesPageSize: 50,
  filesPageSize: 20,
  managementAiExecutionsPageSize: 20
})

function toNumberOrUndefined(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function toNumberOrNull(value) {
  if (value === null || value === '' || value === 'null') return null
  return toNumberOrUndefined(value)
}

function toBooleanOrUndefined(value) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }

  return undefined
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneJsonValue(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) return value.map(cloneJsonValue).filter(item => item !== undefined)
  if (isPlainObject(value)) {
    return Object.keys(value).reduce((result, key) => {
      const cloned = cloneJsonValue(value[key])
      if (cloned !== undefined) result[key] = cloned
      return result
    }, {})
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) return value
  return String(value)
}

function normalizeQuestionBankOption(option, index) {
  if (typeof option === 'string') {
    const label = option.trim()
    if (!label) return null
    return {
      label,
      value: String(index + 1)
    }
  }

  if (!isPlainObject(option)) return null
  const label = String(option.label ?? option.text ?? '').trim()
  if (!label) return null
  return {
    ...cloneJsonValue(option),
    label,
    value: String(option.value ?? index + 1)
  }
}

function normalizeQuestionBankOptions(options) {
  if (!Array.isArray(options)) return undefined
  return options
    .map((option, index) => normalizeQuestionBankOption(option, index))
    .filter(Boolean)
}

function mapChildren(children) {
  if (!Array.isArray(children)) return undefined
  return children.map(child => createDeptDto(child))
}

export function normalizeUserListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: MANAGEMENT_PAGINATION_DEFAULTS.page,
    pageSize: MANAGEMENT_PAGINATION_DEFAULTS.usersPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    dept_id: toNumberOrUndefined(query?.dept_id),
    is_active: toBooleanOrUndefined(query?.is_active)
  }
}

export function createUserDto(user) {
  if (!user) return null

  const roleId = toNumberOrUndefined(user.role_id ?? user.roleId)
  const deptId = toNumberOrUndefined(user.dept_id ?? user.deptId)
  const positionId = toNumberOrUndefined(user.position_id ?? user.positionId)
  const isActive = Boolean(user.is_active ?? user.isActive)
  const lastLoginAt = user.last_login_at ?? user.lastLoginAt
  const createdAt = user.created_at ?? user.createdAt
  const updatedAt = user.updated_at ?? user.updatedAt

  return {
    ...user,
    role_id: roleId,
    dept_id: deptId,
    position_id: positionId,
    is_active: isActive,
    last_login_at: lastLoginAt,
    created_at: createdAt,
    updated_at: updatedAt,
    roleId,
    deptId,
    positionId,
    isActive,
    lastLoginAt,
    createdAt,
    updatedAt
  }
}

export function createUserPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createUserDto(item)) : [],
    total,
    page,
    pageSize
  })
}

export function createUserImportResult(result = {}) {
  return {
    created: Number(result.created || 0),
    skipped: Number(result.skipped || 0),
    errors: Array.isArray(result.errors) ? result.errors.map(item => ({
      index: toNumberOrUndefined(item?.index),
      row: toNumberOrUndefined(item?.row),
      username: item?.username ? String(item.username) : '',
      reason: String(item?.reason || '')
    })) : []
  }
}

export function createDeptDto(dept) {
  if (!dept) return null

  const parentId = toNumberOrNull(dept.parent_id ?? dept.parentId)
  const sortOrder = Number(dept.sort_order ?? dept.sortOrder ?? 0)
  const createdAt = dept.created_at ?? dept.createdAt

  return {
    ...dept,
    parent_id: parentId,
    sort_order: sortOrder,
    created_at: createdAt,
    parentId,
    sortOrder,
    createdAt,
    children: mapChildren(dept.children)
  }
}

export function createRoleDto(role) {
  if (!role) return null

  const createdAt = role.created_at ?? role.createdAt
  return {
    ...role,
    created_at: createdAt,
    createdAt
  }
}

export function createPositionDto(position) {
  if (!position) return null

  const isVirtual = Boolean(position.is_virtual ?? position.isVirtual)
  const createdAt = position.created_at ?? position.createdAt
  const updatedAt = position.updated_at ?? position.updatedAt

  return {
    ...position,
    is_virtual: isVirtual,
    created_at: createdAt,
    updated_at: updatedAt,
    isVirtual,
    createdAt,
    updatedAt
  }
}

export function createFlowDto(flow) {
  if (!flow) return null

  const id = toNumberOrUndefined(flow.id)
  const createdAt = flow.created_at ?? flow.createdAt
  const updatedAt = flow.updated_at ?? flow.updatedAt

  return {
    ...flow,
    id,
    name: String(flow.name || ''),
    status: flow.status ? String(flow.status) : undefined,
    description: flow.description ? String(flow.description) : undefined,
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  }
}

export function createQuestionBankRepoDto(repo) {
  if (!repo) return null

  const id = toNumberOrUndefined(repo.id)
  const questionCount = Number(repo.questionCount ?? repo.question_count ?? 0)
  const createdAt = repo.created_at ?? repo.createdAt
  const updatedAt = repo.updated_at ?? repo.updatedAt

  return {
    ...repo,
    id,
    name: String(repo.name || ''),
    description: repo.description ? String(repo.description) : undefined,
    question_count: questionCount,
    questionCount,
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  }
}

export function createQuestionBankQuestionDto(question) {
  if (!question) return null

  const id = toNumberOrUndefined(question.id)
  const repoId = toNumberOrUndefined(question.repo_id ?? question.repoId)
  const score = toNumberOrUndefined(question.score)
  const createdAt = question.created_at ?? question.createdAt
  const updatedAt = question.updated_at ?? question.updatedAt
  const rawContent = isPlainObject(question.content) ? cloneJsonValue(question.content) : undefined
  const normalizedOptions = normalizeQuestionBankOptions(rawContent?.options)
  const content = rawContent
    ? {
        ...rawContent,
        title: rawContent.title ? String(rawContent.title) : String(question.title || ''),
        questionType: rawContent.questionType ? String(rawContent.questionType) : (question.type ? String(question.type) : undefined),
        stem: rawContent.stem ? String(rawContent.stem) : undefined,
        options: normalizedOptions,
        analysis: rawContent.analysis ? String(rawContent.analysis) : undefined,
        tags: toStringArray(rawContent.tags),
        knowledgePoints: toStringArray(rawContent.knowledgePoints),
        applicableScenes: toStringArray(rawContent.applicableScenes),
        difficulty: rawContent.difficulty ? String(rawContent.difficulty) : (question.difficulty ? String(question.difficulty) : undefined),
        score: rawContent.score == null ? score : toNumberOrUndefined(rawContent.score)
      }
    : undefined

  return {
    ...question,
    id,
    repo_id: repoId,
    repoId,
    title: String(question.title || ''),
    type: question.type ? String(question.type) : undefined,
    difficulty: question.difficulty ? String(question.difficulty) : undefined,
    score,
    stem: content?.stem,
    options: content?.options,
    correctAnswer: content?.correctAnswer,
    analysis: content?.analysis,
    tags: content?.tags,
    knowledgePoints: content?.knowledgePoints,
    applicableScenes: content?.applicableScenes,
    aiMeta: content?.aiMeta,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  }
}

export function normalizeFolderParentId(parentId) {
  if (parentId === undefined) return undefined
  return toNumberOrNull(parentId)
}

export function normalizeFolderListQuery(query = {}) {
  return {
    hasParent: Object.prototype.hasOwnProperty.call(query || {}, 'parentId'),
    parentId: normalizeFolderParentId(query?.parentId)
  }
}

export function createFolderDto(folder) {
  if (!folder) return null

  const parentId = toNumberOrNull(folder.parentId ?? folder.parent_id)
  const surveyCount = Number(folder.surveyCount ?? folder.survey_count ?? 0)
  const createdAt = folder.createdAt ?? folder.created_at
  const updatedAt = folder.updatedAt ?? folder.updated_at

  return {
    ...folder,
    parent_id: parentId,
    parentId,
    surveyCount,
    createdAt,
    updatedAt
  }
}

export function normalizeMessageListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: MANAGEMENT_PAGINATION_DEFAULTS.page,
    pageSize: MANAGEMENT_PAGINATION_DEFAULTS.messagesPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    unread: toBooleanOrUndefined(query?.unread),
    types: toStringArray(query?.types)
  }
}

export function createMessageDto(message) {
  if (!message) return null

  return {
    ...message,
    id: Number(message.id || 0),
    entityId: message.entityId == null ? null : Number(message.entityId),
    read: Boolean(message.read),
    readAt: message.readAt || null,
    createdAt: message.createdAt || null
  }
}

export function createMessagePageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createMessageDto(item)) : [],
    total,
    page,
    pageSize
  })
}

export function normalizeFileListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: MANAGEMENT_PAGINATION_DEFAULTS.page,
    pageSize: MANAGEMENT_PAGINATION_DEFAULTS.filesPageSize
  })

  const uploaderId = toNumberOrUndefined(query?.uploader_id)
  const surveyId = toNumberOrUndefined(query?.survey_id)

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(uploaderId !== undefined ? { uploader_id: uploaderId } : {}),
    ...(surveyId !== undefined ? { survey_id: surveyId } : {})
  }
}

export function createFileDto(file) {
  if (!file) return null

  const id = toNumberOrUndefined(file.id)
  const uploaderId = toNumberOrUndefined(file.uploader_id ?? file.uploaderId)
  const surveyId = toNumberOrUndefined(file.survey_id ?? file.surveyId)
  const questionOrder = toNumberOrUndefined(file.question_order ?? file.questionOrder)
  const answerId = toNumberOrUndefined(file.answer_id ?? file.answerId)
  const size = toNumberOrUndefined(file.size)
  const createdAt = file.created_at ?? file.createdAt
  const updatedAt = file.updated_at ?? file.updatedAt

  return {
    ...file,
    id,
    name: String(file.name || ''),
    url: file.url ? String(file.url) : undefined,
    type: file.type ? String(file.type) : undefined,
    size,
    uploader_id: uploaderId,
    survey_id: surveyId,
    question_order: questionOrder,
    answer_id: answerId,
    public_token: file.public_token ?? file.publicToken,
    submission_token: file.submission_token ?? file.submissionToken,
    created_at: createdAt,
    updated_at: updatedAt,
    uploaderId,
    surveyId,
    questionOrder,
    answerId,
    publicToken: file.public_token ?? file.publicToken,
    submissionToken: file.submission_token ?? file.submissionToken,
    createdAt,
    updatedAt
  }
}

export function createFilePageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createFileDto(item)) : [],
    total,
    page,
    pageSize
  })
}

export function normalizeAuditListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: MANAGEMENT_PAGINATION_DEFAULTS.page,
    pageSize: MANAGEMENT_PAGINATION_DEFAULTS.auditsPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    username: query?.username ? String(query.username) : undefined,
    action: query?.action ? String(query.action) : undefined,
    targetType: query?.targetType ? String(query.targetType) : undefined
  }
}

export function createAuditLogDto(audit) {
  if (!audit) return null

  return {
    ...audit,
    id: Number(audit.id || 0),
    actorId: audit.actorId == null ? null : Number(audit.actorId),
    targetId: audit.targetId == null ? '' : String(audit.targetId),
    username: audit.username || '',
    actor: audit.actor || audit.username || '-',
    action: audit.action || '',
    targetType: audit.targetType || '',
    detail: audit.detail || '',
    time: audit.time || null
  }
}

export function createAuditPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createAuditLogDto(item)) : [],
    total,
    page,
    pageSize
  })
}

export function normalizeManagementAiExecutionListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: MANAGEMENT_PAGINATION_DEFAULTS.page,
    pageSize: MANAGEMENT_PAGINATION_DEFAULTS.managementAiExecutionsPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    action: query?.action ? String(query.action).trim() : undefined,
    status: query?.status ? String(query.status).trim() : undefined,
    actor_id: toNumberOrUndefined(query?.actor_id),
    created_from: query?.created_from ? String(query.created_from).trim() : undefined,
    created_to: query?.created_to ? String(query.created_to).trim() : undefined
  }
}

export function createManagementAiExecutionDto(execution) {
  if (!execution) return null

  const id = toNumberOrUndefined(execution.id)
  const actorId = toNumberOrUndefined(execution.actor_id ?? execution.actorId)
  const createdAt = execution.created_at ?? execution.createdAt
  const updatedAt = execution.updated_at ?? execution.updatedAt

  return {
    ...execution,
    id,
    actor_id: actorId,
    actorId,
    idempotencyKey: execution.idempotencyKey ? String(execution.idempotencyKey) : String(execution.idempotency_key || ''),
    action: execution.action ? String(execution.action) : '',
    requestHash: execution.requestHash ? String(execution.requestHash) : String(execution.request_hash || ''),
    status: execution.status ? String(execution.status) : 'pending',
    requestPayload: isPlainObject(execution.requestPayload) ? cloneJsonValue(execution.requestPayload) : (isPlainObject(execution.request_payload) ? cloneJsonValue(execution.request_payload) : null),
    responsePayload: isPlainObject(execution.responsePayload) ? cloneJsonValue(execution.responsePayload) : (isPlainObject(execution.response_payload) ? cloneJsonValue(execution.response_payload) : null),
    errorCode: execution.errorCode ? String(execution.errorCode) : (execution.error_code ? String(execution.error_code) : null),
    errorMessage: execution.errorMessage ? String(execution.errorMessage) : (execution.error_message ? String(execution.error_message) : null),
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  }
}

export function createManagementAiExecutionPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createManagementAiExecutionDto(item)) : [],
    total,
    page,
    pageSize
  })
}

export const MANAGEMENT_ACTION_PROTOCOL_VERSION = '2026-03-31'
export const MANAGEMENT_ACTION_KIND = 'management.action'
export const MANAGEMENT_ACTION_PROTOCOL_KIND = 'management.action.protocol'
export const MANAGEMENT_ACTION_BOUNDARIES = Object.freeze({
  auth: 'admin-active-session',
  audit: 'service-audit-plus-ai-execution-ledger',
  idempotency: 'required-on-execute',
  rollback: 'single-action-single-service-transaction'
})

const MANAGEMENT_ACTION_DEFINITIONS = Object.freeze([
  {
    action: 'user.create',
    label: 'Create user',
    payloadField: 'input',
    targetKeys: [],
    summaryTemplate: 'Create a user account',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'user.create',
      input: {
        username: 'alice',
        password: 'ChangeMe123!',
        email: 'alice@example.com',
        role_id: 3,
        dept_id: 12,
        position_id: 8
      },
      reason: 'Create an initial account for the new team member',
      meta: {
        source: 'ai',
        generatedBy: 'gpt-5.4'
      }
    }
  },
  {
    action: 'user.update',
    label: 'Update user',
    payloadField: 'changes',
    targetKeys: ['userId'],
    summaryTemplate: 'Update a user account',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'user.update',
      target: { userId: 1024 },
      changes: {
        dept_id: 12,
        role_id: 3,
        is_active: true
      },
      reason: 'Move the user into the new department and role'
    }
  },
  {
    action: 'user.delete',
    label: 'Delete user',
    payloadField: null,
    targetKeys: ['userId'],
    summaryTemplate: 'Delete a user account',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'user.delete',
      target: { userId: 1024 },
      reason: 'Remove the user account after offboarding'
    }
  },
  {
    action: 'user.password.reset',
    label: 'Reset user password',
    payloadField: 'input',
    targetKeys: ['userId'],
    summaryTemplate: 'Reset a user password',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'user.password.reset',
      target: { userId: 1024 },
      input: {
        password: 'Reset123!'
      },
      reason: 'Issue a temporary password'
    }
  },
  {
    action: 'role.create',
    label: 'Create role',
    payloadField: 'input',
    targetKeys: [],
    summaryTemplate: 'Create a role',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'role.create',
      input: {
        name: 'Data reviewer',
        code: 'data_reviewer',
        permissions: ['survey.read', 'answer.read'],
        remark: 'Review-only role'
      },
      reason: 'Create a read-only data reviewer role'
    }
  },
  {
    action: 'role.update',
    label: 'Update role',
    payloadField: 'changes',
    targetKeys: ['roleId'],
    summaryTemplate: 'Update a role',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'role.update',
      target: { roleId: 3 },
      changes: {
        name: 'Content reviewer',
        permissions: ['survey.read', 'survey.update']
      },
      reason: 'Expand role capability'
    }
  },
  {
    action: 'role.delete',
    label: 'Delete role',
    payloadField: null,
    targetKeys: ['roleId'],
    summaryTemplate: 'Delete a role',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'role.delete',
      target: { roleId: 3 },
      reason: 'Remove an unused role'
    }
  },
  {
    action: 'dept.create',
    label: 'Create department',
    payloadField: 'input',
    targetKeys: [],
    summaryTemplate: 'Create a department',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'dept.create',
      input: {
        name: 'North Region',
        parent_id: 2,
        sort_order: 30
      },
      reason: 'Create a new regional department'
    }
  },
  {
    action: 'dept.update',
    label: 'Update department',
    payloadField: 'changes',
    targetKeys: ['deptId'],
    summaryTemplate: 'Update a department',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'dept.update',
      target: { deptId: 12 },
      changes: {
        name: 'North China Region',
        sort_order: 40
      },
      reason: 'Rename the department after reorganization'
    }
  },
  {
    action: 'dept.delete',
    label: 'Delete department',
    payloadField: null,
    targetKeys: ['deptId'],
    summaryTemplate: 'Delete a department',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'dept.delete',
      target: { deptId: 12 },
      reason: 'Delete an empty department'
    }
  },
  {
    action: 'position.create',
    label: 'Create position',
    payloadField: 'input',
    targetKeys: [],
    summaryTemplate: 'Create a position',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'position.create',
      input: {
        name: 'Senior Analyst',
        code: 'senior_analyst',
        is_virtual: false,
        remark: 'Regional data analysis role'
      },
      reason: 'Add a new job position'
    }
  },
  {
    action: 'position.update',
    label: 'Update position',
    payloadField: 'changes',
    targetKeys: ['positionId'],
    summaryTemplate: 'Update a position',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'position.update',
      target: { positionId: 7 },
      changes: {
        name: 'Lead Analyst',
        is_virtual: true
      },
      reason: 'Rename and convert the position to a virtual post'
    }
  },
  {
    action: 'position.delete',
    label: 'Delete position',
    payloadField: null,
    targetKeys: ['positionId'],
    summaryTemplate: 'Delete a position',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'position.delete',
      target: { positionId: 7 },
      reason: 'Remove an obsolete position'
    }
  },
  {
    action: 'flow.create',
    label: 'Create flow',
    payloadField: 'input',
    targetKeys: [],
    summaryTemplate: 'Create a workflow',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'flow.create',
      input: {
        name: 'Security review',
        status: 'active',
        description: 'Two-step approval flow'
      },
      reason: 'Add a new approval flow'
    }
  },
  {
    action: 'flow.update',
    label: 'Update flow',
    payloadField: 'changes',
    targetKeys: ['flowId'],
    summaryTemplate: 'Update a workflow',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'flow.update',
      target: { flowId: 5 },
      changes: {
        status: 'disabled',
        description: 'Temporarily disabled during migration'
      },
      reason: 'Pause a deprecated flow'
    }
  },
  {
    action: 'flow.delete',
    label: 'Delete flow',
    payloadField: null,
    targetKeys: ['flowId'],
    summaryTemplate: 'Delete a workflow',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'flow.delete',
      target: { flowId: 5 },
      reason: 'Remove an unused flow'
    }
  },
  {
    action: 'question_bank.repo.create',
    label: 'Create question bank repo',
    payloadField: 'input',
    targetKeys: [],
    summaryTemplate: 'Create a question bank repository',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'question_bank.repo.create',
      input: {
        name: 'Customer satisfaction',
        description: 'Reusable customer satisfaction questions'
      },
      reason: 'Initialize a themed question bank'
    }
  },
  {
    action: 'question_bank.repo.update',
    label: 'Update question bank repo',
    payloadField: 'changes',
    targetKeys: ['repoId'],
    summaryTemplate: 'Update a question bank repository',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'question_bank.repo.update',
      target: { repoId: 4 },
      changes: {
        name: 'Advanced customer satisfaction',
        description: 'Updated repository description'
      },
      reason: 'Adjust the repository scope'
    }
  },
  {
    action: 'question_bank.repo.delete',
    label: 'Delete question bank repo',
    payloadField: null,
    targetKeys: ['repoId'],
    summaryTemplate: 'Delete a question bank repository',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'question_bank.repo.delete',
      target: { repoId: 4 },
      reason: 'Remove an obsolete repository'
    }
  },
  {
    action: 'question_bank.question.create',
    label: 'Create question bank question',
    payloadField: 'input',
    targetKeys: ['repoId'],
    summaryTemplate: 'Create a question in a question bank repository',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'question_bank.question.create',
      target: { repoId: 4 },
      input: {
        title: 'How satisfied are you with the product?',
        type: 'radio',
        difficulty: 'easy',
        score: 5,
        options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'],
        aiMeta: {
          generatedBy: 'gpt-5.4',
          reviewStatus: 'draft'
        }
      },
      reason: 'Add a reusable satisfaction question'
    }
  },
  {
    action: 'question_bank.question.delete',
    label: 'Delete question bank question',
    payloadField: null,
    targetKeys: ['repoId', 'questionId'],
    summaryTemplate: 'Delete a question from a question bank repository',
    example: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'question_bank.question.delete',
      target: {
        repoId: 4,
        questionId: 88
      },
      reason: 'Delete a duplicate question'
    }
  }
])

export function listManagementActionDefinitions() {
  return MANAGEMENT_ACTION_DEFINITIONS.map(item => cloneJsonValue(item))
}

export function createManagementActionProtocol() {
  return {
    kind: MANAGEMENT_ACTION_PROTOCOL_KIND,
    version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
    adminOnly: true,
    boundaries: MANAGEMENT_ACTION_BOUNDARIES,
    notes: [
      'All management JSON actions are admin-only.',
      'AI must emit controlled action envelopes instead of writing tables directly.',
      'The server authenticates, validates, executes through existing services, and records audits.',
      'Use dryRun before execute whenever the action is AI-generated.',
      'Execute requests must carry idempotencyKey.',
      'Each request may execute exactly one management action.'
    ],
    envelope: {
      kind: MANAGEMENT_ACTION_KIND,
      version: MANAGEMENT_ACTION_PROTOCOL_VERSION,
      action: 'string',
      dryRun: false,
      idempotencyKey: 'string',
      target: {},
      input: {},
      changes: {},
      reason: 'string',
      meta: {
        source: 'ai',
        generatedBy: 'string',
        traceId: 'string'
      }
    },
    actions: listManagementActionDefinitions()
  }
}
