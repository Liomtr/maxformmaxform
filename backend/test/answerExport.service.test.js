import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import ExcelJS from 'exceljs'
import Survey from '../src/models/Survey.js'
import answerRepository from '../src/repositories/answerRepository.js'
import fileRepository from '../src/repositories/fileRepository.js'
import {
  createSurveyAnswerAttachmentsArchive,
  createSurveyAnswersWorkbookExport
} from '../src/services/answerExportService.js'
import { UPLOAD_DIR } from '../src/utils/uploadStorage.js'
import { ANSWER_ERROR_CODES } from '../../shared/answer.contract.js'

const originalAnswerListBySurveyId = answerRepository.listBySurveyId
const originalFileListAnswerFilesBySurveyId = fileRepository.listAnswerFilesBySurveyId
const originalSurveyFindById = Survey.findById

afterEach(() => {
  answerRepository.listBySurveyId = originalAnswerListBySurveyId
  fileRepository.listAnswerFilesBySurveyId = originalFileListAnswerFilesBySurveyId
  Survey.findById = originalSurveyFindById
})

test('createSurveyAnswersWorkbookExport returns an xlsx payload for survey answers', async () => {
  answerRepository.listBySurveyId = async () => ([
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
  answerRepository.listBySurveyId = async surveyId => {
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

test('createSurveyAnswersWorkbookExport rejects invalid survey id structures', async () => {
  await assert.rejects(
    () => createSurveyAnswersWorkbookExport({
      actor: { sub: 1, roleCode: 'user' },
      surveyId: { id: 56 }
    }),
    error => error?.status === 400
      && error?.body?.error?.code === ANSWER_ERROR_CODES.VALIDATION
      && /survey_id must be an integer/i.test(error?.body?.error?.message || '')
  )
})

test('createSurveyAnswerAttachmentsArchive rejects when no stored files exist on disk', async () => {
  fileRepository.listAnswerFilesBySurveyId = async () => ([
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
    error => error?.status === 404 && error?.body?.error?.code === ANSWER_ERROR_CODES.NO_FILE
  )
})

test('createSurveyAnswerAttachmentsArchive returns a zip archive for existing files', async () => {
  const fixtureName = 'answer-export-fixture.txt'
  const fixturePath = path.join(UPLOAD_DIR, fixtureName)
  fs.writeFileSync(fixturePath, 'attachment export fixture')

  fileRepository.listAnswerFilesBySurveyId = async () => ([
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
