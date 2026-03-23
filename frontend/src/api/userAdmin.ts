import http from './http'
import type { ApiResponse, PaginatedData } from '../types/api'
import type { User } from '../types/user'

export interface ImportUsersResult {
  created: number
  skipped: number
  errors: Array<{ index?: number; row?: number; username?: string; reason: string }>
}

export async function fetchUsers(params?: Record<string, unknown>): Promise<PaginatedData<User>> {
  const { data } = await http.get<ApiResponse<PaginatedData<User>>>('/users', { params })
  return data.data!
}

export async function getUser(id: number | string): Promise<User> {
  const { data } = await http.get<ApiResponse<User>>(`/users/${id}`)
  return data.data!
}

export async function createUser(payload: { username: string; password: string; email?: string; role_id?: number; dept_id?: number }): Promise<User> {
  const { data } = await http.post<ApiResponse<User>>('/users', payload)
  return data.data!
}

export async function updateUser(id: number | string, payload: Record<string, unknown>): Promise<User> {
  const { data } = await http.put<ApiResponse<User>>(`/users/${id}`, payload)
  return data.data!
}

export async function updatePassword(id: number | string, password: string): Promise<void> {
  await http.put(`/users/${id}/password`, { password })
}

export async function deleteUser(id: number | string): Promise<void> {
  await http.delete(`/users/${id}`)
}

export async function enableUser(id: number | string): Promise<void> {
  await http.put(`/users/${id}`, { is_active: true })
}

export async function disableUser(id: number | string): Promise<void> {
  await http.put(`/users/${id}`, { is_active: false })
}

export async function unlockUser(id: number | string): Promise<void> {
  await http.put(`/users/${id}`, { is_active: true })
}

export async function bulkUsers(action: 'enable' | 'disable' | 'delete', ids: (number | string)[]): Promise<void> {
  if (action === 'delete') {
    await Promise.all(ids.map(id => deleteUser(id)))
  } else {
    const is_active = action === 'enable'
    await Promise.all(ids.map(id => http.put(`/users/${id}`, { is_active })))
  }
}

export async function assignDept(id: number | string, dept_id: number | null): Promise<void> {
  await http.put(`/users/${id}`, { dept_id })
}

export async function assignPosition(_id: number | string, _positionId: number | null): Promise<void> {
  // Position 已在重构中移除，此为兼容占位
}

export async function exportUsersCsv(params?: Record<string, unknown>): Promise<Blob> {
  const res = await http.get('/users', { params: { ...params, format: 'csv' }, responseType: 'blob' })
  return res.data as Blob
}

export async function exportUsersXlsx(params?: Record<string, unknown>): Promise<Blob> {
  const res = await http.get('/users', { params: { ...params, format: 'xlsx' }, responseType: 'blob' })
  return res.data as Blob
}

export async function importUsers(list: Record<string, unknown>[]): Promise<ImportUsersResult> {
  const { data } = await http.post<ApiResponse<ImportUsersResult>>('/users/import', { users: list })
  return data.data || { created: 0, skipped: list.length, errors: [] }
}

export async function importUsersXlsx(file: File): Promise<ImportUsersResult> {
  const form = new FormData()
  form.append('file', file)
  await http.post('/users/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return { created: 0, skipped: 0, errors: [] }
}
