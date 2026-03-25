import http from './http'
import type { ApiResponse, PaginatedData } from '../types/api'
import type { Answer } from '../types/answer'

export async function listAnswers(params: { survey_id?: string | number; page?: number; pageSize?: number; startTime?: string; endTime?: string }): Promise<PaginatedData<Answer>> {
  const { data } = await http.get<ApiResponse<PaginatedData<Answer>>>('/answers', { params })
  return data.data!
}

export async function getAnswerCount(survey_id: string | number): Promise<number> {
  const { data } = await http.get<ApiResponse<{ count: number }>>('/answers/count', { params: { survey_id } })
  return data.data!.count
}

export async function getAnswer(id: string | number): Promise<Answer> {
  const { data } = await http.get<ApiResponse<Answer>>(`/answers/${id}`)
  return data.data!
}

export async function deleteAnswers(ids: number[]): Promise<void> {
  await http.delete('/answers/batch', { data: { ids } })
}

export async function downloadSurveyExcel(survey_id: string | number): Promise<Blob> {
  const res = await http.post('/answers/download/survey', { survey_id }, { responseType: 'blob' })
  return res.data as Blob
}

export async function downloadSurveyAttachmentsZip(survey_id: string | number): Promise<Blob> {
  const res = await http.post('/answers/download/attachments', { survey_id }, { responseType: 'blob' })
  return res.data as Blob
}
