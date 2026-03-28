import http from './http'
import type { ApiResponse } from '../types/api'
import type { FolderDTO, FolderFormDTO } from '../../../shared/management.contract.js'

export type { FolderDTO, FolderFormDTO }

export async function listFolders(parentId?: number | null): Promise<FolderDTO[]> {
  const params = parentId === undefined
    ? undefined
    : { parentId: parentId === null ? 'null' : parentId }
  const { data } = await http.get<ApiResponse<FolderDTO[]>>('/folders', { params })
  return data.data || []
}

export async function listAllFolders(): Promise<FolderDTO[]> {
  const { data } = await http.get<ApiResponse<FolderDTO[]>>('/folders/all')
  return data.data || []
}

export async function createFolder(payload: FolderFormDTO): Promise<FolderDTO> {
  const { data } = await http.post<ApiResponse<FolderDTO>>('/folders', payload)
  return data.data!
}

export async function renameFolder(id: number, name: string): Promise<FolderDTO> {
  const { data } = await http.put<ApiResponse<FolderDTO>>(`/folders/${id}`, { name })
  return data.data!
}

export async function deleteFolder(id: number): Promise<void> {
  await http.delete(`/folders/${id}`)
}

export async function moveSurveyToFolder(surveyId: number | string, folderId: number | null): Promise<void> {
  await http.put(`/surveys/${surveyId}/folder`, { folder_id: folderId })
}
