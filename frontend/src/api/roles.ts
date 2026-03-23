import http from './http'
import type { ApiResponse } from '../types/api'
import type { Role } from '../types/user'

export type RoleDTO = Role

export async function listRoles(): Promise<Role[]> {
  const { data } = await http.get<ApiResponse<Role[]>>('/roles')
  return data.data!
}

export async function createRole(payload: { name: string; code: string; permissions?: string[]; remark?: string }): Promise<Role> {
  const { data } = await http.post<ApiResponse<Role>>('/roles', payload)
  return data.data!
}

export async function updateRole(id: number, payload: { name?: string; permissions?: string[]; remark?: string }): Promise<Role> {
  const { data } = await http.put<ApiResponse<Role>>(`/roles/${id}`, payload)
  return data.data!
}

export async function deleteRole(id: number): Promise<void> {
  await http.delete(`/roles/${id}`)
}
