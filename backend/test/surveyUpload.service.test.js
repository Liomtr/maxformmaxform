import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import Answer from '../src/models/Answer.js'
import FileModel from '../src/models/File.js'
import surveyAggregateRepository from '../src/repositories/surveyAggregateRepository.js'
import { submitSurveyResponse, uploadSurveyFile } from '../src/services/surveyUploadService.js'

const originalAnswerCountByIp = Answer.countByIp
const originalFileCreate = FileModel.create
const originalFileDeleteByIds = FileModel.deleteByIds
const originalFileFindByIds = FileModel.findByIds
const originalFileCountPendingBySurveyQuestionSession = FileModel.countPendingBySurveyQuestionSession
const originalFileListExpiredPending = FileModel.listExpiredPending
const originalFileListPendingBySubmission = FileModel.listPendingBySubmission
const originalCreateSubmission = surveyAggregateRepository.createSubmission

afterEach(() => {
  Answer.countByIp = originalAnswerCountByIp
  FileModel.create = originalFileCreate
  FileModel.deleteByIds = originalFileDeleteByIds
  FileModel.findByIds = originalFileFindByIds
  FileModel.countPendingBySurveyQuestionSession = originalFileCountPendingBySurveyQuestionSession
  FileModel.listExpiredPending = originalFileListExpiredPending
  FileModel.listPendingBySubmission = originalFileListPendingBySubmission
  surveyAggregateRepository.createSubmission = originalCreateSubmission
})

test('uploadSurveyFile rejects question-scoped uploads without a submission token', async () => {
  FileModel.listExpiredPending = async () => []

  await assert.rejects(
    () => uploadSurveyFile({
      survey: {
        id: 201,
        questions: [{ type: 'upload', title: 'Attachment' }]
      },
      file: {
        filename: 'missing-token.pdf',
        originalname: 'missing-token.pdf',
        mimetype: 'application/pdf',
        size: 128
      },
      requestedQuestionId: 1,
      submissionToken: '',
      uploaderId: 1
    }),
    error => error?.status === 400 && error?.code === 'UPLOAD_SESSION_REQUIRED'
  )
})

test('uploadSurveyFile stores upload metadata for a valid question-scoped upload', async () => {
  let createPayload = null

  FileModel.listExpiredPending = async () => []
  FileModel.countPendingBySurveyQuestionSession = async () => 0
  FileModel.create = async payload => {
    createPayload = payload
    return { id: 301, ...payload }
  }

  const result = await uploadSurveyFile({
    survey: {
      id: 202,
      questions: [{
        type: 'upload',
        title: 'Attachment',
        upload: { maxFiles: 2, maxSizeMb: 10, accept: '.pdf' }
      }]
    },
    file: {
      filename: 'valid-upload.pdf',
      originalname: 'valid-upload.pdf',
      mimetype: 'application/pdf',
      size: 256
    },
    requestedQuestionId: 1,
    submissionToken: 'session-202',
    uploaderId: 9
  })

  assert.equal(result.id, 301)
  assert.equal(result.surveyId, 202)
  assert.equal(result.name, 'valid-upload.pdf')
  assert.equal(result.type, 'application/pdf')
  assert.ok(typeof result.uploadToken === 'string' && result.uploadToken.length > 20)
  assert.deepEqual(createPayload, {
    name: 'valid-upload.pdf',
    url: '/uploads/valid-upload.pdf',
    size: 256,
    type: 'application/pdf',
    uploader_id: 9,
    survey_id: 202,
    question_order: 1,
    submission_token: 'session-202',
    public_token: createPayload.public_token
  })
  assert.ok(createPayload.public_token)
})

test('submitSurveyResponse rejects duplicate submissions when submitOnce is enabled', async () => {
  Answer.countByIp = async () => 1

  await assert.rejects(
    () => submitSurveyResponse({
      survey: {
        id: 203,
        title: 'Submit Once Survey',
        settings: { submitOnce: true },
        questions: [{ type: 'input', title: 'Name' }]
      },
      answers: [{ questionId: 1, value: 'Alice' }],
      userAgent: 'Mozilla/5.0',
      forwardedFor: '1.2.3.4',
      remoteAddress: '5.6.7.8'
    }),
    error => error?.status === 409 && error?.code === 'DUPLICATE_SUBMISSION'
  )
})

test('submitSurveyResponse resolves upload references and forwards normalized payload to repository', async () => {
  let createSubmissionPayload = null

  Answer.countByIp = async () => 0
  FileModel.findByIds = async () => ([
    {
      id: 401,
      survey_id: 204,
      question_order: 1,
      submission_token: 'session-204',
      public_token: 'upload-token-204',
      name: 'proof.pdf',
      url: '/uploads/proof.pdf',
      size: 512,
      type: 'application/pdf'
    }
  ])
  FileModel.listPendingBySubmission = async () => []
  FileModel.deleteByIds = async () => 0
  surveyAggregateRepository.createSubmission = async payload => {
    createSubmissionPayload = payload
    return { id: 402 }
  }

  const result = await submitSurveyResponse({
    survey: {
      id: 204,
      creator_id: 1,
      title: 'Upload Submission Survey',
      settings: { allowMultipleSubmissions: true },
      questions: [{
        type: 'upload',
        title: 'Attachment',
        upload: { maxFiles: 1, maxSizeMb: 10, accept: '.pdf' }
      }]
    },
    answers: [
      {
        questionId: 1,
        value: [{ id: 401, uploadToken: 'upload-token-204' }]
      }
    ],
    clientSubmissionToken: 'session-204',
    userAgent: 'Mozilla/5.0',
    forwardedFor: '8.8.8.8, 9.9.9.9',
    remoteAddress: '127.0.0.1'
  })

  assert.equal(result.id, 402)
  assert.deepEqual(createSubmissionPayload, {
    surveyId: 204,
    answersData: [
      {
        questionId: 1,
        questionType: 'upload',
        value: [{
          id: 401,
          name: 'proof.pdf',
          url: '/uploads/proof.pdf',
          size: 512,
          type: 'application/pdf'
        }]
      }
    ],
    uploadedFileIds: [401],
    ipAddress: '8.8.8.8',
    userAgent: 'Mozilla/5.0',
    duration: undefined,
    onTransaction: createSubmissionPayload.onTransaction
  })
  assert.equal(typeof createSubmissionPayload.onTransaction, 'function')
})
