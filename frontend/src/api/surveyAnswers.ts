import http from './http'
import type { ApiResponse, PaginatedData } from '../types/api'
import type {
  AnswerBatchDeleteResultDTO,
  AnswerCountDTO,
  AnswerDTO,
  AnswerPageDTO
} from '../../../shared/answer.contract.js'

export async function listAnswers(params: { survey_id?: string | number; page?: number; pageSize?: number; startTime?: string; endTime?: string }): Promise<PaginatedData<AnswerDTO>> {
  const { data } = await http.get<ApiResponse<AnswerPageDTO>>('/answers', { params })
  return data.data!
}

export async function getAnswerCount(survey_id: string | number): Promise<number> {
  const { data } = await http.get<ApiResponse<AnswerCountDTO>>('/answers/count', { params: { survey_id } })
  return data.data!.count
}

export async function getAnswer(id: string | number): Promise<AnswerDTO> {
  const { data } = await http.get<ApiResponse<AnswerDTO>>(`/answers/${id}`)
  return data.data!
}

export async function deleteAnswers(ids: number[]): Promise<AnswerBatchDeleteResultDTO> {
  const { data } = await http.delete<ApiResponse<AnswerBatchDeleteResultDTO>>('/answers/batch', { data: { ids } })
  return data.data!
}

export async function downloadSurveyExcel(survey_id: string | number): Promise<Blob> {
  const res = await http.post('/answers/download/survey', { survey_id }, { responseType: 'blob' })
  return res.data as Blob
}

export async function downloadSurveyAttachmentsZip(survey_id: string | number): Promise<Blob> {
  const res = await http.post('/answers/download/attachments', { survey_id }, { responseType: 'blob' })
  return res.data as Blob
}
