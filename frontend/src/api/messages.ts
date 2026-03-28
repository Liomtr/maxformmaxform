import http from './http'
import type { ApiResponse } from '../types/api'
import type { MessageDTO, MessageListQueryDTO } from '../../../shared/management.contract.js'

export type { MessageDTO, MessageListQueryDTO }

export async function listMessages(params?: MessageListQueryDTO): Promise<MessageDTO[]> {
  const { data } = await http.get<ApiResponse<MessageDTO[]>>('/messages', { params })
  return data.data || []
}

export async function markMessageRead(id: number): Promise<void> {
  await http.post(`/messages/${id}/read`)
}
