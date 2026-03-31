import http from './http'
import type { ApiResponse } from '../types/api'

export interface AiProviderConfigDTO {
  providerId: string
  providerLabel: string
  apiKey: string
  apiKeyMasked?: string
  hasApiKey?: boolean
  apiBase: string
  endpoint: string
  model: string
  note: string
}

export interface SystemConfigDTO {
  provider: AiProviderConfigDTO
  updatedAt: string | null
  updatedBy: number | null
}

export async function getSystemConfig(): Promise<SystemConfigDTO> {
  const { data } = await http.get<ApiResponse<SystemConfigDTO>>('/system-config')
  return data.data!
}

export async function updateSystemConfig(payload: { provider: Partial<AiProviderConfigDTO> }): Promise<SystemConfigDTO> {
  const { data } = await http.put<ApiResponse<SystemConfigDTO>>('/system-config', payload)
  return data.data!
}

export interface SystemConfigConnectivityResultDTO {
  ok: boolean
  status: number | null
  message: string
  requestUrl: string | null
}

export async function testSystemConfigConnection(payload: { provider: Partial<AiProviderConfigDTO> }): Promise<SystemConfigConnectivityResultDTO> {
  const { data } = await http.post<ApiResponse<SystemConfigConnectivityResultDTO>>('/system-config/test', payload)
  return data.data!
}
