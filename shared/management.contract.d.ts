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

export type UserPageDTO = PaginatedResultDTO<UserDTO>
export type AuditPageDTO = PaginatedResultDTO<AuditLogDTO>

export const MANAGEMENT_ERROR_CODES: Readonly<{
  NOT_FOUND: 'NOT_FOUND'
  FORBIDDEN: 'FORBIDDEN'
  VALIDATION: 'VALIDATION'
  USER_EXISTS: 'USER_EXISTS'
  ROLE_EXISTS: 'ROLE_EXISTS'
  POSITION_EXISTS: 'POSITION_EXISTS'
  DEPT_HAS_CHILDREN: 'DEPT_HAS_CHILDREN'
  FOLDER_HAS_CHILDREN: 'FOLDER_HAS_CHILDREN'
  PARENT_FOLDER_NOT_FOUND: 'PARENT_FOLDER_NOT_FOUND'
}>

export type ManagementErrorCode = typeof MANAGEMENT_ERROR_CODES[keyof typeof MANAGEMENT_ERROR_CODES]

export const MANAGEMENT_PAGINATION_DEFAULTS: Readonly<{
  page: 1
  pageSize: 20
  usersPageSize: 20
  auditsPageSize: 20
  messagesPageSize: 50
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
