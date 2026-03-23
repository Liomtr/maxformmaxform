import http from './http'
import type { ApiResponse } from '../types/api'

export interface MessageDTO {
  id?: number
  title: string
  content?: string
  read?: boolean
  createdAt?: string
  type?: string
  level?: string
  entityId?: number | null
}

export async function listMessages(): Promise<MessageDTO[]> {
  const { data } = await http.get<ApiResponse<MessageDTO[]>>('/messages')
  return data.data || []
}

export async function markMessageRead(id: number): Promise<void> {
  await http.post(`/messages/${id}/read`)
}
