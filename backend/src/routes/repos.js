import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedQuestionBankQuestion,
  createManagedQuestionBankRepo,
  deleteManagedQuestionBankQuestion,
  deleteManagedQuestionBankRepo,
  listManagedQuestionBankQuestions,
  listManagedQuestionBankRepos,
  updateManagedQuestionBankRepo
} from '../services/questionBankService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedQuestionBankRepos({ actor: req.user })
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const repo = await createManagedQuestionBankRepo({ actor: req.user, body: req.body })
  res.json({ success: true, data: repo })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const repo = await updateManagedQuestionBankRepo({ actor: req.user, repoId, body: req.body })
  res.json({ success: true, data: repo })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await deleteManagedQuestionBankRepo({ actor: req.user, repoId })
  res.json({ success: true })
}))

router.get('/:id/questions', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const list = await listManagedQuestionBankQuestions({ actor: req.user, repoId })
  res.json({ success: true, data: list })
}))

router.post('/:id/questions', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const question = await createManagedQuestionBankQuestion({ actor: req.user, repoId, body: req.body })
  res.json({ success: true, data: question })
}))

router.delete('/:id/questions/:questionId', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const questionId = normalizeRequiredIntegerParam(req.params.questionId, 'questionId', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await deleteManagedQuestionBankQuestion({
    actor: req.user,
    repoId,
    questionId
  })
  res.json({ success: true })
}))

export default router
