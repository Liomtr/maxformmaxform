import http from './http'
import type { ApiResponse } from '../types/api'
import type { DeptDTO, DeptFormDTO } from '../../../shared/management.contract.js'

export type { DeptDTO, DeptFormDTO }

export async function listDepts(): Promise<DeptDTO[]> {
  const { data } = await http.get<ApiResponse<DeptDTO[]>>('/depts')
  return data.data!
}

export async function getDeptTree(): Promise<DeptDTO[]> {
  const { data } = await http.get<ApiResponse<DeptDTO[]>>('/depts/tree')
  return data.data!
}

export async function createDept(payload: DeptFormDTO): Promise<DeptDTO> {
  const { data } = await http.post<ApiResponse<DeptDTO>>('/depts', payload)
  return data.data!
}

export async function updateDept(id: number, payload: Partial<DeptFormDTO>): Promise<DeptDTO> {
  const { data } = await http.put<ApiResponse<DeptDTO>>(`/depts/${id}`, payload)
  return data.data!
}

export async function deleteDept(id: number): Promise<void> {
  await http.delete(`/depts/${id}`)
}
