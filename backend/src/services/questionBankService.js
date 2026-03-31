import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import questionBankRepository from '../repositories/questionBankRepository.js'
import {
  ensurePlainObjectPayload,
  isPlainObject,
  normalizeOptionalNumber,
  normalizeOptionalStringArray,
  normalizeOptionalTrimmedString,
  normalizeRequiredTrimmedString
} from '../utils/managementPayload.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
import { normalizeServerQuestionType, serverQuestionTypeHasOptions, SUPPORTED_SERVER_TYPES } from '../../../shared/questionTypeRegistry.js'
import {
  createQuestionBankQuestionDto,
  createQuestionBankRepoDto,
  MANAGEMENT_ERROR_CODES
} from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function normalizeRepoName(name, { required = false } = {}) {
  if (name === undefined) {
    if (required) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NAME_REQUIRED, 'Question bank repo name is required')
    }
    return undefined
  }
  return normalizeRequiredTrimmedString(name, {
    field: 'name',
    code: MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NAME_REQUIRED,
    message: 'Question bank repo name is required'
  })
}

function normalizeOptionalText(value) {
  return normalizeOptionalTrimmedString(value, {
    field: 'text',
    allowNull: true,
    emptyToNull: true
  })
}

function normalizeQuestionTitle(title) {
  return normalizeRequiredTrimmedString(title, {
    field: 'title',
    code: MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_TITLE_REQUIRED,
    message: 'Question title is required'
  })
}

function normalizeScore(score) {
  try {
    return normalizeOptionalNumber(score, { field: 'score', allowNull: true })
  } catch (error) {
    if (error?.code === MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_SCORE_INVALID, 'Question score is invalid')
    }
    throw error
  }
}

function cloneJsonValue(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) return value.map(cloneJsonValue).filter(item => item !== undefined)
  if (isPlainObject(value)) {
    return Object.keys(value).reduce((result, key) => {
      const cloned = cloneJsonValue(value[key])
      if (cloned !== undefined) result[key] = cloned
      return result
    }, {})
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) return value
  return String(value)
}

const QUESTION_BANK_TYPE_ALIASES = Object.freeze({
  single: 'radio',
  multiple: 'checkbox',
  text: 'input',
  essay: 'textarea',
  select: 'radio',
  dropdown: 'radio'
})

function normalizeQuestionType(type) {
  const normalized = normalizeOptionalTrimmedString(type, {
    field: 'type',
    allowNull: true,
    emptyToNull: true
  })
  if (normalized == null) return normalized
  const alias = QUESTION_BANK_TYPE_ALIASES[normalized]
  if (alias) return alias
  return SUPPORTED_SERVER_TYPES.includes(normalized) ? normalizeServerQuestionType(normalized) : normalized
}

function normalizeQuestionOption(option, index) {
  if (typeof option === 'string') {
    const label = option.trim()
    if (!label) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, `content.options[${index}] label is required`)
    }
    return {
      label,
      value: String(index + 1)
    }
  }

  if (!isPlainObject(option)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, `content.options[${index}] must be an object or string`)
  }

  const label = String(option.label ?? option.text ?? '').trim()
  if (!label) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, `content.options[${index}] label is required`)
  }

  return {
    ...cloneJsonValue(option),
    label,
    value: String(option.value ?? index + 1)
  }
}

function normalizeQuestionOptions(options) {
  if (options === undefined) return undefined
  if (!Array.isArray(options)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'content.options must be an array')
  }

  return options.map((option, index) => normalizeQuestionOption(option, index))
}

function normalizeOptionalStringList(value, field) {
  if (value === undefined) return undefined
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return normalizeOptionalStringArray(value, { field })
}

function normalizeQuestionContent(content) {
  if (content === undefined) return undefined
  if (content === null) return null
  if (!isPlainObject(content)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'Question content must be an object')
  }

  const normalized = cloneJsonValue(content)
  if (normalized.title !== undefined) {
    normalized.title = normalizeOptionalTrimmedString(normalized.title, {
      field: 'content.title',
      allowNull: false,
      emptyToNull: false
    })
  }
  if (normalized.questionType !== undefined) {
    normalized.questionType = normalizeQuestionType(normalized.questionType)
  }
  if (normalized.stem !== undefined) {
    normalized.stem = normalizeOptionalTrimmedString(normalized.stem, {
      field: 'content.stem',
      allowNull: true,
      emptyToNull: true
    })
  }
  if (normalized.analysis !== undefined) {
    normalized.analysis = normalizeOptionalTrimmedString(normalized.analysis, {
      field: 'content.analysis',
      allowNull: true,
      emptyToNull: true
    })
  }
  if (normalized.difficulty !== undefined) {
    normalized.difficulty = normalizeOptionalTrimmedString(normalized.difficulty, {
      field: 'content.difficulty',
      allowNull: true,
      emptyToNull: true
    })
  }
  if (normalized.score !== undefined) {
    normalized.score = normalizeScore(normalized.score)
  }
  if (normalized.tags !== undefined) {
    normalized.tags = normalizeOptionalStringList(normalized.tags, 'content.tags')
  }
  if (normalized.knowledgePoints !== undefined) {
    normalized.knowledgePoints = normalizeOptionalStringList(normalized.knowledgePoints, 'content.knowledgePoints')
  }
  if (normalized.applicableScenes !== undefined) {
    normalized.applicableScenes = normalizeOptionalStringList(normalized.applicableScenes, 'content.applicableScenes')
  }
  if (normalized.options !== undefined) {
    normalized.options = normalizeQuestionOptions(normalized.options)
  }
  if (normalized.surveyQuestion !== undefined && normalized.surveyQuestion !== null && !isPlainObject(normalized.surveyQuestion)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'content.surveyQuestion must be an object')
  }
  if (normalized.aiMeta !== undefined && normalized.aiMeta !== null && !isPlainObject(normalized.aiMeta)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'content.aiMeta must be an object')
  }

  return normalized
}

async function getRepoOrThrow(repoId, options = {}) {
  const repo = await questionBankRepository.findRepoById(repoId, options)
  if (!repo) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NOT_FOUND, 'Question bank repo not found')
  }
  return repo
}

async function getQuestionOrThrow(repoId, questionId, options = {}) {
  const question = await questionBankRepository.findQuestionById(questionId, repoId, options)
  if (!question) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_NOT_FOUND, 'Question bank question not found')
  }
  return question
}

export async function listManagedQuestionBankRepos({ actor }) {
  ensureAdmin(actor)
  const repos = await questionBankRepository.listRepos()
  return repos.map(item => createQuestionBankRepoDto(item))
}

export async function createManagedQuestionBankRepo({ actor, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)

  return runManagementTransaction(async db => {
    const repo = await questionBankRepository.createRepo({
      name: normalizeRepoName(body.name, { required: true }),
      description: normalizeOptionalText(body.description)
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.create',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Created question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo created',
        content: `Question bank repo "${repo.name}" was created.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })

    return createQuestionBankRepoDto(repo)
  })
}

export async function updateManagedQuestionBankRepo({ actor, repoId, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)
  return runManagementTransaction(async db => {
    await getRepoOrThrow(repoId, { db })

    const repo = await questionBankRepository.updateRepo(repoId, {
      name: normalizeRepoName(body.name),
      description: normalizeOptionalText(body.description)
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.update',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Updated question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo updated',
        content: `Question bank repo "${repo.name}" was updated.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })

    return createQuestionBankRepoDto(repo)
  })
}

export async function deleteManagedQuestionBankRepo({ actor, repoId }) {
  ensureAdmin(actor)
  await runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db })
    await questionBankRepository.deleteRepo(repoId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.delete',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Deleted question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo deleted',
        content: `Question bank repo "${repo.name}" was deleted.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })
  })
}

export async function listManagedQuestionBankQuestions({ actor, repoId }) {
  ensureAdmin(actor)
  await getRepoOrThrow(repoId)
  const questions = await questionBankRepository.listQuestions(repoId)
  return questions.map(item => createQuestionBankQuestionDto(item))
}

export async function createManagedQuestionBankQuestion({ actor, repoId, body = {} }) {
  ensureAdmin(actor)
  body = ensurePlainObjectPayload(body)
  return runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db })
    const normalizedContent = normalizeQuestionContent(body.content)
    const normalizedType = normalizeQuestionType(body.type ?? normalizedContent?.questionType)
    const normalizedOptions = normalizeQuestionOptions(body.options ?? normalizedContent?.options)
    const normalizedStem = normalizeOptionalTrimmedString(body.stem ?? normalizedContent?.stem, {
      field: 'stem',
      allowNull: true,
      emptyToNull: true
    })
    const normalizedAnalysis = normalizeOptionalTrimmedString(body.analysis ?? normalizedContent?.analysis, {
      field: 'analysis',
      allowNull: true,
      emptyToNull: true
    })
    const normalizedTags = normalizeOptionalStringList(body.tags ?? normalizedContent?.tags, 'tags')
    const normalizedKnowledgePoints = normalizeOptionalStringList(body.knowledgePoints ?? normalizedContent?.knowledgePoints, 'knowledgePoints')
    const normalizedApplicableScenes = normalizeOptionalStringList(body.applicableScenes ?? normalizedContent?.applicableScenes, 'applicableScenes')
    const normalizedCorrectAnswer = body.correctAnswer !== undefined ? cloneJsonValue(body.correctAnswer) : normalizedContent?.correctAnswer
    const normalizedSurveyQuestion = body.surveyQuestion !== undefined ? cloneJsonValue(body.surveyQuestion) : normalizedContent?.surveyQuestion
    const normalizedAiMeta = body.aiMeta !== undefined ? cloneJsonValue(body.aiMeta) : normalizedContent?.aiMeta

    if (normalizedSurveyQuestion !== undefined && normalizedSurveyQuestion !== null && !isPlainObject(normalizedSurveyQuestion)) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'surveyQuestion must be an object')
    }
    if (normalizedAiMeta !== undefined && normalizedAiMeta !== null && !isPlainObject(normalizedAiMeta)) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'aiMeta must be an object')
    }
    if (serverQuestionTypeHasOptions(normalizedType) && (!Array.isArray(normalizedOptions) || normalizedOptions.length < 2)) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'Option questions require at least 2 options')
    }

    const resolvedTitle = body.title ?? normalizedContent?.title
    const resolvedDifficulty = body.difficulty ?? normalizedContent?.difficulty
    const resolvedScore = body.score ?? normalizedContent?.score

    const mergedContent = {
      ...(normalizedContent || {}),
      title: body.title ?? normalizedContent?.title,
      questionType: normalizedType ?? normalizedContent?.questionType,
      stem: normalizedStem,
      options: normalizedOptions,
      correctAnswer: normalizedCorrectAnswer,
      analysis: normalizedAnalysis,
      tags: normalizedTags,
      knowledgePoints: normalizedKnowledgePoints,
      applicableScenes: normalizedApplicableScenes,
      difficulty: normalizeOptionalTrimmedString(resolvedDifficulty, {
        field: 'difficulty',
        allowNull: true,
        emptyToNull: true
      }),
      score: normalizeScore(resolvedScore),
      surveyQuestion: normalizedSurveyQuestion,
      aiMeta: normalizedAiMeta
    }
    Object.keys(mergedContent).forEach(key => {
      if (mergedContent[key] === undefined) delete mergedContent[key]
    })

    const question = await questionBankRepository.createQuestion({
      repo_id: Number(repoId),
      title: normalizeQuestionTitle(resolvedTitle),
      type: normalizedType,
      difficulty: normalizeOptionalTrimmedString(resolvedDifficulty, {
        field: 'difficulty',
        allowNull: true,
        emptyToNull: true
      }),
      score: normalizeScore(resolvedScore),
      content: Object.keys(mergedContent).length > 0 ? mergedContent : null
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.question.create',
        targetType: 'question_bank_question',
        targetId: question.id,
        detail: `Created question "${question.title}" in repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question created',
        content: `Question "${question.title}" was added to "${repo.name}".`,
        entityType: 'question_bank_question',
        entityId: question.id
      }
    }, { db })

    return createQuestionBankQuestionDto(question)
  })
}

export async function deleteManagedQuestionBankQuestion({ actor, repoId, questionId }) {
  ensureAdmin(actor)
  await runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db })
    const question = await getQuestionOrThrow(repoId, questionId, { db })
    await questionBankRepository.deleteQuestion(questionId, repoId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.question.delete',
        targetType: 'question_bank_question',
        targetId: question.id,
        detail: `Deleted question "${question.title}" from repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question deleted',
        content: `Question "${question.title}" was removed from "${repo.name}".`,
        entityType: 'question_bank_question',
        entityId: question.id
      }
    }, { db })
  })
}
