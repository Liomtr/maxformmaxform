import http from './http'
import type { ApiResponse } from '../types/api'
import type { Dept } from '../types/user'

export type DeptDTO = Dept

export async function listDepts(): Promise<Dept[]> {
  const { data } = await http.get<ApiResponse<Dept[]>>('/depts')
  return data.data!
}

export async function getDeptTree(): Promise<Dept[]> {
  const { data } = await http.get<ApiResponse<Dept[]>>('/depts/tree')
  return data.data!
}

export async function createDept(payload: { name: string; parent_id?: number; sort_order?: number }): Promise<Dept> {
  const { data } = await http.post<ApiResponse<Dept>>('/depts', payload)
  return data.data!
}

export async function updateDept(id: number, payload: { name?: string; parent_id?: number; sort_order?: number }): Promise<Dept> {
  const { data } = await http.put<ApiResponse<Dept>>(`/depts/${id}`, payload)
  return data.data!
}

export async function deleteDept(id: number): Promise<void> {
  await http.delete(`/depts/${id}`)
}
