import Survey from '../models/Survey.js'
import Folder from '../models/Folder.js'
import surveyAggregateRepository from '../repositories/surveyAggregateRepository.js'
import { normalizeSurveyQuestions, validateSurveyQuestions } from '../utils/questionSchema.js'
import { removeUploadedFile } from '../utils/uploadStorage.js'
import { createAuditMessage, recordAudit } from './activity.js'
import { getSurveyForManagement, resolveRequestedSurveyCreatorId } from './surveyQueryService.js'
import { invalidateSurveyResultsSnapshot } from './surveyResultsService.js'
import { normalizeSurveyFolderId, SURVEY_ERROR_CODES, SURVEY_STATUS } from '../../../shared/survey.contract.js'

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

function getSurveyEndTime(survey) {
  const raw = survey?.settings?.endTime
  if (!raw) return null

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function createSurvey({ actor, title, description, questions, settings, style }) {
  if (!title || !title.trim()) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'Title is required')
  }

  const survey = await Survey.create({
    title,
    description,
    creator_id: actor.sub,
    questions: normalizeSurveyQuestions(questions || []),
    settings,
    style
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
  const updated = await Survey.update(survey.id, {
    title,
    description,
    questions: questions === undefined ? undefined : normalizeSurveyQuestions(questions),
    settings,
    style
  })

  await invalidateSurveyResultsSnapshot({ surveyId: survey.id })
  return updated
}

export async function updateManagedSurvey({ actor, identifier, title, description, questions, settings, style }) {
  const survey = await getSurveyForManagement({ actor, identifier })
  return updateSurvey({ survey, title, description, questions, settings, style })
}

export async function moveSurveyToTrash({ survey, actor }) {
  const deleted = await Survey.softDelete(survey.id, actor.sub)
  await invalidateSurveyResultsSnapshot({ surveyId: survey.id })
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

  const restored = await Survey.restore(survey.id)
  await invalidateSurveyResultsSnapshot({ surveyId: survey.id })
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

  const endTime = getSurveyEndTime(survey)
  if (endTime && endTime.getTime() <= Date.now()) {
    throw createHttpError(400, SURVEY_ERROR_CODES.VALIDATION, 'End time must be later than now')
  }

  const updated = await Survey.update(survey.id, { status: SURVEY_STATUS.PUBLISHED, questions: normalizedQuestions })
  await invalidateSurveyResultsSnapshot({ surveyId: survey.id })
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
  const updated = await Survey.update(survey.id, { status: SURVEY_STATUS.CLOSED })
  await invalidateSurveyResultsSnapshot({ surveyId: survey.id })
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
    const folder = await Folder.findById(folderId, actor.sub)
    if (!folder) {
      throw createHttpError(404, SURVEY_ERROR_CODES.FOLDER_NOT_FOUND, 'Folder not found')
    }
  }

  const updated = await Survey.update(survey.id, { folder_id: folderId })
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
