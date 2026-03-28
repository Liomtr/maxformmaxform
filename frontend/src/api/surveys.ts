import http from './http'
import type { ApiResponse, PaginatedData } from '../types/api'
import type { Survey, SurveyForm } from '../types/survey'
import type {
  SurveyListQueryDTO,
  SurveyQuestionStatDTO,
  SurveyResultFileStatDTO,
  SurveyResultMatrixRowStatDTO,
  SurveyResultOptionStatDTO,
  SurveyResultRegionStatDTO,
  SurveyResultTrendPointDTO,
  SurveyResultsDTO,
  SurveySubmitResultDTO,
  SurveyTrashListQueryDTO,
  SurveyTrashPageDTO,
  UploadedSurveyFileDTO
} from '../../../shared/survey.contract.js'

type TrashListResponse = ApiResponse<SurveyTrashPageDTO | Survey[]> & {
  total?: number
  page?: number
  pageSize?: number
}

function normalizeTrashPage(payload: TrashListResponse): SurveyTrashPageDTO {
  if (Array.isArray(payload.data)) {
    return {
      list: payload.data,
      total: Number(payload.total || payload.data.length || 0),
      page: Number(payload.page || 1),
      pageSize: Number(payload.pageSize || payload.data.length || 100)
    }
  }

  return payload.data || {
    list: [],
    total: 0,
    page: 1,
    pageSize: 100
  }
}

export async function listSurveys(params?: SurveyListQueryDTO): Promise<PaginatedData<Survey>> {
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

export async function submitResponses(
  id: string | number,
  answers: unknown[],
  duration?: number | Record<string, unknown>
): Promise<ApiResponse<SurveySubmitResultDTO>> {
  const payload = typeof duration === 'number' || duration === undefined
    ? { answers, duration }
    : { answers, ...duration }
  const { data } = await http.post<ApiResponse<SurveySubmitResultDTO>>(`/surveys/${id}/responses`, payload)
  return data
}

export type UploadedSurveyFile = UploadedSurveyFileDTO

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

export type SurveyResultOptionStat = SurveyResultOptionStatDTO
export type SurveyResultFileStat = SurveyResultFileStatDTO
export type SurveyResultMatrixRowStat = SurveyResultMatrixRowStatDTO
export type SurveyResultTrendPoint = SurveyResultTrendPointDTO
export type SurveyResultRegionStat = SurveyResultRegionStatDTO
export type SurveyQuestionStat = SurveyQuestionStatDTO
export type SurveyResults = SurveyResultsDTO

export async function getResults(id: string | number): Promise<SurveyResults> {
  const { data } = await http.get<ApiResponse<SurveyResultsDTO>>(`/surveys/${id}/results`)
  return data.data!
}

export async function moveSurvey(_id: string | number, _folderId: number | null): Promise<void> {
  await http.put(`/surveys/${_id}/folder`, { folder_id: _folderId })
}

export async function listSurveyTrashPage(params?: SurveyTrashListQueryDTO): Promise<SurveyTrashPageDTO> {
  const response = await http.get<TrashListResponse>('/surveys/trash', { params })
  return normalizeTrashPage(response.data)
}

export async function listTrash(params?: SurveyTrashListQueryDTO): Promise<Survey[]> {
  const page = await listSurveyTrashPage(params)
  return page.list
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
