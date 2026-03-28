import Survey from '../models/Survey.js'
import Answer from '../models/Answer.js'
import FileModel from '../models/File.js'
import transactionManager from '../db/transaction.js'
import { invalidateSurveyResultsSnapshots } from '../services/surveyResultsService.js'

function normalizeIds(values = []) {
  return values
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0)
}

const surveyAggregateRepository = {
  async clearTrash({ creatorId, onTransaction } = {}) {
    let filesToCleanup = []

    const result = await transactionManager.run(async trx => {
      const surveyIds = await Survey.listTrashIds({ creator_id: creatorId }, { db: trx })
      filesToCleanup = surveyIds.length > 0
        ? await FileModel.listBySurveyIds(surveyIds, { db: trx })
        : []

      if (surveyIds.length > 0) {
        await FileModel.deleteBySurveyIds(surveyIds, { db: trx })
        await Answer.deleteBySurveyIds(surveyIds, { db: trx })
        await invalidateSurveyResultsSnapshots({ surveyIds }, { db: trx })
      }

      const deleted = await Survey.clearTrash({ creator_id: creatorId }, { db: trx })
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
      filesToCleanup = await FileModel.listBySurveyIds([surveyId], { db: trx })
      await FileModel.deleteBySurveyIds([surveyId], { db: trx })
      await Answer.deleteBySurveyIds([surveyId], { db: trx })
      await invalidateSurveyResultsSnapshots({ surveyIds: [surveyId] }, { db: trx })
      await Survey.delete(surveyId, { db: trx })

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
      const answer = await Answer.create({
        survey_id: surveyId,
        answers_data: answersData,
        ip_address: ipAddress,
        user_agent: userAgent || '',
        duration: duration || null
      }, { db: trx })

      await FileModel.attachToAnswer(normalizedFileIds, answer.id, { db: trx })
      await Survey.incrementResponseCount(surveyId, { db: trx })
      await invalidateSurveyResultsSnapshots({ surveyIds: [surveyId] }, { db: trx })

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
      filesToCleanup = await FileModel.listByAnswerIds(normalizedAnswerIds, { db: trx })
      if (filesToCleanup.length > 0) {
        await FileModel.deleteByAnswerIds(normalizedAnswerIds, { db: trx })
      }

      const deleted = await Answer.deleteBatch(normalizedAnswerIds, { db: trx })
      for (const surveyId of normalizedSurveyIds) {
        await Survey.syncResponseCount(surveyId, { db: trx })
      }
      await invalidateSurveyResultsSnapshots({ surveyIds: normalizedSurveyIds }, { db: trx })

      return deleted
    })

    return { deleted, filesToCleanup }
  }
}

export default surveyAggregateRepository
