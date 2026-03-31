import AnswerModel from '../models/Answer.js'

const answerRepository = {
  async findById(id, options = {}) {
    return AnswerModel.findById(id, options)
  },

  async findByIds(ids = [], options = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return []
    const rows = await Promise.all(ids.map(id => AnswerModel.findById(id, options)))
    return rows.filter(Boolean)
  },

  async list(payload = {}, options = {}) {
    return AnswerModel.list(payload, options)
  },

  async countBySurveyId(surveyId, options = {}) {
    const count = await AnswerModel.count(surveyId, options)
    return Number(count || 0)
  },

  async getAggregateState(surveyId, options = {}) {
    return AnswerModel.getAggregateState(surveyId, options)
  },

  async listBySurveyId(surveyId, options = {}) {
    return AnswerModel.findBySurveyId(surveyId, options)
  },

  async create(payload, options = {}) {
    return AnswerModel.create(payload, options)
  },

  async countByIp(surveyId, ipAddress, options = {}) {
    return AnswerModel.countByIp(surveyId, ipAddress, options)
  },

  async deleteBatch(ids = [], options = {}) {
    return AnswerModel.deleteBatch(ids, options)
  },

  async deleteBySurveyIds(surveyIds = [], options = {}) {
    return AnswerModel.deleteBySurveyIds(surveyIds, options)
  }
}

export default answerRepository
