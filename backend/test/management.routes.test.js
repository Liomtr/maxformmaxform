import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import config from '../src/config/index.js'
import AuditLog from '../src/models/AuditLog.js'
import Folder from '../src/models/Folder.js'
import Message from '../src/models/Message.js'
import Flow from '../src/models/Flow.js'
import QuestionBankRepo from '../src/models/QuestionBankRepo.js'
import QuestionBankQuestion from '../src/models/QuestionBankQuestion.js'
import Role from '../src/models/Role.js'
import User from '../src/models/User.js'
import transactionManager from '../src/db/transaction.js'
import { registerApiRouteHarness } from './helpers/apiRouteHarness.js'

const { request, requestPublic } = registerApiRouteHarness()

function createToken(payload = {}) {
  return jwt.sign(
    { sub: 2, username: 'user', roleCode: 'user', ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

test('GET /api/audits lists audit records through the service flow', async () => {
  let listPayload = null

  AuditLog.list = async payload => {
    listPayload = payload
    return {
      total: 2,
      list: [{ id: 1, action: 'survey.create' }, { id: 2, action: 'user.delete' }]
    }
  }

  const { response, json } = await request('/audits?page=2&pageSize=5&username=alice&action=survey&targetType=user')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 2)
  assert.equal(json.data.page, 2)
  assert.equal(json.data.pageSize, 5)
  assert.deepEqual(json.data.list, [
    {
      id: 1,
      actorId: null,
      actor: '-',
      username: '',
      action: 'survey.create',
      targetType: '',
      targetId: '',
      detail: '',
      time: null
    },
    {
      id: 2,
      actorId: null,
      actor: '-',
      username: '',
      action: 'user.delete',
      targetType: '',
      targetId: '',
      detail: '',
      time: null
    }
  ])
  assert.deepEqual(listPayload, {
    page: 2,
    pageSize: 5,
    username: 'alice',
    action: 'survey',
    targetType: 'user'
  })
})

test('GET /api/audits rejects non-admin actors through the policy flow', async () => {
  const { response, json } = await requestPublic('/audits', {
    headers: { Authorization: `Bearer ${createToken()}` }
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
})

test('GET /api/audits rejects invalid pagination query structure', async () => {
  const { response, json } = await request('/audits?page=oops')

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /page must be a positive integer/i)
})

test('GET /api/messages normalizes unread and types filters through the service flow', async () => {
  let listPayload = null

  Message.list = async payload => {
    listPayload = payload
    return {
      total: 1,
      list: [{ id: 5, title: 'Inbox item' }]
    }
  }

  const { response, json } = await request('/messages?page=3&pageSize=10&unread=1&types=audit,system')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, {
    total: 1,
    page: 3,
    pageSize: 10,
    list: [{
      id: 5,
      title: 'Inbox item',
      entityId: null,
      read: false,
      readAt: null,
      createdAt: null
    }]
  })
  assert.deepEqual(listPayload, {
    recipient_id: 1,
    page: 3,
    pageSize: 10,
    unread: true,
    types: ['audit', 'system']
  })
})

test('GET /api/messages rejects invalid unread query structure', async () => {
  const { response, json } = await request('/messages?unread=maybe')

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /unread must be a boolean/i)
})

test('POST /api/messages/:id/read returns not found when the message is missing', async () => {
  Message.markRead = async () => null

  const { response, json } = await request('/messages/18/read', { method: 'POST' })

  assert.equal(response.status, 404)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_MESSAGE_NOT_FOUND')
})

test('POST /api/messages/:id/read rejects invalid message id structure', async () => {
  const { response, json } = await request('/messages/abc/read', { method: 'POST' })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /id must be an integer/i)
})

test('POST /api/folders creates folders through the service flow after parent validation', async () => {
  let createPayload = null
  let auditPayload = null
  let messagePayload = null

  Folder.findById = async (id, creatorId) => {
    if (Number(id) === 5 && Number(creatorId) === 1) {
      return { id: 5, creator_id: 1, name: 'Parent', parentId: null }
    }
    return null
  }
  Folder.create = async payload => {
    createPayload = payload
    return { id: 9, ...payload, parentId: payload.parent_id ?? null, surveyCount: 0 }
  }
  AuditLog.create = async payload => {
    auditPayload = payload
    return { id: 1 }
  }
  Message.create = async payload => {
    messagePayload = payload
    return { id: 1 }
  }

  const { response, json } = await request('/folders', {
    method: 'POST',
    body: { name: 'Child', parentId: 5 }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 9)
  assert.deepEqual(createPayload, {
    creator_id: 1,
    name: 'Child',
    parent_id: 5
  })
  assert.equal(auditPayload.action, 'folder.create')
  assert.equal(messagePayload.title, 'Folder created')
})

test('PUT /api/folders/:id rejects assigning a folder as its own parent', async () => {
  Folder.findById = async () => ({ id: 7, creator_id: 1, name: 'Self', parentId: null })

  const { response, json } = await request('/folders/7', {
    method: 'PUT',
    body: { parentId: 7 }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_FOLDER_SELF_PARENT')
})

test('POST /api/roles rejects duplicate role codes through the service flow', async () => {
  Role.findByCode = async code => (code === 'admin' ? { id: 1, code } : null)

  const { response, json } = await request('/roles', {
    method: 'POST',
    body: { name: 'Admin Copy', code: 'admin' }
  })

  assert.equal(response.status, 409)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ROLE_EXISTS')
})

test('POST /api/roles writes audit and message records inside the transaction flow', async () => {
  let transactionCount = 0
  let createdPayload = null
  let auditPayload = null
  let messagePayload = null
  const originalRun = transactionManager.run

  transactionManager.run = async callback => {
    transactionCount += 1
    return callback({})
  }

  Role.findByCode = async () => null
  Role.create = async payload => {
    createdPayload = payload
    return { id: 6, ...payload }
  }
  AuditLog.create = async payload => {
    auditPayload = payload
    return { id: 1 }
  }
  Message.create = async payload => {
    messagePayload = payload
    return { id: 2 }
  }

  try {
    const { response, json } = await request('/roles', {
      method: 'POST',
      body: { name: 'Auditor', code: 'auditor', permissions: ['audit.read'] }
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(transactionCount, 1)
    assert.deepEqual(createdPayload, {
      name: 'Auditor',
      code: 'auditor',
      permissions: ['audit.read'],
      remark: undefined
    })
    assert.equal(auditPayload.action, 'role.create')
    assert.equal(auditPayload.target_type, 'role')
    assert.equal(messagePayload.title, 'Role created')
    assert.equal(messagePayload.recipient_id, 1)
  } finally {
    transactionManager.run = originalRun
  }
})

test('GET /api/flows lists flow records through the service flow', async () => {
  Flow.list = async () => [
    { id: 1, name: 'Publish approval', status: 'active', description: 'check', created_at: '2026-03-20T00:00:00.000Z' }
  ]

  const { response, json } = await request('/flows')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, [{
    id: 1,
    name: 'Publish approval',
    status: 'active',
    description: 'check',
    created_at: '2026-03-20T00:00:00.000Z',
    createdAt: '2026-03-20T00:00:00.000Z'
  }])
})

test('POST /api/flows rejects invalid flow status', async () => {
  const { response, json } = await request('/flows', {
    method: 'POST',
    body: { name: 'Broken flow', status: 'paused' }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_FLOW_STATUS_INVALID')
})

test('POST /api/flows rejects invalid payload structure for name', async () => {
  const { response, json } = await request('/flows', {
    method: 'POST',
    body: { name: { text: 'Broken flow' }, status: 'draft' }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /name must be a string/i)
})

test('POST /api/flows writes audit and message records for admin actions', async () => {
  let auditPayload = null
  let messagePayload = null

  Flow.create = async payload => ({
    id: 3,
    ...payload,
    created_at: '2026-03-29T00:00:00.000Z'
  })
  AuditLog.create = async payload => {
    auditPayload = payload
    return { id: 1 }
  }
  Message.create = async payload => {
    messagePayload = payload
    return { id: 2 }
  }

  const { response, json } = await request('/flows', {
    method: 'POST',
    body: { name: 'Security review', status: 'active', description: '2-step' }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.name, 'Security review')
  assert.equal(auditPayload.action, 'flow.create')
  assert.equal(messagePayload.title, 'Flow created')
})

test('GET /api/repos lists question bank repos through the service flow', async () => {
  QuestionBankRepo.list = async () => [
    {
      id: 3,
      name: 'Common bank',
      description: 'seeded',
      question_count: 4,
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-22T00:00:00.000Z'
    }
  ]

  const { response, json } = await request('/repos')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, [{
    id: 3,
    name: 'Common bank',
    description: 'seeded',
    question_count: 4,
    questionCount: 4,
    created_at: '2026-03-21T00:00:00.000Z',
    updated_at: '2026-03-22T00:00:00.000Z',
    createdAt: '2026-03-21T00:00:00.000Z',
    updatedAt: '2026-03-22T00:00:00.000Z'
  }])
})

test('GET /api/repos rejects non-admin actors from reading question bank repos', async () => {
  QuestionBankRepo.list = async () => [
    { id: 7, name: 'Shared bank', question_count: 2 }
  ]

  const { response, json } = await requestPublic('/repos', {
    headers: { Authorization: `Bearer ${createToken()}` }
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
})

test('POST /api/repos rejects invalid payload structure for repo name', async () => {
  const { response, json } = await request('/repos', {
    method: 'POST',
    body: { name: { text: 'Repo 1' } }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /name must be a string/i)
})

test('GET /api/repos/:id/questions rejects invalid repo id structure', async () => {
  const { response, json } = await request('/repos/abc/questions')

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /id must be an integer/i)
})

test('GET /api/repos/:id/questions rejects non-admin actors from reading question bank questions', async () => {
  QuestionBankRepo.findById = async id => ({ id: Number(id), name: 'Shared bank', question_count: 1 })
  QuestionBankQuestion.listByRepoId = async repoId => [{
    id: 32,
    repo_id: Number(repoId),
    title: 'Shared question',
    type: 'radio',
    content: {
      stem: 'Pick one shared option',
      options: [
        { label: 'A', value: '1' },
        { label: 'B', value: '2' }
      ]
    }
  }]

  const { response, json } = await requestPublic('/repos/6/questions', {
    headers: { Authorization: `Bearer ${createToken()}` }
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
})

test('GET /api/repos/:id/questions returns structured stem and options fields', async () => {
  QuestionBankRepo.findById = async id => ({ id: Number(id), name: 'Common bank', question_count: 1 })
  QuestionBankQuestion.listByRepoId = async repoId => [{
    id: 18,
    repo_id: Number(repoId),
    title: 'How often do you log in?',
    type: 'radio',
    score: 5,
    content: {
      title: 'How often do you log in?',
      questionType: 'radio',
      stem: 'Select the option that best matches your login frequency.',
      options: [
        { label: 'Daily', value: '1' },
        { label: 'Weekly', value: '2' }
      ]
    },
    created_at: '2026-03-29T00:00:00.000Z',
    updated_at: '2026-03-29T00:00:00.000Z'
  }]

  const { response, json } = await request('/repos/9/questions')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data, [{
    id: 18,
    repo_id: 9,
    repoId: 9,
    title: 'How often do you log in?',
    type: 'radio',
    score: 5,
    stem: 'Select the option that best matches your login frequency.',
    options: [
      { label: 'Daily', value: '1' },
      { label: 'Weekly', value: '2' }
    ],
    content: {
      title: 'How often do you log in?',
      questionType: 'radio',
      stem: 'Select the option that best matches your login frequency.',
      options: [
        { label: 'Daily', value: '1' },
        { label: 'Weekly', value: '2' }
      ],
      score: 5
    },
    created_at: '2026-03-29T00:00:00.000Z',
    updated_at: '2026-03-29T00:00:00.000Z',
    createdAt: '2026-03-29T00:00:00.000Z',
    updatedAt: '2026-03-29T00:00:00.000Z'
  }])
})

test('POST /api/repos/:id/questions validates repo existence before creating a question', async () => {
  QuestionBankRepo.findById = async () => null

  const { response, json } = await request('/repos/9/questions', {
    method: 'POST',
    body: { title: 'What is your role?' }
  })

  assert.equal(response.status, 404)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_QUESTION_BANK_REPO_NOT_FOUND')
})

test('POST /api/repos/:id/questions rejects invalid question payload structure', async () => {
  QuestionBankRepo.findById = async id => ({ id: Number(id), name: 'Common bank', question_count: 0 })

  const { response, json } = await request('/repos/9/questions', {
    method: 'POST',
    body: { title: 'Question 1', score: { value: 5 } }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_QUESTION_BANK_QUESTION_SCORE_INVALID')
})

test('POST /api/repos/:id/questions rejects invalid question content payload structure', async () => {
  QuestionBankRepo.findById = async id => ({ id: Number(id), name: 'Common bank', question_count: 0 })

  const { response, json } = await request('/repos/9/questions', {
    method: 'POST',
    body: {
      title: 'Question 1',
      content: [{ stem: 'invalid' }]
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_QUESTION_BANK_QUESTION_CONTENT_INVALID')
  assert.match(json.error.message, /content must be an object/i)
})

test('POST /api/repos/:id/questions rejects option questions without enough options', async () => {
  QuestionBankRepo.findById = async id => ({ id: Number(id), name: 'Common bank', question_count: 0 })

  const { response, json } = await request('/repos/9/questions', {
    method: 'POST',
    body: {
      title: 'Question 1',
      type: 'radio',
      stem: 'Pick one',
      options: ['Only option']
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_QUESTION_BANK_QUESTION_CONTENT_INVALID')
  assert.match(json.error.message, /at least 2 options/i)
})

test('POST /api/folders rejects invalid payload structure for parentId', async () => {
  const { response, json } = await request('/folders', {
    method: 'POST',
    body: { name: 'Child', parentId: { id: 5 } }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /parentid must be an integer/i)
})

test('POST /api/roles rejects invalid permissions payload structure', async () => {
  const { response, json } = await request('/roles', {
    method: 'POST',
    body: { name: 'Reviewer', code: 'reviewer', permissions: { audit: true } }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /permissions must be an array of strings/i)
})

test('POST /api/repos/:id/questions writes audit and message records after creating a question', async () => {
  let auditPayload = null
  let messagePayload = null
  let createPayload = null

  QuestionBankRepo.findById = async id => ({ id: Number(id), name: 'Common bank', question_count: 0 })
  QuestionBankQuestion.create = async payload => {
    createPayload = payload
    return {
      id: 21,
      ...payload,
      title: payload.title,
      created_at: '2026-03-29T00:00:00.000Z',
      updated_at: '2026-03-29T00:00:00.000Z'
    }
  }
  AuditLog.create = async payload => {
    auditPayload = payload
    return { id: 1 }
  }
  Message.create = async payload => {
    messagePayload = payload
    return { id: 2 }
  }

  const { response, json } = await request('/repos/4/questions', {
    method: 'POST',
    body: {
      title: 'How often do you log in?',
      type: 'single',
      stem: 'Select the option that best matches your login frequency.',
      options: ['Daily', 'Weekly'],
      score: 5,
      content: {
        tags: ['usage', 'frequency'],
        applicableScenes: ['onboarding', 'engagement'],
        aiMeta: {
          generatedBy: 'gpt-5.2',
          reviewStatus: 'draft'
        }
      }
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.id, 21)
  assert.equal(createPayload.type, 'radio')
  assert.deepEqual(createPayload.content, {
    title: 'How often do you log in?',
    questionType: 'radio',
    stem: 'Select the option that best matches your login frequency.',
    options: [
      { label: 'Daily', value: '1' },
      { label: 'Weekly', value: '2' }
    ],
    score: 5,
    tags: ['usage', 'frequency'],
    applicableScenes: ['onboarding', 'engagement'],
    aiMeta: {
      generatedBy: 'gpt-5.2',
      reviewStatus: 'draft'
    }
  })
  assert.equal(json.data.stem, 'Select the option that best matches your login frequency.')
  assert.equal(json.data.options.length, 2)
  assert.equal(json.data.content.stem, 'Select the option that best matches your login frequency.')
  assert.equal(json.data.content.questionType, 'radio')
  assert.equal(json.data.content.score, 5)
  assert.equal(auditPayload.action, 'question_bank.question.create')
  assert.equal(messagePayload.title, 'Question created')
  assert.equal(messagePayload.entity_id, 21)
})

test('DELETE /api/repos/:id/questions/:questionId deletes a nested question through the service flow', async () => {
  let deletedArgs = null

  QuestionBankRepo.findById = async id => ({ id: Number(id), name: 'Repo 1', question_count: 1 })
  QuestionBankQuestion.findById = async (id, repoId) => ({ id: Number(id), repo_id: Number(repoId), title: 'Question 1' })
  AuditLog.create = async () => ({ id: 1 })
  Message.create = async () => ({ id: 2 })
  QuestionBankQuestion.delete = async (id, repoId) => {
    deletedArgs = { id: Number(id), repoId: Number(repoId) }
    return 1
  }

  const { response, json } = await request('/repos/4/questions/11', { method: 'DELETE' })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(deletedArgs, { id: 11, repoId: 4 })
})

test('GET /api/users/:id falls back to username lookup through the service flow', async () => {
  User.findById = async () => null
  User.findByUsername = async username => (
    username === 'alice'
      ? { id: 12, username: 'alice', email: 'alice@example.com', password: 'secret' }
      : null
  )

  const { response, json } = await request('/users/alice')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.username, 'alice')
  assert.equal(json.data.password, undefined)
})
