import SurveyResultsSnapshotModel from '../models/SurveyResultsSnapshot.js'

const surveyResultsSnapshotRepository = {
  async findBySurveyId(surveyId, options = {}) {
    return SurveyResultsSnapshotModel.findBySurveyId(surveyId, options)
  },

  async upsert(payload, options = {}) {
    return SurveyResultsSnapshotModel.upsert(payload, options)
  },

  async deleteBySurveyId(surveyId, options = {}) {
    return SurveyResultsSnapshotModel.deleteBySurveyId(surveyId, options)
  },

  async deleteBySurveyIds(surveyIds = [], options = {}) {
    return SurveyResultsSnapshotModel.deleteBySurveyIds(surveyIds, options)
  }
}

export default surveyResultsSnapshotRepository
