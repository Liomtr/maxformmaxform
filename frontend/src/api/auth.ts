import http from './http'
import type { ApiResponse } from '../types/api'
import type { AuthSessionDTO, AuthTokenDTO } from '../../../shared/auth.contract.js'

export async function loginApi(username: string, password: string): Promise<AuthTokenDTO> {
  const { data } = await http.post<ApiResponse<AuthTokenDTO>>('/auth/login', { username, password })
  return data.data!
}

export async function registerApi(username: string, password: string, email?: string): Promise<AuthTokenDTO> {
  const { data } = await http.post<ApiResponse<AuthTokenDTO>>('/auth/register', { username, password, email })
  return data.data!
}

export async function meApi(): Promise<AuthSessionDTO> {
  const { data } = await http.get<ApiResponse<AuthSessionDTO>>('/auth/me')
  return data.data!
}
