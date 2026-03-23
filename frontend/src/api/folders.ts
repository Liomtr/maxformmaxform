import http from './http'
import type { ApiResponse } from '../types/api'

export interface FolderDTO {
  id: number
  name: string
  parentId?: number | null
  surveyCount?: number
}

function mapFolder(folder: Record<string, unknown>): FolderDTO {
  return {
    id: Number(folder.id),
    name: String(folder.name || ''),
    parentId: folder.parentId == null ? null : Number(folder.parentId),
    surveyCount: folder.surveyCount == null ? 0 : Number(folder.surveyCount)
  }
}

export async function listFolders(parentId?: number | null): Promise<FolderDTO[]> {
  const params = parentId === undefined
    ? undefined
    : { parentId: parentId === null ? 'null' : parentId }
  const { data } = await http.get<ApiResponse<Record<string, unknown>[]>>('/folders', { params })
  return (data.data || []).map(mapFolder)
}

export async function listAllFolders(): Promise<FolderDTO[]> {
  const { data } = await http.get<ApiResponse<Record<string, unknown>[]>>('/folders/all')
  return (data.data || []).map(mapFolder)
}

export async function createFolder(payload: { name: string; parentId?: number | null }): Promise<FolderDTO> {
  const { data } = await http.post<ApiResponse<Record<string, unknown>>>('/folders', payload)
  return mapFolder(data.data || {})
}

export async function renameFolder(id: number, name: string): Promise<FolderDTO> {
  const { data } = await http.put<ApiResponse<Record<string, unknown>>>(`/folders/${id}`, { name })
  return mapFolder(data.data || {})
}

export async function deleteFolder(id: number): Promise<void> {
  await http.delete(`/folders/${id}`)
}

export async function moveSurveyToFolder(surveyId: number | string, folderId: number | null): Promise<void> {
  await http.put(`/surveys/${surveyId}/folder`, { folder_id: folderId })
}
