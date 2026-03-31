import http from './http'
import type { ApiResponse } from '../types/api'
import type {
  ManagementActionEnvelopeDTO,
  ManagementAiExecutionListQueryDTO,
  ManagementAiExecutionPageDTO,
  ManagementActionProtocolDTO
} from '../../../shared/management.contract.js'

export interface ManagementActionRunResultDTO {
  adminOnly: boolean
  dryRun: boolean
  executed: boolean
  replayed?: boolean
  idempotencyKey?: string | null
  executionId?: number | null
  boundaries?: Record<string, unknown>
  summary: string
  normalized: ManagementActionEnvelopeDTO
  result?: unknown
}

export interface ManagementAiExecutionExportResult {
  blob: Blob
  filename: string
}

function resolveDownloadFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) return fallback

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return match?.[1] || fallback
}

export async function getManagementAiProtocol(): Promise<ManagementActionProtocolDTO> {
  const { data } = await http.get<ApiResponse<ManagementActionProtocolDTO>>('/management-ai/protocol')
  return data.data!
}

export async function listManagementAiExecutions(params: ManagementAiExecutionListQueryDTO = {}): Promise<ManagementAiExecutionPageDTO> {
  const { data } = await http.get<ApiResponse<ManagementAiExecutionPageDTO>>('/management-ai/executions', { params })
  return data.data!
}

export async function exportManagementAiExecutions(
  format: 'json' | 'csv',
  params: ManagementAiExecutionListQueryDTO = {}
): Promise<ManagementAiExecutionExportResult> {
  const response = await http.get('/management-ai/executions/export', {
    params: {
      ...params,
      format
    },
    responseType: 'blob'
  })

  return {
    blob: response.data as Blob,
    filename: resolveDownloadFilename(response.headers['content-disposition'], `management-ai-executions.${format}`)
  }
}

export async function runManagementAiAction(payload: ManagementActionEnvelopeDTO): Promise<ManagementActionRunResultDTO> {
  const { data } = await http.post<ApiResponse<ManagementActionRunResultDTO>>('/management-ai/actions', payload)
  return data.data!
}
