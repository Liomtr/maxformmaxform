import type { PaginatedResultDTO, PaginationQueryDTO } from './pagination.contract.js'

export interface UserDTO {
  id: number
  username: string
  email?: string
  role_id?: number
  dept_id?: number
  position_id?: number
  avatar?: string
  is_active: boolean
  last_login_at?: string
  created_at?: string
  updated_at?: string
  roleId?: number
  deptId?: number
  positionId?: number
  isActive?: boolean
  lastLoginAt?: string
  createdAt?: string
  updatedAt?: string
  nickname?: string
  role?: string
  status?: string
  lockUntil?: string | null
  surveyCount?: number
  submissionCount?: number
}

export interface UserImportErrorDTO {
  index?: number
  row?: number
  username?: string
  reason: string
}

export interface UserImportResultDTO {
  created: number
  skipped: number
  errors: UserImportErrorDTO[]
}

export interface UserListQueryDTO extends PaginationQueryDTO {
  dept_id?: number | string | null
  is_active?: boolean | number | string | null
}

export interface DeptDTO {
  id: number
  name: string
  parent_id?: number | null
  sort_order: number
  created_at?: string
  parentId?: number | null
  sortOrder?: number
  createdAt?: string
  children?: DeptDTO[]
  code?: string
  status?: string
}

export interface DeptFormDTO {
  name: string
  parent_id?: number | null
  sort_order?: number
}

export interface RoleDTO {
  id: number
  name: string
  code: string
  permissions?: string[]
  remark?: string
  created_at?: string
  createdAt?: string
}

export interface RoleFormDTO {
  name: string
  code: string
  permissions?: string[]
  remark?: string
}

export interface PositionDTO {
  id?: number
  name: string
  code?: string | null
  is_virtual?: boolean
  isVirtual?: boolean
  remark?: string | null
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
}

export interface FlowDTO {
  id?: number
  name: string
  status?: string
  description?: string
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
}

export interface FlowFormDTO {
  name: string
  status?: string
  description?: string
}

export interface QuestionBankRepoDTO {
  id?: number
  name: string
  description?: string
  question_count?: number
  questionCount?: number
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
}

export interface QuestionBankRepoFormDTO {
  name: string
  description?: string
}

export interface QuestionBankQuestionOptionDTO {
  label: string
  value?: string
  text?: string
  desc?: string
  [key: string]: unknown
}

export interface QuestionBankQuestionContentDTO {
  title?: string
  questionType?: string
  stem?: string
  options?: QuestionBankQuestionOptionDTO[]
  correctAnswer?: unknown
  analysis?: string
  tags?: string[]
  knowledgePoints?: string[]
  applicableScenes?: string[]
  difficulty?: string
  score?: number
  surveyQuestion?: Record<string, unknown>
  aiMeta?: Record<string, unknown>
  [key: string]: unknown
}

export interface QuestionBankQuestionDTO {
  id?: number
  repo_id?: number
  repoId?: number
  title: string
  type?: string
  difficulty?: string
  score?: number
  stem?: string
  options?: QuestionBankQuestionOptionDTO[]
  correctAnswer?: unknown
  analysis?: string
  tags?: string[]
  knowledgePoints?: string[]
  applicableScenes?: string[]
  aiMeta?: Record<string, unknown>
  content?: QuestionBankQuestionContentDTO
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
}

export interface QuestionBankQuestionFormDTO {
  title: string
  type?: string
  difficulty?: string
  score?: number
  stem?: string
  options?: Array<QuestionBankQuestionOptionDTO | string>
  correctAnswer?: unknown
  analysis?: string
  tags?: string[] | string
  knowledgePoints?: string[] | string
  applicableScenes?: string[] | string
  aiMeta?: Record<string, unknown>
  content?: QuestionBankQuestionContentDTO
}

export interface FolderDTO {
  id: number
  creator_id?: number
  name: string
  parent_id?: number | null
  parentId?: number | null
  surveyCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface FolderFormDTO {
  name: string
  parentId?: number | null
  parent_id?: number | null
}

export interface FolderListQueryDTO {
  parentId?: number | string | null
}

export interface MessageDTO {
  id: number
  type?: string
  level?: string
  title: string
  content?: string
  entityType?: string | null
  entityId?: number | null
  read?: boolean
  readAt?: string | null
  createdAt?: string | null
}

export interface MessageListQueryDTO extends PaginationQueryDTO {
  unread?: boolean | number | string | null
  types?: string | string[] | null
}

export interface FileDTO {
  id: number
  name: string
  url?: string
  type?: string
  size?: number
  uploader_id?: number
  survey_id?: number
  question_order?: number
  answer_id?: number
  public_token?: string | null
  submission_token?: string | null
  created_at?: string
  updated_at?: string
  uploaderId?: number
  surveyId?: number
  questionOrder?: number
  answerId?: number
  publicToken?: string | null
  submissionToken?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface FileListQueryDTO extends PaginationQueryDTO {
  uploader_id?: number | string | null
  survey_id?: number | string | null
}

export interface AuditLogDTO {
  id: number
  actorId?: number | null
  actor?: string
  username?: string
  action: string
  targetType?: string
  targetId?: string
  detail?: string
  time?: string | null
}

export interface AuditListQueryDTO extends PaginationQueryDTO {
  username?: string | null
  action?: string | null
  targetType?: string | null
}

export interface ManagementAiExecutionDTO {
  id: number
  actor_id?: number
  actorId?: number
  idempotencyKey: string
  action: string
  requestHash: string
  status: string
  requestPayload?: Record<string, unknown> | null
  responsePayload?: Record<string, unknown> | null
  errorCode?: string | null
  errorMessage?: string | null
  created_at?: string | null
  updated_at?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface ManagementAiExecutionListQueryDTO extends PaginationQueryDTO {
  action?: string | null
  status?: string | null
  actor_id?: number | string | null
  created_from?: string | null
  created_to?: string | null
}

export type UserPageDTO = PaginatedResultDTO<UserDTO>
export type MessagePageDTO = PaginatedResultDTO<MessageDTO>
export type FilePageDTO = PaginatedResultDTO<FileDTO>
export type AuditPageDTO = PaginatedResultDTO<AuditLogDTO>
export type ManagementAiExecutionPageDTO = PaginatedResultDTO<ManagementAiExecutionDTO>

export const MANAGEMENT_ERROR_PREFIX: 'MGMT'

export const MANAGEMENT_ERROR_FAMILIES: Readonly<{
  ACCESS: 'MGMT_ACCESS'
  AI: 'MGMT_AI'
  USER: 'MGMT_USER'
  ROLE: 'MGMT_ROLE'
  DEPT: 'MGMT_DEPT'
  POSITION: 'MGMT_POSITION'
  FOLDER: 'MGMT_FOLDER'
  MESSAGE: 'MGMT_MESSAGE'
  FILE: 'MGMT_FILE'
  FLOW: 'MGMT_FLOW'
  QUESTION_BANK_REPO: 'MGMT_QUESTION_BANK_REPO'
  QUESTION_BANK_QUESTION: 'MGMT_QUESTION_BANK_QUESTION'
}>

export const MANAGEMENT_ERROR_CODES: Readonly<{
  ACCESS_FORBIDDEN: 'MGMT_ACCESS_FORBIDDEN'
  INVALID_PAYLOAD: 'MGMT_INVALID_PAYLOAD'
  AI_IDEMPOTENCY_REQUIRED: 'MGMT_AI_IDEMPOTENCY_REQUIRED'
  AI_IDEMPOTENCY_CONFLICT: 'MGMT_AI_IDEMPOTENCY_CONFLICT'
  USER_NOT_FOUND: 'MGMT_USER_NOT_FOUND'
  USER_REQUIRED_FIELDS: 'MGMT_USER_REQUIRED_FIELDS'
  USER_EXISTS: 'MGMT_USER_EXISTS'
  USER_IMPORT_PAYLOAD_INVALID: 'MGMT_USER_IMPORT_PAYLOAD_INVALID'
  USER_PASSWORD_REQUIRED: 'MGMT_USER_PASSWORD_REQUIRED'
  ROLE_NOT_FOUND: 'MGMT_ROLE_NOT_FOUND'
  ROLE_REQUIRED_FIELDS: 'MGMT_ROLE_REQUIRED_FIELDS'
  ROLE_EXISTS: 'MGMT_ROLE_EXISTS'
  DEPT_NAME_REQUIRED: 'MGMT_DEPT_NAME_REQUIRED'
  DEPT_NOT_FOUND: 'MGMT_DEPT_NOT_FOUND'
  DEPT_HAS_CHILDREN: 'MGMT_DEPT_HAS_CHILDREN'
  POSITION_NAME_REQUIRED: 'MGMT_POSITION_NAME_REQUIRED'
  POSITION_NOT_FOUND: 'MGMT_POSITION_NOT_FOUND'
  POSITION_EXISTS: 'MGMT_POSITION_EXISTS'
  FOLDER_NOT_FOUND: 'MGMT_FOLDER_NOT_FOUND'
  FOLDER_NAME_REQUIRED: 'MGMT_FOLDER_NAME_REQUIRED'
  FOLDER_PARENT_NOT_FOUND: 'MGMT_FOLDER_PARENT_NOT_FOUND'
  FOLDER_SELF_PARENT: 'MGMT_FOLDER_SELF_PARENT'
  FOLDER_HAS_CHILDREN: 'MGMT_FOLDER_HAS_CHILDREN'
  MESSAGE_NOT_FOUND: 'MGMT_MESSAGE_NOT_FOUND'
  FILE_REQUIRED: 'MGMT_FILE_REQUIRED'
  FILE_NOT_FOUND: 'MGMT_FILE_NOT_FOUND'
  FLOW_NAME_REQUIRED: 'MGMT_FLOW_NAME_REQUIRED'
  FLOW_STATUS_REQUIRED: 'MGMT_FLOW_STATUS_REQUIRED'
  FLOW_STATUS_INVALID: 'MGMT_FLOW_STATUS_INVALID'
  FLOW_NOT_FOUND: 'MGMT_FLOW_NOT_FOUND'
  QUESTION_BANK_REPO_NAME_REQUIRED: 'MGMT_QUESTION_BANK_REPO_NAME_REQUIRED'
  QUESTION_BANK_REPO_NOT_FOUND: 'MGMT_QUESTION_BANK_REPO_NOT_FOUND'
  QUESTION_BANK_QUESTION_TITLE_REQUIRED: 'MGMT_QUESTION_BANK_QUESTION_TITLE_REQUIRED'
  QUESTION_BANK_QUESTION_CONTENT_INVALID: 'MGMT_QUESTION_BANK_QUESTION_CONTENT_INVALID'
  QUESTION_BANK_QUESTION_SCORE_INVALID: 'MGMT_QUESTION_BANK_QUESTION_SCORE_INVALID'
  QUESTION_BANK_QUESTION_NOT_FOUND: 'MGMT_QUESTION_BANK_QUESTION_NOT_FOUND'
}>

export type ManagementErrorCode = typeof MANAGEMENT_ERROR_CODES[keyof typeof MANAGEMENT_ERROR_CODES]

export const MANAGEMENT_PAGINATION_DEFAULTS: Readonly<{
  page: 1
  pageSize: 20
  usersPageSize: 20
  auditsPageSize: 20
  messagesPageSize: 50
  filesPageSize: 20
  managementAiExecutionsPageSize: 20
}>

export function normalizeUserListQuery(query?: UserListQueryDTO): {
  page: number
  pageSize: number
  dept_id?: number
  is_active?: boolean
}

export function createUserDto(user?: Partial<UserDTO> | null): UserDTO | null
export function createUserPageResult<T extends Partial<UserDTO>>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): UserPageDTO
export function createUserImportResult(result?: Partial<UserImportResultDTO> | null): UserImportResultDTO

export function createDeptDto(dept?: Partial<DeptDTO> | null): DeptDTO | null
export function createRoleDto(role?: Partial<RoleDTO> | null): RoleDTO | null
export function createPositionDto(position?: Partial<PositionDTO> | null): PositionDTO | null
export function createFlowDto(flow?: Partial<FlowDTO> | null): FlowDTO | null
export function createQuestionBankRepoDto(repo?: Partial<QuestionBankRepoDTO> | null): QuestionBankRepoDTO | null
export function createQuestionBankQuestionDto(question?: Partial<QuestionBankQuestionDTO> | null): QuestionBankQuestionDTO | null

export function normalizeFolderParentId(parentId?: number | string | null): number | null | undefined
export function normalizeFolderListQuery(query?: FolderListQueryDTO): {
  hasParent: boolean
  parentId?: number | null
}
export function createFolderDto(folder?: Partial<FolderDTO> | null): FolderDTO | null

export function normalizeMessageListQuery(query?: MessageListQueryDTO): {
  page: number
  pageSize: number
  unread?: boolean
  types?: string[]
}
export function createMessageDto(message?: Partial<MessageDTO> | null): MessageDTO | null
export function createMessagePageResult<T extends Partial<MessageDTO>>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): MessagePageDTO

export function normalizeFileListQuery(query?: FileListQueryDTO): {
  page: number
  pageSize: number
  uploader_id?: number
  survey_id?: number
}
export function createFileDto(file?: Partial<FileDTO> | null): FileDTO | null
export function createFilePageResult<T extends Partial<FileDTO>>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): FilePageDTO

export function normalizeAuditListQuery(query?: AuditListQueryDTO): {
  page: number
  pageSize: number
  username?: string
  action?: string
  targetType?: string
}
export function createAuditLogDto(audit?: Partial<AuditLogDTO> | null): AuditLogDTO | null
export function createAuditPageResult<T extends Partial<AuditLogDTO>>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): AuditPageDTO
export function normalizeManagementAiExecutionListQuery(query?: ManagementAiExecutionListQueryDTO): {
  page: number
  pageSize: number
  action?: string
  status?: string
  actor_id?: number
  created_from?: string
  created_to?: string
}
export function createManagementAiExecutionDto(execution?: Partial<ManagementAiExecutionDTO> | null): ManagementAiExecutionDTO | null
export function createManagementAiExecutionPageResult<T extends Partial<ManagementAiExecutionDTO>>(input?: {
  list?: T[] | readonly T[] | null
  total?: number | string | null
  page?: number | string | null
  pageSize?: number | string | null
}): ManagementAiExecutionPageDTO

export interface ManagementActionEnvelopeDTO {
  kind?: 'management.action'
  version?: string
  action: string
  dryRun?: boolean
  idempotencyKey?: string
  target?: Record<string, unknown>
  input?: Record<string, unknown>
  changes?: Record<string, unknown>
  reason?: string
  meta?: Record<string, unknown>
}

export interface ManagementActionDefinitionDTO {
  action: string
  label: string
  payloadField?: 'input' | 'changes' | null
  targetKeys: string[]
  summaryTemplate?: string
  example: ManagementActionEnvelopeDTO
}

export interface ManagementActionProtocolDTO {
  kind: 'management.action.protocol'
  version: string
  adminOnly: boolean
  boundaries: {
    auth: 'admin-active-session'
    audit: 'service-audit-plus-ai-execution-ledger'
    idempotency: 'required-on-execute'
    rollback: 'single-action-single-service-transaction'
  }
  notes: string[]
  envelope: ManagementActionEnvelopeDTO
  actions: ManagementActionDefinitionDTO[]
}

export const MANAGEMENT_ACTION_PROTOCOL_VERSION: '2026-03-31'
export const MANAGEMENT_ACTION_KIND: 'management.action'
export const MANAGEMENT_ACTION_PROTOCOL_KIND: 'management.action.protocol'
export const MANAGEMENT_ACTION_BOUNDARIES: Readonly<{
  auth: 'admin-active-session'
  audit: 'service-audit-plus-ai-execution-ledger'
  idempotency: 'required-on-execute'
  rollback: 'single-action-single-service-transaction'
}>

export function listManagementActionDefinitions(): ManagementActionDefinitionDTO[]
export function createManagementActionProtocol(): ManagementActionProtocolDTO
