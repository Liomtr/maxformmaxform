import http from './http'
import type { ApiResponse } from '../types/api'
import type { AuditListQueryDTO, AuditLogDTO, AuditPageDTO } from '../../../shared/management.contract.js'

export type { AuditListQueryDTO, AuditLogDTO, AuditPageDTO }

export async function fetchAudits(params?: AuditListQueryDTO): Promise<AuditPageDTO> {
  const { data } = await http.get<ApiResponse<AuditPageDTO>>('/audits', { params })
  return data.data || { list: [], total: 0, page: 1, pageSize: 20 }
}
