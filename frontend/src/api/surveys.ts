import http from './http'
import type { ApiResponse, PaginatedData } from '../types/api'
import type { Survey, SurveyForm } from '../types/survey'

export async function listSurveys(params?: { page?: number; pageSize?: number; status?: string; creator_id?: number | string; createdBy?: string; folder_id?: number | null }): Promise<PaginatedData<Survey>> {
  const { data } = await http.get<ApiResponse<PaginatedData<Survey>>>('/surveys', { params })
  return data.data!
}

export async function getSurvey(id: string | number): Promise<Survey> {
  const { data } = await http.get<ApiResponse<Survey>>(`/surveys/${id}`)
  return data.data!
}

export async function getSurveyByShareCode(code: string): Promise<Survey> {
  const { data } = await http.get<ApiResponse<Survey>>(`/surveys/share/${code}`)
  return data.data!
}

export async function createSurvey(payload: SurveyForm): Promise<Survey> {
  const { data } = await http.post<ApiResponse<Survey>>('/surveys', payload)
  return data.data!
}

export async function updateSurvey(id: string | number, payload: Partial<SurveyForm>): Promise<Survey> {
  const { data } = await http.put<ApiResponse<Survey>>(`/surveys/${id}`, payload)
  return data.data!
}

export async function deleteSurvey(id: string | number): Promise<void> {
  await http.delete(`/surveys/${id}`)
}

export async function publishSurvey(id: string | number): Promise<Survey> {
  const { data } = await http.post<ApiResponse<Survey>>(`/surveys/${id}/publish`)
  return data.data!
}

export async function closeSurvey(id: string | number): Promise<Survey> {
  const { data } = await http.post<ApiResponse<Survey>>(`/surveys/${id}/close`)
  return data.data!
}

export async function submitResponses(id: string | number, answers: unknown[], duration?: number | Record<string, unknown>) {
  const payload = typeof duration === 'number' || duration === undefined
    ? { answers, duration }
    : { answers, ...duration }
  const { data } = await http.post<ApiResponse<{ id: number }>>(`/surveys/${id}/responses`, payload)
  return data
}

export interface UploadedSurveyFile {
  id: number
  name: string
  url: string
  size: number
  type: string
  surveyId: number
  uploadToken: string
}

export async function uploadSurveyFile(
  id: string | number,
  file: File,
  options?: { questionId?: number; submissionToken?: string }
): Promise<UploadedSurveyFile> {
  const formData = new FormData()
  formData.append('file', file)
  if (options?.questionId !== undefined) formData.append('questionId', String(options.questionId))
  if (options?.submissionToken) formData.append('submissionToken', options.submissionToken)
  const { data } = await http.post<ApiResponse<UploadedSurveyFile>>(`/surveys/${id}/uploads`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data.data!
}

export interface SurveyResultOptionStat {
  label: string
  value?: string
  count: number
  percentage: number
  avgRank?: number | null
  avgShare?: number | null
  totalShare?: number | null
}

export interface SurveyResultFileStat {
  id: number
  name: string
  url: string
  type: string
  size: number
}

export interface SurveyResultMatrixRowStat {
  label: string
  value: string
  totalAnswers: number
  options: SurveyResultOptionStat[]
}

export interface SurveyResultTrendPoint {
  date: string
  label: string
  count: number
}

export interface SurveyResultRegionStat {
  hasLocationData: boolean
  scope?: string
  missingCount: number
  items: Array<{ label: string; value: string }>
  emptyReason: string | null
}

export interface SurveyQuestionStat {
  questionId: number
  questionTitle: string
  type: string
  totalAnswers: number
  options?: SurveyResultOptionStat[]
  sampleAnswers?: string[]
  avgValue?: number | null
  minValue?: number | null
  maxValue?: number | null
  totalFiles?: number
  sampleFiles?: SurveyResultFileStat[]
  earliestDate?: string | null
  latestDate?: string | null
  avgScore?: number | null
  distribution?: Record<string, number>
  matrixMode?: string
  rows?: SurveyResultMatrixRowStat[]
}

export interface SurveyResults {
  totalSubmissions: number
  lastSubmitAt: string | null
  total: number
  today: number
  avgScore?: number
  completed: number
  incomplete: number
  completionRate: number
  avgDuration: string | null
  avgTime: number | null
  submissionTrend?: SurveyResultTrendPoint[]
  regionStats?: SurveyResultRegionStat
  systemStats?: Record<string, Array<{ label: string; value: string }>>
  questionStats: SurveyQuestionStat[]
}

export async function getResults(id: string | number): Promise<SurveyResults> {
  const { data } = await http.get<ApiResponse<SurveyResults>>(`/surveys/${id}/results`)
  return data.data!
}

export async function moveSurvey(_id: string | number, _folderId: number | null): Promise<void> {
  await http.put(`/surveys/${_id}/folder`, { folder_id: _folderId })
}

export async function listTrash(): Promise<Survey[]> {
  const { data } = await http.get<ApiResponse<Survey[]>>('/surveys/trash')
  return data.data || []
}

export async function restoreSurvey(_id: string | number): Promise<Survey | null> {
  const { data } = await http.post<ApiResponse<Survey>>(`/surveys/${_id}/restore`)
  return data.data || null
}

export async function forceDeleteSurvey(_id: string | number): Promise<void> {
  await http.delete(`/surveys/${_id}/force`)
}

export async function clearTrash(): Promise<{ success: boolean; deleted: number }> {
  const { data } = await http.delete<ApiResponse<{ deleted: number }>>('/surveys/trash')
  return { success: !!data.success, deleted: data.data?.deleted || 0 }
}

export type { Survey as SurveyDTO } from '../types/survey'
