import type { RoleDTO, UserDTO } from './management.contract.js'

export interface AuthCredentialsDTO {
  username: string
  email?: string
  password: string
}

export interface AuthTokenDTO {
  token: string
  user: UserDTO
}

export interface AuthSessionDTO {
  user: UserDTO
  role: RoleDTO | null
}

export const AUTH_ERROR_CODES: Readonly<{
  NO_TOKEN: 'NO_TOKEN'
  TOKEN_EXPIRED: 'TOKEN_EXPIRED'
  INVALID_TOKEN: 'INVALID_TOKEN'
  INVALID_PAYLOAD: 'INVALID_PAYLOAD'
  MISSING_FIELDS: 'MISSING_FIELDS'
  USER_EXISTS: 'USER_EXISTS'
  EMAIL_EXISTS: 'EMAIL_EXISTS'
  AUTH_FAILED: 'AUTH_FAILED'
  USER_DISABLED: 'USER_DISABLED'
  USER_NOT_FOUND: 'USER_NOT_FOUND'
}>

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES]

export function normalizeAuthCredentials(body?: Partial<AuthCredentialsDTO> | null): {
  username: string
  email: string
  password: string
}

export function createAuthTokenDto(payload?: Partial<AuthTokenDTO> | null): AuthTokenDTO
export function createAuthSessionDto(payload?: Partial<AuthSessionDTO> | null): AuthSessionDTO
