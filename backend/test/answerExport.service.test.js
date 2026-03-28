import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import ExcelJS from 'exceljs'
import Answer from '../src/models/Answer.js'
import FileModel from '../src/models/File.js'
import Survey from '../src/models/Survey.js'
import {
  createSurveyAnswerAttachmentsArchive,
  createSurveyAnswersWorkbookExport
} from '../src/services/answerExportService.js'
import { UPLOAD_DIR } from '../src/utils/uploadStorage.js'

const originalAnswerFindBySurveyId = Answer.findBySurveyId
const originalFileListAnswerFilesBySurveyId = FileModel.listAnswerFilesBySurveyId
const originalSurveyFindById = Survey.findById

afterEach(() => {
  Answer.findBySurveyId = originalAnswerFindBySurveyId
  FileModel.listAnswerFilesBySurveyId = originalFileListAnswerFilesBySurveyId
  Survey.findById = originalSurveyFindById
})

test('createSurveyAnswersWorkbookExport returns an xlsx payload for survey answers', async () => {
  Answer.findBySurveyId = async () => ([
    {
      id: 81,
      submitted_at: '2026-03-28T12:00:00.000Z',
      ip_address: '1.1.1.1',
      duration: 45,
      status: 'completed',
      answers_data: [{ questionId: 1, value: 'Alice' }]
    }
  ])

  const result = await createSurveyAnswersWorkbookExport({
    survey: { id: 55 }
  })

  assert.equal(result.filename, 'survey-55.xlsx')
  assert.equal(result.contentType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  assert.ok(result.buffer.byteLength > 0)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(result.buffer)
  const sheet = workbook.getWorksheet('Answers')

  assert.equal(sheet.getRow(1).getCell(1).value, 'ID')
  assert.equal(sheet.getRow(2).getCell(1).value, 81)
  assert.equal(sheet.getRow(2).getCell(6).value, JSON.stringify([{ questionId: 1, value: 'Alice' }]))
})

test('createSurveyAnswersWorkbookExport resolves the managed survey when surveyId is provided', async () => {
  let resolvedSurveyId = null

  Survey.findById = async id => ({
    id: Number(id),
    creator_id: 1,
    title: `Survey ${id}`
  })
  Answer.findBySurveyId = async surveyId => {
    resolvedSurveyId = surveyId
    return []
  }

  const result = await createSurveyAnswersWorkbookExport({
    actor: { sub: 1, roleCode: 'user' },
    surveyId: '56'
  })

  assert.equal(resolvedSurveyId, 56)
  assert.equal(result.filename, 'survey-56.xlsx')
  assert.ok(result.buffer.byteLength > 0)
})

test('createSurveyAnswerAttachmentsArchive rejects when no stored files exist on disk', async () => {
  FileModel.listAnswerFilesBySurveyId = async () => ([
    {
      id: 901,
      answer_id: 88,
      survey_id: 66,
      name: 'missing.txt',
      url: '/uploads/missing.txt'
    }
  ])

  await assert.rejects(
    () => createSurveyAnswerAttachmentsArchive({ survey: { id: 66 } }),
    error => error?.status === 404 && error?.body?.error?.code === 'NO_FILES'
  )
})

test('createSurveyAnswerAttachmentsArchive returns a zip archive for existing files', async () => {
  const fixtureName = 'answer-export-fixture.txt'
  const fixturePath = path.join(UPLOAD_DIR, fixtureName)
  fs.writeFileSync(fixturePath, 'attachment export fixture')

  FileModel.listAnswerFilesBySurveyId = async () => ([
    {
      id: 902,
      answer_id: 99,
      survey_id: 67,
      name: 'proof.txt',
      url: `/uploads/${fixtureName}`
    }
  ])

  try {
    const result = await createSurveyAnswerAttachmentsArchive({
      survey: { id: 67 }
    })
    const output = new PassThrough()
    const chunks = []

    output.on('data', chunk => chunks.push(chunk))
    const completed = new Promise((resolve, reject) => {
      output.on('end', resolve)
      output.on('error', reject)
    })

    result.archive.pipe(output)
    await result.archive.finalize()
    await completed

    assert.equal(result.filename, 'survey-67-attachments.zip')
    assert.equal(result.contentType, 'application/zip')
    assert.equal(typeof result.archive.finalize, 'function')
    assert.ok(Buffer.concat(chunks).length > 20)
  } finally {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath)
  }
})
