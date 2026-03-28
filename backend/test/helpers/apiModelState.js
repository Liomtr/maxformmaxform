import Dept from '../../src/models/Dept.js'
import User from '../../src/models/User.js'
import AuditLog from '../../src/models/AuditLog.js'
import Message from '../../src/models/Message.js'
import Survey from '../../src/models/Survey.js'
import Folder from '../../src/models/Folder.js'
import Answer from '../../src/models/Answer.js'
import FileModel from '../../src/models/File.js'
import Position from '../../src/models/Position.js'
import Role from '../../src/models/Role.js'
import SurveyResultsSnapshot from '../../src/models/SurveyResultsSnapshot.js'
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
  findByUsername: User.findByUsername,
  list: User.list,
  create: User.create,
  update: User.update,
  updatePassword: User.updatePassword,
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
const originalRoleMethods = {
  list: Role.list,
  findById: Role.findById,
  findByCode: Role.findByCode,
  create: Role.create,
  update: Role.update,
  delete: Role.delete
}
const originalSurveyResultsSnapshotMethods = {
  findBySurveyId: SurveyResultsSnapshot.findBySurveyId,
  upsert: SurveyResultsSnapshot.upsert,
  deleteBySurveyId: SurveyResultsSnapshot.deleteBySurveyId,
  deleteBySurveyIds: SurveyResultsSnapshot.deleteBySurveyIds
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
  User.findByUsername = originalUserMethods.findByUsername
  User.list = originalUserMethods.list
  User.create = originalUserMethods.create
  User.update = originalUserMethods.update
  User.updatePassword = originalUserMethods.updatePassword
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

  Role.list = originalRoleMethods.list
  Role.findById = originalRoleMethods.findById
  Role.findByCode = originalRoleMethods.findByCode
  Role.create = originalRoleMethods.create
  Role.update = originalRoleMethods.update
  Role.delete = originalRoleMethods.delete

  SurveyResultsSnapshot.findBySurveyId = originalSurveyResultsSnapshotMethods.findBySurveyId
  SurveyResultsSnapshot.upsert = originalSurveyResultsSnapshotMethods.upsert
  SurveyResultsSnapshot.deleteBySurveyId = originalSurveyResultsSnapshotMethods.deleteBySurveyId
  SurveyResultsSnapshot.deleteBySurveyIds = originalSurveyResultsSnapshotMethods.deleteBySurveyIds

  applyDefaultFileStubs()
}
