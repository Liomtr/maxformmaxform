import http from './http'
import type { ApiResponse } from '../types/api'
import type { RoleDTO, RoleFormDTO } from '../../../shared/management.contract.js'

export type { RoleDTO, RoleFormDTO }

export async function listRoles(): Promise<RoleDTO[]> {
  const { data } = await http.get<ApiResponse<RoleDTO[]>>('/roles')
  return data.data!
}

export async function createRole(payload: RoleFormDTO): Promise<RoleDTO> {
  const { data } = await http.post<ApiResponse<RoleDTO>>('/roles', payload)
  return data.data!
}

export async function updateRole(id: number, payload: Partial<RoleFormDTO>): Promise<RoleDTO> {
  const { data } = await http.put<ApiResponse<RoleDTO>>(`/roles/${id}`, payload)
  return data.data!
}

export async function deleteRole(id: number): Promise<void> {
  await http.delete(`/roles/${id}`)
}
