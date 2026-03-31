import folderRepository from '../repositories/folderRepository.js'
import surveyAggregateRepository from '../repositories/surveyAggregateRepository.js'
import surveyRepository from '../repositories/surveyRepository.js'
import surveyResultsSnapshotRepository from '../repositories/surveyResultsSnapshotRepository.js'
import { normalizeSurveyQuestions, validateSurveyQuestions } from '../utils/questionSchema.js'
import { removeUploadedFile } from '../utils/uploadStorage.js'
import { createAuditMessage, recordAudit } from './activity.js'
import { getSurveyForManagement, resolveRequestedSurveyCreatorId } from './surveyAccessService.js'
import {
  normalizeSurveyFolderId,
  sanitizeWritableSurveySettings,
  sanitizeWritableSurveyStyle,
  SURVEY_ERROR_CODES,
  SURVEY_STATUS
} from '../../../shared/survey.contract.js'

export { uploadSurveyFile, submitSurveyResponse } from './surveyUploadService.js'

function createHttpError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function cleanupStoredFiles(files = []) {
  if (!Array.isArray(files) || files.length === 0) return

  for (const file of files) {
    try {
      removeUploadedFile(file?.url || file)
    } catch (error) {
      console.error('Failed to remove uploaded file:', error.message)
    }
  }
}

function getSurveyEndTimeMeta(survey) {
  const raw = survey?.settings?.endTime
  if (!raw) return { value: null, invalid: false }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return { value: null, invalid: true }
  }

  return { value: date, invalid: false }
}

function getSurveyEndTime(survey) {
  return getSurveyEndTimeMeta(survey).value
}

export function validateSurveyDraft({ title, description, questions, settings, style }) {
  const normalizedQuestions = normalizeSurveyQuestions(questions || [])
  const normalizedSettings = sanitizeWritableSurveySettings(settings)
  const normalizedStyle = sanitizeWritableSurveyStyle(style)
  const normalized = {
    title: String(title || ''),
    description: description === undefined ? undefined : (description == null ? '' : String(description)),
    questions: normalizedQuestions,
    settings: normalizedSettings,
    style: normalizedStyle
  }

  if (!normalized.title.trim()) {
    return {
      valid: false,
      error: 'Title is required',
      normalized
    }
  }

  const { error } = validateSurveyQuestions(normalizedQuestions)
  if (error) {
    return {
      valid: false,
      error,
      normalized
    }
  }

  const endTimeMeta = getSurveyEndTimeMeta({ settings: normalizedSettings })
  if (endTimeMeta.invalid) {
    return {
      valid: false,
      error: 'End time is invalid',
      normalized
    }
  }

  const endTime = endTimeMeta.value
  if (endTime && endTime.getTime() <= Date.now()) {
    return {
      valid: false,
      error: 'End time must be later than now',
      normalized
    }
  }

  return {
    valid: true,
    error: null,
    normalized
  }
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeSurveyDryRunPayload(body = {}) {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'Survey JSON is invalid')
    }
  }

  if (!isPlainRecord(body)) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'Survey dry-run payload must be an object')
  }

  if (typeof body.json === 'string') {
    const raw = body.json.trim()
    if (!raw) {
      throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'Survey JSON is required')
    }

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'Survey JSON is invalid')
    }

    if (!isPlainRecord(parsed)) {
      throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'Survey JSON root must be an object')
    }

    return parsed
  }

  if (body.survey !== undefined) {
    if (!isPlainRecord(body.survey)) {
      throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'survey must be an object')
    }

    return body.survey
  }

  return body
}

function assertValidSurveyDraft(input) {
  const result = validateSurveyDraft(input)
  if (!result.valid) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, result.error || 'Survey structure is invalid')
  }

  return result.normalized
}

export async function createSurvey({ actor, title, description, questions, settings, style }) {
  const normalized = assertValidSurveyDraft({
    title,
    description,
    questions,
    settings,
    style
  })

  const survey = await surveyRepository.create({
    title: normalized.title,
    description: normalized.description,
    creator_id: actor.sub,
    questions: normalized.questions,
    settings: normalized.settings,
    style: normalized.style
  })

  await recordAudit({
    actor,
    action: 'survey.create',
    targetType: 'survey',
    targetId: survey.id,
    detail: `Created survey ${survey.title}`
  })

  return survey
}

export async function updateSurvey({ survey, title, description, questions, settings, style }) {
  const normalized = assertValidSurveyDraft({
    title: title === undefined ? survey?.title : title,
    description: description === undefined ? survey?.description : description,
    questions: questions === undefined ? survey?.questions : questions,
    settings: settings === undefined ? survey?.settings : settings,
    style: style === undefined ? survey?.style : style
  })

  const updated = await surveyRepository.update(survey.id, {
    title: title === undefined ? undefined : normalized.title,
    description: description === undefined ? undefined : normalized.description,
    questions: questions === undefined ? undefined : normalized.questions,
    settings: settings === undefined ? undefined : normalized.settings,
    style: style === undefined ? undefined : normalized.style
  })

  await surveyResultsSnapshotRepository.deleteBySurveyId(survey.id)
  return updated
}

export async function updateManagedSurvey({ actor, identifier, title, description, questions, settings, style }) {
  const survey = await getSurveyForManagement({ actor, identifier })
  return updateSurvey({ survey, title, description, questions, settings, style })
}

export async function moveSurveyToTrash({ survey, actor }) {
  const deleted = await surveyRepository.softDelete(survey.id, actor.sub)
  await surveyResultsSnapshotRepository.deleteBySurveyId(survey.id)
  await recordAudit({
    actor,
    action: 'survey.trash.move',
    targetType: 'survey',
    targetId: survey.id,
    detail: `Moved survey ${survey.title} to trash`
  })
  await createAuditMessage({
    recipientId: actor.sub,
    createdBy: actor.sub,
    title: 'Survey moved to trash',
    content: `Survey "${survey.title}" was moved to trash.`,
    entityType: 'survey',
    entityId: survey.id
  })

  return deleted
}

export async function moveManagedSurveyToTrash({ actor, identifier }) {
  const survey = await getSurveyForManagement({ actor, identifier })
  return moveSurveyToTrash({ survey, actor })
}

export async function restoreSurvey({ survey, actor }) {
  if (!survey.deletedAt) {
    throw createHttpError(400, SURVEY_ERROR_CODES.NOT_IN_TRASH, 'Survey is not in trash')
  }

  const restored = await surveyRepository.restore(survey.id)
  await surveyResultsSnapshotRepository.deleteBySurveyId(survey.id)
  await recordAudit({
    actor,
    action: 'survey.restore',
    targetType: 'survey',
    targetId: survey.id,
    detail: `Restored survey ${survey.title}`
  })

  return restored
}

export async function restoreManagedSurvey({ actor, identifier }) {
  const survey = await getSurveyForManagement({ actor, identifier, includeDeleted: true })
  return restoreSurvey({ survey, actor })
}

export async function clearSurveyTrash({ actor, creatorId }) {
  const { deleted, filesToCleanup } = await surveyAggregateRepository.clearTrash({
    creatorId,
    onTransaction: async ({ trx, deleted }) => {
      await recordAudit({
        actor,
        action: 'survey.trash.clear',
        targetType: 'survey',
        targetId: null,
        detail: `Cleared trash, deleted ${deleted} surveys`
      }, { db: trx })
    }
  })

  cleanupStoredFiles(filesToCleanup)
  return { deleted }
}

export async function clearManagedSurveyTrash({ actor, query = {} }) {
  return clearSurveyTrash({
    actor,
    creatorId: await resolveRequestedSurveyCreatorId({ actor, query })
  })
}

export async function publishSurvey({ survey, actor }) {
  if (!survey.title || !survey.title.trim()) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'Title is required')
  }

  const { normalizedQuestions, error } = validateSurveyQuestions(survey.questions)
  if (error) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, error)
  }

  const endTimeMeta = getSurveyEndTimeMeta(survey)
  if (endTimeMeta.invalid) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'End time is invalid')
  }

  const endTime = endTimeMeta.value
  if (endTime && endTime.getTime() <= Date.now()) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'End time must be later than now')
  }

  const updated = await surveyRepository.update(survey.id, { status: SURVEY_STATUS.PUBLISHED, questions: normalizedQuestions })
  await surveyResultsSnapshotRepository.deleteBySurveyId(survey.id)
  await recordAudit({ actor, action: 'survey.publish', targetType: 'survey', targetId: survey.id, detail: `Published survey ${survey.title}` })
  await createAuditMessage({
    recipientId: actor.sub,
    createdBy: actor.sub,
    title: 'Survey published',
    content: `Survey "${survey.title}" is now live.`,
    entityType: 'survey',
    entityId: survey.id
  })
  return updated
}

export async function publishManagedSurvey({ actor, identifier }) {
  const survey = await getSurveyForManagement({ actor, identifier })
  return publishSurvey({ survey, actor })
}

export async function closeSurvey({ survey, actor }) {
  const updated = await surveyRepository.update(survey.id, { status: SURVEY_STATUS.CLOSED })
  await surveyResultsSnapshotRepository.deleteBySurveyId(survey.id)
  await recordAudit({
    actor,
    action: 'survey.close',
    targetType: 'survey',
    targetId: survey.id,
    detail: `Closed survey ${survey.title}`
  })
  await createAuditMessage({
    recipientId: actor.sub,
    createdBy: actor.sub,
    title: 'Survey closed',
    content: `Survey "${survey.title}" was closed.`,
    entityType: 'survey',
    entityId: survey.id
  })

  return updated
}

export async function closeManagedSurvey({ actor, identifier }) {
  const survey = await getSurveyForManagement({ actor, identifier })
  return closeSurvey({ survey, actor })
}

export async function forceDeleteSurvey({ survey, actor }) {
  if (!survey.deletedAt) {
    throw createHttpError(400, SURVEY_ERROR_CODES.NOT_IN_TRASH, 'Survey is not in trash')
  }

  const { filesToCleanup } = await surveyAggregateRepository.forceDeleteSurvey({
    surveyId: survey.id,
    onTransaction: async ({ trx }) => {
      await recordAudit({
        actor,
        action: 'survey.force_delete',
        targetType: 'survey',
        targetId: survey.id,
        detail: `Force deleted survey ${survey.title}`
      }, { db: trx })
    }
  })

  cleanupStoredFiles(filesToCleanup)
}

export async function forceDeleteManagedSurvey({ actor, identifier }) {
  const survey = await getSurveyForManagement({ actor, identifier, includeDeleted: true })
  return forceDeleteSurvey({ survey, actor })
}

export async function moveSurveyToFolder({ survey, actor, folderId }) {
  if (folderId !== null) {
    const folder = await folderRepository.findById(folderId, actor.sub)
    if (!folder) {
      throw createHttpError(404, SURVEY_ERROR_CODES.FOLDER_NOT_FOUND, 'Folder not found')
    }
  }

  const updated = await surveyRepository.update(survey.id, { folder_id: folderId })
  await recordAudit({
    actor,
    action: 'survey.move_folder',
    targetType: 'survey',
    targetId: survey.id,
    detail: folderId === null
      ? `Moved survey ${survey.title} to root`
      : `Moved survey ${survey.title} to folder ${folderId}`
  })

  return updated
}

export async function moveManagedSurveyToFolder({ actor, identifier, folderId }) {
  const survey = await getSurveyForManagement({ actor, identifier })
  return moveSurveyToFolder({
    survey,
    actor,
    folderId: normalizeSurveyFolderId(folderId) ?? null
  })
}
