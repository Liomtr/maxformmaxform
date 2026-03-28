import http from './http'
import type { ApiResponse } from '../types/api'
import type { PositionDTO } from '../../../shared/management.contract.js'

export type { PositionDTO }

export async function listPositions(): Promise<PositionDTO[]> {
  const { data } = await http.get<ApiResponse<PositionDTO[]>>('/positions')
  return data.data || []
}

export async function createPosition(payload: Partial<PositionDTO>): Promise<PositionDTO> {
  const { data } = await http.post<ApiResponse<PositionDTO>>('/positions', payload)
  return data.data!
}

export async function updatePosition(id: number | string, payload: Partial<PositionDTO>): Promise<PositionDTO> {
  const { data } = await http.put<ApiResponse<PositionDTO>>(`/positions/${id}`, payload)
  return data.data!
}

export async function deletePosition(id: number | string): Promise<void> {
  await http.delete(`/positions/${id}`)
}
