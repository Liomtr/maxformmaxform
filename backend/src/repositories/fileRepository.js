import FileModel from '../models/File.js'

const fileRepository = {
  async findById(id, options = {}) {
    return FileModel.findById(id, options)
  },

  async findByIds(ids = [], options = {}) {
    return FileModel.findByIds(ids, options)
  },

  async countPendingBySurveyQuestionSession(surveyId, questionOrder, submissionToken, options = {}) {
    return FileModel.countPendingBySurveyQuestionSession(surveyId, questionOrder, submissionToken, options)
  },

  async create(payload, options = {}) {
    return FileModel.create(payload, options)
  },

  async delete(id, options = {}) {
    return FileModel.delete(id, options)
  },

  async deleteByIds(ids = [], options = {}) {
    return FileModel.deleteByIds(ids, options)
  },

  async list(payload = {}, options = {}) {
    return FileModel.list(payload, options)
  },

  async listExpiredPending(cutoff, options = {}) {
    return FileModel.listExpiredPending(cutoff, options)
  },

  async listPendingBySubmission(surveyId, submissionToken, options = {}) {
    return FileModel.listPendingBySubmission(surveyId, submissionToken, options)
  },

  async listAnswerFilesBySurveyId(surveyId, options = {}) {
    return FileModel.listAnswerFilesBySurveyId(surveyId, options)
  },

  async attachToAnswer(ids = [], answerId, options = {}) {
    return FileModel.attachToAnswer(ids, answerId, options)
  },

  async listBySurveyIds(surveyIds = [], options = {}) {
    return FileModel.listBySurveyIds(surveyIds, options)
  },

  async listByAnswerIds(answerIds = [], options = {}) {
    return FileModel.listByAnswerIds(answerIds, options)
  },

  async deleteBySurveyIds(surveyIds = [], options = {}) {
    return FileModel.deleteBySurveyIds(surveyIds, options)
  },

  async deleteByAnswerIds(answerIds = [], options = {}) {
    return FileModel.deleteByAnswerIds(answerIds, options)
  }
}

export default fileRepository
