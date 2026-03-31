import answerRepository from './answerRepository.js'
import fileRepository from './fileRepository.js'
import surveyRepository from './surveyRepository.js'
import surveyResultsSnapshotRepository from './surveyResultsSnapshotRepository.js'
import transactionManager from '../db/transaction.js'

function normalizeIds(values = []) {
  return values
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0)
}

const surveyAggregateRepository = {
  async clearTrash({ creatorId, onTransaction } = {}) {
    let filesToCleanup = []

    const result = await transactionManager.run(async trx => {
      const surveyIds = await surveyRepository.listTrashIds({ creator_id: creatorId }, { db: trx })
      filesToCleanup = surveyIds.length > 0
        ? await fileRepository.listBySurveyIds(surveyIds, { db: trx })
        : []

      if (surveyIds.length > 0) {
        await fileRepository.deleteBySurveyIds(surveyIds, { db: trx })
        await answerRepository.deleteBySurveyIds(surveyIds, { db: trx })
        await surveyResultsSnapshotRepository.deleteBySurveyIds(surveyIds, { db: trx })
      }

      const deleted = await surveyRepository.clearTrash({ creator_id: creatorId }, { db: trx })
      if (onTransaction) {
        await onTransaction({ trx, deleted, surveyIds })
      }

      return { deleted, surveyIds }
    })

    return { ...result, filesToCleanup }
  },

  async forceDeleteSurvey({ surveyId, onTransaction }) {
    let filesToCleanup = []

    await transactionManager.run(async trx => {
      filesToCleanup = await fileRepository.listBySurveyIds([surveyId], { db: trx })
      await fileRepository.deleteBySurveyIds([surveyId], { db: trx })
      await answerRepository.deleteBySurveyIds([surveyId], { db: trx })
      await surveyResultsSnapshotRepository.deleteBySurveyIds([surveyId], { db: trx })
      await surveyRepository.delete(surveyId, { db: trx })

      if (onTransaction) {
        await onTransaction({ trx, surveyId })
      }
    })

    return { filesToCleanup }
  },

  async createSubmission({
    surveyId,
    answersData,
    uploadedFileIds = [],
    ipAddress,
    userAgent,
    duration,
    onTransaction
  }) {
    const normalizedFileIds = normalizeIds(uploadedFileIds)

    return transactionManager.run(async trx => {
      const answer = await answerRepository.create({
        survey_id: surveyId,
        answers_data: answersData,
        ip_address: ipAddress,
        user_agent: userAgent || '',
        duration: duration || null
      }, { db: trx })

      await fileRepository.attachToAnswer(normalizedFileIds, answer.id, { db: trx })
      await surveyRepository.incrementResponseCount(surveyId, { db: trx })
      await surveyResultsSnapshotRepository.deleteBySurveyIds([surveyId], { db: trx })

      if (onTransaction) {
        await onTransaction({ trx, answer })
      }

      return answer
    })
  },

  async deleteAnswersBatch({ answerIds, surveyIds }) {
    const normalizedAnswerIds = normalizeIds(answerIds)
    const normalizedSurveyIds = [...new Set(normalizeIds(surveyIds))]

    if (normalizedAnswerIds.length === 0) {
      return { deleted: 0, filesToCleanup: [] }
    }

    let filesToCleanup = []
    const deleted = await transactionManager.run(async trx => {
      filesToCleanup = await fileRepository.listByAnswerIds(normalizedAnswerIds, { db: trx })
      if (filesToCleanup.length > 0) {
        await fileRepository.deleteByAnswerIds(normalizedAnswerIds, { db: trx })
      }

      const deleted = await answerRepository.deleteBatch(normalizedAnswerIds, { db: trx })
      for (const surveyId of normalizedSurveyIds) {
        await surveyRepository.syncResponseCount(surveyId, { db: trx })
      }
      await surveyResultsSnapshotRepository.deleteBySurveyIds(normalizedSurveyIds, { db: trx })

      return deleted
    })

    return { deleted, filesToCleanup }
  }
}

export default surveyAggregateRepository
