import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import ExcelJS from 'exceljs'
import Answer from '../models/Answer.js'
import FileModel from '../models/File.js'
import { UPLOAD_DIR } from '../utils/uploadStorage.js'
import { getManagedSurveyForAnswerRequest } from './answerQueryService.js'

function createResponseError(status, body) {
  const error = Object.assign(new Error(body?.error?.message || 'Request failed'), {
    status,
    body
  })
  if (body?.error?.code) error.code = body.error.code
  return error
}

function resolveExistingAnswerFiles(files = []) {
  return files
    .map(file => {
      const filename = path.basename(String(file?.url || ''))
      return {
        ...file,
        filePath: path.join(UPLOAD_DIR, filename)
      }
    })
    .filter(file => file.answer_id && file.url && fs.existsSync(file.filePath))
}

function sanitizeArchiveEntryName(name) {
  return String(name || '').replace(/[\\/:*?"<>|]/g, '_')
}

async function resolveManagedSurvey({ actor, surveyId, survey }) {
  if (survey) return survey
  return getManagedSurveyForAnswerRequest({ actor, surveyId })
}

export async function createSurveyAnswersWorkbookExport({ actor, surveyId, survey }) {
  const managedSurvey = await resolveManagedSurvey({ actor, surveyId, survey })
  const answers = await Answer.findBySurveyId(managedSurvey.id)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Answers')

  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Submitted At', key: 'submitted_at', width: 24 },
    { header: 'IP', key: 'ip_address', width: 18 },
    { header: 'Duration (s)', key: 'duration', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Answers Data', key: 'answers_data', width: 60 }
  ]

  for (const answer of answers) {
    sheet.addRow({
      ...answer,
      answers_data: JSON.stringify(answer.answers_data)
    })
  }

  return {
    filename: `survey-${managedSurvey.id}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: await workbook.xlsx.writeBuffer()
  }
}

export async function createSurveyAnswerAttachmentsArchive({ actor, surveyId, survey }) {
  const managedSurvey = await resolveManagedSurvey({ actor, surveyId, survey })
  const files = await FileModel.listAnswerFilesBySurveyId(managedSurvey.id)
  const existingFiles = resolveExistingAnswerFiles(files)

  if (existingFiles.length === 0) {
    throw createResponseError(404, {
      success: false,
      error: { code: 'NO_FILES', message: 'No answer attachments are available for download' }
    })
  }

  const archive = archiver('zip', { zlib: { level: 9 } })
  for (const file of existingFiles) {
    const safeName = sanitizeArchiveEntryName(file.name || path.basename(file.filePath))
    archive.file(file.filePath, {
      name: `answer-${file.answer_id}/${file.id}-${safeName}`
    })
  }

  return {
    filename: `survey-${managedSurvey.id}-attachments.zip`,
    contentType: 'application/zip',
    archive
  }
}
