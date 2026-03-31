import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import ExcelJS from 'exceljs'
import { throwAnswerPolicyError } from '../http/answerErrors.js'
import { getAnswerAttachmentsAvailablePolicy } from '../policies/answerPolicy.js'
import answerRepository from '../repositories/answerRepository.js'
import fileRepository from '../repositories/fileRepository.js'
import { UPLOAD_DIR } from '../utils/uploadStorage.js'
import { getManagedSurveyForAnswerRequest } from './answerQueryService.js'

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
  const answers = await answerRepository.listBySurveyId(managedSurvey.id)
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
  const files = await fileRepository.listAnswerFilesBySurveyId(managedSurvey.id)
  const existingFiles = resolveExistingAnswerFiles(files)
  throwAnswerPolicyError(getAnswerAttachmentsAvailablePolicy(existingFiles))

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
