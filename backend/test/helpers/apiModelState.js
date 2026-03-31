import Dept from '../../src/models/Dept.js'
import User from '../../src/models/User.js'
import AuditLog from '../../src/models/AuditLog.js'
import Message from '../../src/models/Message.js'
import Survey from '../../src/models/Survey.js'
import Folder from '../../src/models/Folder.js'
import Answer from '../../src/models/Answer.js'
import FileModel from '../../src/models/File.js'
import Position from '../../src/models/Position.js'
import Flow from '../../src/models/Flow.js'
import ManagementAiExecution from '../../src/models/ManagementAiExecution.js'
import QuestionBankRepo from '../../src/models/QuestionBankRepo.js'
import QuestionBankQuestion from '../../src/models/QuestionBankQuestion.js'
import Role from '../../src/models/Role.js'
import SystemConfig from '../../src/models/SystemConfig.js'
import SurveyResultsSnapshot from '../../src/models/SurveyResultsSnapshot.js'
import answerRepository from '../../src/repositories/answerRepository.js'
import fileRepository from '../../src/repositories/fileRepository.js'
import surveyRepository from '../../src/repositories/surveyRepository.js'
import surveyResultsSnapshotRepository from '../../src/repositories/surveyResultsSnapshotRepository.js'
import { resetSurveyResultsObservability } from '../../src/services/surveyResultsService.js'

const originalDeptMethods = {
  create: Dept.create,
  findById: Dept.findById,
  list: Dept.list,
  tree: Dept.tree,
  update: Dept.update,
  countChildren: Dept.countChildren,
  countUsers: Dept.countUsers,
  clearUsersDept: Dept.clearUsersDept,
  delete: Dept.delete
}

const originalUserMethods = {
  findById: User.findById,
  findByEmail: User.findByEmail,
  findByUsername: User.findByUsername,
  list: User.list,
  create: User.create,
  update: User.update,
  updateLastLogin: User.updateLastLogin,
  updatePassword: User.updatePassword,
  verifyPassword: User.verifyPassword,
  delete: User.delete
}

const originalAuditMethods = {
  create: AuditLog.create,
  list: AuditLog.list
}
const originalMessageMethods = {
  create: Message.create,
  list: Message.list,
  markRead: Message.markRead
}
const originalSurveyMethods = {
  create: Survey.create,
  update: Survey.update,
  delete: Survey.delete,
  restore: Survey.restore,
  list: Survey.list,
  listTrash: Survey.listTrash,
  listTrashIds: Survey.listTrashIds,
  clearTrash: Survey.clearTrash,
  findById: Survey.findById,
  findByShareCode: Survey.findByShareCode,
  findByIdentifier: Survey.findByIdentifier,
  incrementResponseCount: Survey.incrementResponseCount,
  syncResponseCount: Survey.syncResponseCount,
  softDelete: Survey.softDelete
}
const originalFolderMethods = {
  findById: Folder.findById,
  list: Folder.list,
  create: Folder.create,
  update: Folder.update,
  delete: Folder.delete,
  countChildren: Folder.countChildren,
  moveSurveysToRoot: Folder.moveSurveysToRoot
}
const originalAnswerMethods = {
  findById: Answer.findById,
  create: Answer.create,
  count: Answer.count,
  getAggregateState: Answer.getAggregateState,
  countByIp: Answer.countByIp,
  deleteBatch: Answer.deleteBatch,
  deleteBySurveyIds: Answer.deleteBySurveyIds,
  findBySurveyId: Answer.findBySurveyId
}
const originalFileMethods = {
  create: FileModel.create,
  findById: FileModel.findById,
  findByIds: FileModel.findByIds,
  list: FileModel.list,
  listByAnswerIds: FileModel.listByAnswerIds,
  listBySurveyIds: FileModel.listBySurveyIds,
  listAnswerFilesBySurveyId: FileModel.listAnswerFilesBySurveyId,
  countPendingBySurveyQuestionSession: FileModel.countPendingBySurveyQuestionSession,
  attachToAnswer: FileModel.attachToAnswer,
  listExpiredPending: FileModel.listExpiredPending,
  listPendingBySubmission: FileModel.listPendingBySubmission,
  deleteByIds: FileModel.deleteByIds,
  deleteByAnswerIds: FileModel.deleteByAnswerIds,
  deleteBySurveyIds: FileModel.deleteBySurveyIds,
  delete: FileModel.delete
}
const originalPositionMethods = {
  list: Position.list,
  findById: Position.findById,
  findByCode: Position.findByCode,
  create: Position.create,
  update: Position.update,
  delete: Position.delete
}
const originalFlowMethods = {
  list: Flow.list,
  findById: Flow.findById,
  create: Flow.create,
  update: Flow.update,
  delete: Flow.delete
}
const originalManagementAiExecutionMethods = {
  list: ManagementAiExecution.list,
  findByActorAndKey: ManagementAiExecution.findByActorAndKey,
  create: ManagementAiExecution.create,
  update: ManagementAiExecution.update
}
const originalQuestionBankRepoMethods = {
  list: QuestionBankRepo.list,
  findById: QuestionBankRepo.findById,
  create: QuestionBankRepo.create,
  update: QuestionBankRepo.update,
  delete: QuestionBankRepo.delete
}
const originalQuestionBankQuestionMethods = {
  findById: QuestionBankQuestion.findById,
  listByRepoId: QuestionBankQuestion.listByRepoId,
  create: QuestionBankQuestion.create,
  delete: QuestionBankQuestion.delete,
  deleteByRepoId: QuestionBankQuestion.deleteByRepoId
}
const originalRoleMethods = {
  list: Role.list,
  findById: Role.findById,
  findByCode: Role.findByCode,
  create: Role.create,
  update: Role.update,
  delete: Role.delete
}
const originalSystemConfigMethods = {
  findByKey: SystemConfig.findByKey,
  upsert: SystemConfig.upsert
}
const originalSurveyResultsSnapshotMethods = {
  findBySurveyId: SurveyResultsSnapshot.findBySurveyId,
  upsert: SurveyResultsSnapshot.upsert,
  deleteBySurveyId: SurveyResultsSnapshot.deleteBySurveyId,
  deleteBySurveyIds: SurveyResultsSnapshot.deleteBySurveyIds
}
const originalSurveyRepositoryMethods = {
  findById: surveyRepository.findById,
  findByShareCode: surveyRepository.findByShareCode,
  findByIdentifier: surveyRepository.findByIdentifier,
  create: surveyRepository.create,
  update: surveyRepository.update,
  delete: surveyRepository.delete,
  softDelete: surveyRepository.softDelete,
  restore: surveyRepository.restore,
  incrementResponseCount: surveyRepository.incrementResponseCount,
  syncResponseCount: surveyRepository.syncResponseCount,
  list: surveyRepository.list,
  listTrash: surveyRepository.listTrash,
  listTrashIds: surveyRepository.listTrashIds,
  clearTrash: surveyRepository.clearTrash
}
const originalAnswerRepositoryMethods = {
  findById: answerRepository.findById,
  findByIds: answerRepository.findByIds,
  list: answerRepository.list,
  countBySurveyId: answerRepository.countBySurveyId,
  getAggregateState: answerRepository.getAggregateState,
  listBySurveyId: answerRepository.listBySurveyId,
  create: answerRepository.create,
  countByIp: answerRepository.countByIp,
  deleteBatch: answerRepository.deleteBatch,
  deleteBySurveyIds: answerRepository.deleteBySurveyIds
}
const originalFileRepositoryMethods = {
  create: fileRepository.create,
  findById: fileRepository.findById,
  findByIds: fileRepository.findByIds,
  list: fileRepository.list,
  listByAnswerIds: fileRepository.listByAnswerIds,
  listBySurveyIds: fileRepository.listBySurveyIds,
  listAnswerFilesBySurveyId: fileRepository.listAnswerFilesBySurveyId,
  countPendingBySurveyQuestionSession: fileRepository.countPendingBySurveyQuestionSession,
  attachToAnswer: fileRepository.attachToAnswer,
  listExpiredPending: fileRepository.listExpiredPending,
  listPendingBySubmission: fileRepository.listPendingBySubmission,
  deleteByIds: fileRepository.deleteByIds,
  deleteByAnswerIds: fileRepository.deleteByAnswerIds,
  deleteBySurveyIds: fileRepository.deleteBySurveyIds,
  delete: fileRepository.delete
}
const originalSurveyResultsSnapshotRepositoryMethods = {
  findBySurveyId: surveyResultsSnapshotRepository.findBySurveyId,
  upsert: surveyResultsSnapshotRepository.upsert,
  deleteBySurveyId: surveyResultsSnapshotRepository.deleteBySurveyId,
  deleteBySurveyIds: surveyResultsSnapshotRepository.deleteBySurveyIds
}

export function applyDefaultFileStubs() {
  FileModel.listExpiredPending = async () => []
  FileModel.deleteByIds = async () => 0
  FileModel.deleteByAnswerIds = async () => 0
  FileModel.deleteBySurveyIds = async () => 0
  FileModel.attachToAnswer = async () => 0
  FileModel.listByAnswerIds = async () => []
  FileModel.listPendingBySubmission = async () => []
  FileModel.countPendingBySurveyQuestionSession = async () => 0
  FileModel.listBySurveyIds = async () => []
  Answer.getAggregateState = async () => ({
    answerCount: 0,
    latestAnswerId: null,
    latestSubmittedAt: null
  })
  SurveyResultsSnapshot.findBySurveyId = async () => null
  SurveyResultsSnapshot.upsert = async () => null
  SurveyResultsSnapshot.deleteBySurveyId = async () => 0
  SurveyResultsSnapshot.deleteBySurveyIds = async () => 0
}

export function resetApiRouteModelState() {
  resetSurveyResultsObservability()

  Dept.create = originalDeptMethods.create
  Dept.findById = originalDeptMethods.findById
  Dept.list = originalDeptMethods.list
  Dept.tree = originalDeptMethods.tree
  Dept.update = originalDeptMethods.update
  Dept.countChildren = originalDeptMethods.countChildren
  Dept.countUsers = originalDeptMethods.countUsers
  Dept.clearUsersDept = originalDeptMethods.clearUsersDept
  Dept.delete = originalDeptMethods.delete

  User.findById = originalUserMethods.findById
  User.findByEmail = originalUserMethods.findByEmail
  User.findByUsername = originalUserMethods.findByUsername
  User.list = originalUserMethods.list
  User.create = originalUserMethods.create
  User.update = originalUserMethods.update
  User.updateLastLogin = originalUserMethods.updateLastLogin
  User.updatePassword = originalUserMethods.updatePassword
  User.verifyPassword = originalUserMethods.verifyPassword
  User.delete = originalUserMethods.delete

  AuditLog.create = originalAuditMethods.create
  AuditLog.list = originalAuditMethods.list
  Message.create = originalMessageMethods.create
  Message.list = originalMessageMethods.list
  Message.markRead = originalMessageMethods.markRead

  Survey.findByIdentifier = originalSurveyMethods.findByIdentifier
  Survey.findById = originalSurveyMethods.findById
  Survey.list = originalSurveyMethods.list
  Survey.findByShareCode = originalSurveyMethods.findByShareCode
  Survey.create = originalSurveyMethods.create
  Survey.update = originalSurveyMethods.update
  Survey.delete = originalSurveyMethods.delete
  Survey.restore = originalSurveyMethods.restore
  Survey.incrementResponseCount = originalSurveyMethods.incrementResponseCount
  Survey.syncResponseCount = originalSurveyMethods.syncResponseCount
  Survey.softDelete = originalSurveyMethods.softDelete
  Survey.listTrash = originalSurveyMethods.listTrash
  Survey.listTrashIds = originalSurveyMethods.listTrashIds
  Survey.clearTrash = originalSurveyMethods.clearTrash

  Folder.findById = originalFolderMethods.findById
  Folder.list = originalFolderMethods.list
  Folder.create = originalFolderMethods.create
  Folder.update = originalFolderMethods.update
  Folder.delete = originalFolderMethods.delete
  Folder.countChildren = originalFolderMethods.countChildren
  Folder.moveSurveysToRoot = originalFolderMethods.moveSurveysToRoot

  Answer.findById = originalAnswerMethods.findById
  Answer.create = originalAnswerMethods.create
  Answer.count = originalAnswerMethods.count
  Answer.getAggregateState = originalAnswerMethods.getAggregateState
  Answer.countByIp = originalAnswerMethods.countByIp
  Answer.deleteBatch = originalAnswerMethods.deleteBatch
  Answer.deleteBySurveyIds = originalAnswerMethods.deleteBySurveyIds
  Answer.findBySurveyId = originalAnswerMethods.findBySurveyId

  FileModel.create = originalFileMethods.create
  FileModel.findById = originalFileMethods.findById
  FileModel.findByIds = originalFileMethods.findByIds
  FileModel.list = originalFileMethods.list
  FileModel.listByAnswerIds = originalFileMethods.listByAnswerIds
  FileModel.listBySurveyIds = originalFileMethods.listBySurveyIds
  FileModel.listAnswerFilesBySurveyId = originalFileMethods.listAnswerFilesBySurveyId
  FileModel.countPendingBySurveyQuestionSession = originalFileMethods.countPendingBySurveyQuestionSession
  FileModel.attachToAnswer = originalFileMethods.attachToAnswer
  FileModel.listExpiredPending = originalFileMethods.listExpiredPending
  FileModel.listPendingBySubmission = originalFileMethods.listPendingBySubmission
  FileModel.deleteByIds = originalFileMethods.deleteByIds
  FileModel.deleteByAnswerIds = originalFileMethods.deleteByAnswerIds
  FileModel.deleteBySurveyIds = originalFileMethods.deleteBySurveyIds
  FileModel.delete = originalFileMethods.delete

  Position.list = originalPositionMethods.list
  Position.findById = originalPositionMethods.findById
  Position.findByCode = originalPositionMethods.findByCode
  Position.create = originalPositionMethods.create
  Position.update = originalPositionMethods.update
  Position.delete = originalPositionMethods.delete

  Flow.list = originalFlowMethods.list
  Flow.findById = originalFlowMethods.findById
  Flow.create = originalFlowMethods.create
  Flow.update = originalFlowMethods.update
  Flow.delete = originalFlowMethods.delete

  ManagementAiExecution.findByActorAndKey = originalManagementAiExecutionMethods.findByActorAndKey
  ManagementAiExecution.list = originalManagementAiExecutionMethods.list
  ManagementAiExecution.create = originalManagementAiExecutionMethods.create
  ManagementAiExecution.update = originalManagementAiExecutionMethods.update

  QuestionBankRepo.list = originalQuestionBankRepoMethods.list
  QuestionBankRepo.findById = originalQuestionBankRepoMethods.findById
  QuestionBankRepo.create = originalQuestionBankRepoMethods.create
  QuestionBankRepo.update = originalQuestionBankRepoMethods.update
  QuestionBankRepo.delete = originalQuestionBankRepoMethods.delete

  QuestionBankQuestion.findById = originalQuestionBankQuestionMethods.findById
  QuestionBankQuestion.listByRepoId = originalQuestionBankQuestionMethods.listByRepoId
  QuestionBankQuestion.create = originalQuestionBankQuestionMethods.create
  QuestionBankQuestion.delete = originalQuestionBankQuestionMethods.delete
  QuestionBankQuestion.deleteByRepoId = originalQuestionBankQuestionMethods.deleteByRepoId

  Role.list = originalRoleMethods.list
  Role.findById = originalRoleMethods.findById
  Role.findByCode = originalRoleMethods.findByCode
  Role.create = originalRoleMethods.create
  Role.update = originalRoleMethods.update
  Role.delete = originalRoleMethods.delete

  SystemConfig.findByKey = originalSystemConfigMethods.findByKey
  SystemConfig.upsert = originalSystemConfigMethods.upsert

  SurveyResultsSnapshot.findBySurveyId = originalSurveyResultsSnapshotMethods.findBySurveyId
  SurveyResultsSnapshot.upsert = originalSurveyResultsSnapshotMethods.upsert
  SurveyResultsSnapshot.deleteBySurveyId = originalSurveyResultsSnapshotMethods.deleteBySurveyId
  SurveyResultsSnapshot.deleteBySurveyIds = originalSurveyResultsSnapshotMethods.deleteBySurveyIds

  surveyRepository.findById = originalSurveyRepositoryMethods.findById
  surveyRepository.findByShareCode = originalSurveyRepositoryMethods.findByShareCode
  surveyRepository.findByIdentifier = originalSurveyRepositoryMethods.findByIdentifier
  surveyRepository.create = originalSurveyRepositoryMethods.create
  surveyRepository.update = originalSurveyRepositoryMethods.update
  surveyRepository.delete = originalSurveyRepositoryMethods.delete
  surveyRepository.softDelete = originalSurveyRepositoryMethods.softDelete
  surveyRepository.restore = originalSurveyRepositoryMethods.restore
  surveyRepository.incrementResponseCount = originalSurveyRepositoryMethods.incrementResponseCount
  surveyRepository.syncResponseCount = originalSurveyRepositoryMethods.syncResponseCount
  surveyRepository.list = originalSurveyRepositoryMethods.list
  surveyRepository.listTrash = originalSurveyRepositoryMethods.listTrash
  surveyRepository.listTrashIds = originalSurveyRepositoryMethods.listTrashIds
  surveyRepository.clearTrash = originalSurveyRepositoryMethods.clearTrash

  answerRepository.findById = originalAnswerRepositoryMethods.findById
  answerRepository.findByIds = originalAnswerRepositoryMethods.findByIds
  answerRepository.list = originalAnswerRepositoryMethods.list
  answerRepository.countBySurveyId = originalAnswerRepositoryMethods.countBySurveyId
  answerRepository.getAggregateState = originalAnswerRepositoryMethods.getAggregateState
  answerRepository.listBySurveyId = originalAnswerRepositoryMethods.listBySurveyId
  answerRepository.create = originalAnswerRepositoryMethods.create
  answerRepository.countByIp = originalAnswerRepositoryMethods.countByIp
  answerRepository.deleteBatch = originalAnswerRepositoryMethods.deleteBatch
  answerRepository.deleteBySurveyIds = originalAnswerRepositoryMethods.deleteBySurveyIds

  fileRepository.create = originalFileRepositoryMethods.create
  fileRepository.findById = originalFileRepositoryMethods.findById
  fileRepository.findByIds = originalFileRepositoryMethods.findByIds
  fileRepository.list = originalFileRepositoryMethods.list
  fileRepository.listByAnswerIds = originalFileRepositoryMethods.listByAnswerIds
  fileRepository.listBySurveyIds = originalFileRepositoryMethods.listBySurveyIds
  fileRepository.listAnswerFilesBySurveyId = originalFileRepositoryMethods.listAnswerFilesBySurveyId
  fileRepository.countPendingBySurveyQuestionSession = originalFileRepositoryMethods.countPendingBySurveyQuestionSession
  fileRepository.attachToAnswer = originalFileRepositoryMethods.attachToAnswer
  fileRepository.listExpiredPending = originalFileRepositoryMethods.listExpiredPending
  fileRepository.listPendingBySubmission = originalFileRepositoryMethods.listPendingBySubmission
  fileRepository.deleteByIds = originalFileRepositoryMethods.deleteByIds
  fileRepository.deleteByAnswerIds = originalFileRepositoryMethods.deleteByAnswerIds
  fileRepository.deleteBySurveyIds = originalFileRepositoryMethods.deleteBySurveyIds
  fileRepository.delete = originalFileRepositoryMethods.delete

  surveyResultsSnapshotRepository.findBySurveyId = originalSurveyResultsSnapshotRepositoryMethods.findBySurveyId
  surveyResultsSnapshotRepository.upsert = originalSurveyResultsSnapshotRepositoryMethods.upsert
  surveyResultsSnapshotRepository.deleteBySurveyId = originalSurveyResultsSnapshotRepositoryMethods.deleteBySurveyId
  surveyResultsSnapshotRepository.deleteBySurveyIds = originalSurveyResultsSnapshotRepositoryMethods.deleteBySurveyIds

  applyDefaultFileStubs()
}
