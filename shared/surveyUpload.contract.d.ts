export interface UploadedSurveyFileDTO {
  id: number
  name: string
  url: string
  size: number
  type: string
  surveyId: number
  uploadToken: string
}

export interface SurveySubmitResultDTO {
  id: number
}

export const SURVEY_UPLOAD_ERROR_CODES: Readonly<{
  UPLOAD_QUESTION_NOT_FOUND: 'UPLOAD_QUESTION_NOT_FOUND'
  UPLOAD_SESSION_REQUIRED: 'UPLOAD_SESSION_REQUIRED'
  UPLOAD_NOT_ENABLED: 'UPLOAD_NOT_ENABLED'
  UPLOAD_VALIDATION: 'UPLOAD_VALIDATION'
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION'
  NO_FILE: 'NO_FILE'
  VALIDATION: 'VALIDATION'
}>

export type SurveyUploadErrorCode = typeof SURVEY_UPLOAD_ERROR_CODES[keyof typeof SURVEY_UPLOAD_ERROR_CODES]

export function createSurveyUploadDto(file: {
  id?: number | string | null
  name?: string | null
  url?: string | null
  size?: number | string | null
  type?: string | null
  survey_id?: number | string | null
  public_token?: string | null
  uploadToken?: string | null
}, surveyId?: number | string | null): UploadedSurveyFileDTO
export function createSurveySubmissionDto(answer?: { id?: number | string | null }): SurveySubmitResultDTO
