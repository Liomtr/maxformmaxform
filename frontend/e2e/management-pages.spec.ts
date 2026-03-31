import { expect, test, type APIRequestContext, type Page } from 'playwright/test'

const backendBaseUrl = process.env.PLAYWRIGHT_BACKEND_URL || 'http://127.0.0.1:63002'

function uniqueValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  }
}

async function readJson<T>(response: import('playwright/test').APIResponse): Promise<T> {
  return await response.json()
}

async function registerUser(request: APIRequestContext) {
  const suffix = uniqueValue('e2e-user')
  const username = suffix
  const password = `E2ePass!${suffix}`
  const email = `${suffix}@example.com`

  const response = await request.post(`${backendBaseUrl}/api/auth/register`, {
    data: { username, password, email }
  })
  expect(response.ok()).toBeTruthy()

  const body = await readJson<{ data: { token: string } }>(response)
  return {
    username,
    password,
    token: body.data.token
  }
}

async function loginUser(request: APIRequestContext, username: string, password: string) {
  const response = await request.post(`${backendBaseUrl}/api/auth/login`, {
    data: { username, password }
  })
  expect(response.ok()).toBeTruthy()

  const body = await readJson<{ data: { token: string } }>(response)
  return {
    username,
    token: body.data.token
  }
}

async function withAuth(page: Page, token: string) {
  await page.addInitScript(value => {
    window.localStorage.setItem('token', value)
  }, token)
}

async function createFlow(
  request: APIRequestContext,
  token: string,
  payload: { name: string; status?: string; description?: string }
) {
  const response = await request.post(`${backendBaseUrl}/api/flows`, {
    headers: authHeaders(token),
    data: payload
  })
  expect(response.ok()).toBeTruthy()

  const body = await readJson<{ data: { id: number; name: string; status?: string } }>(response)
  return body.data
}

async function createSurvey(request: APIRequestContext, token: string, payload: Record<string, unknown>) {
  const response = await request.post(`${backendBaseUrl}/api/surveys`, {
    headers: authHeaders(token),
    data: payload
  })
  expect(response.ok()).toBeTruthy()

  const body = await readJson<{ data: { id: number; title: string } }>(response)
  return body.data
}

async function publishSurvey(request: APIRequestContext, token: string, surveyId: number) {
  const response = await request.post(`${backendBaseUrl}/api/surveys/${surveyId}/publish`, {
    headers: authHeaders(token)
  })
  expect(response.ok()).toBeTruthy()
}

async function moveSurveyToFolder(
  request: APIRequestContext,
  token: string,
  surveyId: number,
  folderId: number | null
) {
  const response = await request.put(`${backendBaseUrl}/api/surveys/${surveyId}/folder`, {
    headers: authHeaders(token),
    data: { folder_id: folderId }
  })
  expect(response.ok()).toBeTruthy()
}

async function uploadManagedFile(request: APIRequestContext, token: string, filename: string) {
  const response = await request.post(`${backendBaseUrl}/api/files/upload`, {
    headers: authHeaders(token),
    multipart: {
      file: {
        name: filename,
        mimeType: 'application/pdf',
        buffer: Buffer.from(`managed file ${filename}`)
      }
    }
  })
  expect(response.ok()).toBeTruthy()

  const body = await readJson<{ data: { id: number; name: string } }>(response)
  return body.data
}

async function uploadSurveyAttachment(
  request: APIRequestContext,
  surveyId: number,
  submissionToken: string,
  filename: string
) {
  const response = await request.post(`${backendBaseUrl}/api/surveys/${surveyId}/uploads`, {
    multipart: {
      file: {
        name: filename,
        mimeType: 'application/pdf',
        buffer: Buffer.from(`survey attachment ${filename}`)
      },
      questionId: '1',
      submissionToken
    }
  })
  expect(response.ok()).toBeTruthy()

  const body = await readJson<{ data: { id: number; uploadToken: string } }>(response)
  return body.data
}

async function submitSurveyResponse(
  request: APIRequestContext,
  surveyId: number,
  payload: { clientSubmissionToken: string; answers: unknown[]; duration?: number }
) {
  const response = await request.post(`${backendBaseUrl}/api/surveys/${surveyId}/responses`, {
    data: payload
  })
  expect(response.ok()).toBeTruthy()
}

async function listMessages(request: APIRequestContext, token: string) {
  const response = await request.get(`${backendBaseUrl}/api/messages`, {
    headers: authHeaders(token)
  })
  expect(response.ok()).toBeTruthy()

  const body = await readJson<{ data: { list: Array<{ id: number; title: string; content?: string; read: boolean }> } }>(response)
  return body.data.list
}

async function listFolders(request: APIRequestContext, token: string) {
  const response = await request.get(`${backendBaseUrl}/api/folders/all`, {
    headers: authHeaders(token)
  })
  expect(response.ok()).toBeTruthy()

  const body = await readJson<{ data: Array<{ id: number; name: string }> }>(response)
  return body.data
}

test.describe('Management Coverage Browser E2E', () => {
  test('guest users are redirected to login for management and answer routes', async ({ page }) => {
    const protectedPaths = [
      '/admin/flows',
      '/admin/repos',
      '/admin/messages',
      '/admin/files',
      '/surveys/answers',
      '/user-dashboard'
    ]

    for (const path of protectedPaths) {
      await page.goto(path)
      await page.waitForURL(/\/login\?redirect=/)

      const url = new URL(page.url())
      expect(decodeURIComponent(url.searchParams.get('redirect') || '')).toBe(path)
    }
  })

  test('non-admin users are redirected to forbidden for admin routes but can access their own dashboard', async ({ page, request }) => {
    const user = await registerUser(request)
    await withAuth(page, user.token)

    for (const path of ['/admin/flows', '/admin/repos', '/admin/messages', '/admin/files']) {
      await page.goto(path)
      await page.waitForURL('**/403')
      await expect(page.getByTestId('forbidden-page')).toBeVisible()
    }

    await page.goto('/user-dashboard')
    await expect(page.getByTestId('user-dashboard-page')).toBeVisible()
  })

  test('admin users can open flow management and view backend flow records', async ({ page, request }) => {
    const admin = await loginUser(request, 'admin', '123456')
    const activeFlow = await createFlow(request, admin.token, {
      name: uniqueValue('e2e-flow-active'),
      status: 'active',
      description: 'Flow coverage active'
    })
    const draftFlow = await createFlow(request, admin.token, {
      name: uniqueValue('e2e-flow-draft'),
      status: 'draft',
      description: 'Flow coverage draft'
    })

    await withAuth(page, admin.token)
    await page.goto('/admin/flows')

    await expect(page.getByTestId('admin-flows-page')).toBeVisible()
    await expect(page.getByTestId(`flow-name-${activeFlow.id}`)).toHaveText(activeFlow.name)
    await expect(page.getByTestId(`flow-status-${activeFlow.id}`)).toHaveText('active')
    await expect(page.getByTestId(`flow-name-${draftFlow.id}`)).toHaveText(draftFlow.name)
    await expect(page.getByTestId(`flow-status-${draftFlow.id}`)).toHaveText('draft')
    await expect(page.getByTestId(`flow-view-button-${activeFlow.id}`)).toBeVisible()
    await expect(page.getByTestId(`flow-disable-button-${activeFlow.id}`)).toBeVisible()
  })

  test('admin users can create and delete repos and nested questions from the browser', async ({ page, request }) => {
    const admin = await loginUser(request, 'admin', '123456')
    const repoName = uniqueValue('e2e-repo')
    const questionTitle = uniqueValue('e2e-question')
    const questionStem = '请选择最符合你当前登录频率的一项。'
    const optionLabels = ['每天', '每周']

    await withAuth(page, admin.token)
    await page.goto('/admin/repos')

    await expect(page.getByTestId('admin-repos-page')).toBeVisible()
    await page.getByTestId('repo-name-input').fill(repoName)
    await page.getByTestId('repo-create-button').click()

    const repoRow = page.locator('.el-table__row', { hasText: repoName }).first()
    await expect(repoRow).toBeVisible()
    await repoRow.click()

    const drawer = page.getByTestId('repo-questions-drawer')
    await expect(drawer).toBeVisible()
    await page.getByTestId('repo-question-title-input').fill(questionTitle)
    await page.getByTestId('repo-question-stem-input').fill(questionStem)
    await page.getByTestId('repo-question-options-input').fill(optionLabels.join('\n'))
    await page.getByTestId('repo-question-add-button').click()

    const questionRow = page.locator('.el-drawer .el-table__row', { hasText: questionTitle }).first()
    await expect(questionRow).toBeVisible()
    await expect(questionRow.locator('[data-testid^="repo-question-type-"]')).toHaveText('radio')
    await expect(questionRow.locator('[data-testid^="repo-question-stem-"]')).toContainText(questionStem)
    await expect(questionRow.locator('[data-testid^="repo-question-option-count-"]')).toHaveText('2 项')
    await expect(questionRow.locator('[data-testid^="repo-question-option-preview-"]')).toContainText(optionLabels[0])
    await expect(questionRow.locator('[data-testid^="repo-question-option-preview-"]')).toContainText(optionLabels[1])

    await questionRow.locator('[data-testid^="repo-question-delete-button-"]').click()
    await expect(page.locator('.el-drawer .el-table__row', { hasText: questionTitle })).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()

    await repoRow.locator('[data-testid^="repo-delete-button-"]').click()
    await expect(page.locator('.el-table__row', { hasText: repoName })).toHaveCount(0)
  })

  test('admin users can read management audit messages from the message center', async ({ page, request }) => {
    const admin = await loginUser(request, 'admin', '123456')
    const flow = await createFlow(request, admin.token, {
      name: uniqueValue('e2e-message-flow'),
      status: 'active'
    })
    const targetMessage = (await listMessages(request, admin.token))
      .find(item => item.content?.includes(flow.name))

    expect(targetMessage?.id).toBeTruthy()

    await withAuth(page, admin.token)
    await page.goto('/admin/messages')

    await expect(page.getByTestId('admin-messages-page')).toBeVisible()

    const messageRow = page.locator('.el-table__row', { hasText: String(targetMessage!.id) }).first()
    await expect(messageRow).toBeVisible()

    const markReadResponse = page.waitForResponse(response =>
      response.url().includes('/api/messages/') &&
      response.url().endsWith('/read') &&
      response.request().method() === 'POST'
    )
    await messageRow.locator('[data-testid^="message-read-button-"]').click()
    expect((await markReadResponse).ok()).toBeTruthy()

    const messages = await listMessages(request, admin.token)
    expect(messages.find(item => item.id === targetMessage!.id)?.read).toBeTruthy()
  })

  test('file management honors delete permissions and lets admins remove uploaded files from the browser', async ({ page, request }) => {
    const owner = await registerUser(request)
    const intruder = await registerUser(request)
    const admin = await loginUser(request, 'admin', '123456')
    const fileName = `${uniqueValue('e2e-file')}.pdf`
    const uploadedFile = await uploadManagedFile(request, owner.token, fileName)

    const forbiddenDelete = await request.delete(`${backendBaseUrl}/api/files/${uploadedFile.id}`, {
      headers: authHeaders(intruder.token)
    })
    expect(forbiddenDelete.status()).toBe(403)

    page.on('dialog', async dialog => {
      await dialog.accept()
    })

    await withAuth(page, admin.token)
    await page.goto('/admin/files')

    await expect(page.getByTestId('admin-files-page')).toBeVisible()
    await expect(page.getByTestId(`file-name-${uploadedFile.id}`)).toHaveText(fileName)

    await page.getByTestId(`file-delete-button-${uploadedFile.id}`).click()
    await expect(page.getByTestId(`file-row-${uploadedFile.id}`)).toHaveCount(0)
  })

  test('survey owners can download answer exports and attachment bundles from answer management', async ({ page, request }) => {
    const owner = await registerUser(request)
    const surveyTitle = uniqueValue('e2e-answer-survey')
    const survey = await createSurvey(request, owner.token, {
      title: surveyTitle,
      description: 'Answer export coverage',
      questions: [
        {
          type: 'upload',
          title: 'Upload proof',
          upload: {
            maxFiles: 1,
            maxSizeMb: 10,
            accept: '.pdf'
          }
        },
        {
          type: 'input',
          title: 'Comment'
        }
      ],
      settings: {
        allowMultipleSubmissions: true
      }
    })
    await publishSurvey(request, owner.token, survey.id)

    const submissionToken = uniqueValue('submission')
    const uploadedFile = await uploadSurveyAttachment(request, survey.id, submissionToken, 'proof.pdf')
    await submitSurveyResponse(request, survey.id, {
      clientSubmissionToken: submissionToken,
      duration: 42,
      answers: [
        {
          questionId: 1,
          value: [{ id: uploadedFile.id, uploadToken: uploadedFile.uploadToken }]
        },
        {
          questionId: 2,
          value: 'browser export note'
        }
      ]
    })

    await withAuth(page, owner.token)
    await page.goto(`/surveys/answers?surveyId=${survey.id}`)

    await expect(page.getByTestId('answer-management-page')).toBeVisible()
    await expect(page.locator('.answers-table')).toContainText('browser export note')

    const toolbarButtons = page.locator('[data-testid="answer-management-header"] .toolbar .btn')

    const [excelDownload] = await Promise.all([
      page.waitForEvent('download'),
      toolbarButtons.nth(2).click()
    ])
    expect(excelDownload.suggestedFilename()).toBe(`survey-${survey.id}.xlsx`)

    const [attachmentDownload] = await Promise.all([
      page.waitForEvent('download'),
      toolbarButtons.nth(3).click()
    ])
    expect(attachmentDownload.suggestedFilename()).toBe(`survey-${survey.id}-attachments.zip`)
  })

  test('non-owners are blocked from loading another user survey answers', async ({ page, request }) => {
    const owner = await registerUser(request)
    const intruder = await registerUser(request)
    const survey = await createSurvey(request, owner.token, {
      title: uniqueValue('e2e-private-answer-survey'),
      description: 'Answer permission boundary',
      questions: [{ type: 'input', title: 'Private answer' }],
      settings: { allowMultipleSubmissions: true }
    })
    await publishSurvey(request, owner.token, survey.id)
    await submitSurveyResponse(request, survey.id, {
      clientSubmissionToken: uniqueValue('private-submission'),
      answers: [{ questionId: 1, value: 'private answer content' }]
    })

    await withAuth(page, intruder.token)
    const answersResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/answers?') &&
      response.request().method() === 'GET'
    )
    await page.goto(`/surveys/answers?surveyId=${survey.id}`)

    const answersResponse = await answersResponsePromise
    expect(answersResponse.status()).toBe(403)
    await expect(page.locator('.state-card.error')).toBeVisible()
  })

  test('users can create rename open and delete folders in the dashboard workflow', async ({ page, request }) => {
    const user = await registerUser(request)
    const surveyTitle = uniqueValue('e2e-folder-survey')
    const survey = await createSurvey(request, user.token, {
      title: surveyTitle,
      description: 'Folder coverage survey',
      questions: [{ type: 'input', title: 'Folder question' }],
      settings: { allowMultipleSubmissions: true }
    })
    const initialFolderName = uniqueValue('e2e-folder')
    const renamedFolderName = `${initialFolderName}-renamed`

    await withAuth(page, user.token)
    await page.goto('/user-dashboard')
    await expect(page.getByTestId('user-dashboard-page')).toBeVisible()

    await page.locator('.sidebar .nav li').nth(2).click()
    await expect(page.locator('.folder-area')).toBeVisible()

    await page.locator('.folder-toolbar .team-btn').first().click()
    const createDialog = page.locator('.el-dialog').filter({ hasText: /文件夹|鏂囦欢澶?/ }).last()
    await expect(createDialog).toBeVisible()
    await createDialog.locator('input').fill(initialFolderName)
    await createDialog.locator('.el-button--primary').click()

    const folderCard = page.locator('.folder-card', { hasText: initialFolderName }).first()
    await expect(folderCard).toBeVisible()

    await folderCard.locator('.f-ops a').first().click()
    const renameInput = page.locator('.el-message-box__input input')
    await expect(renameInput).toBeVisible()
    await renameInput.fill(renamedFolderName)
    await page.locator('.el-message-box__btns .el-button--primary').click()

    const renamedFolderCard = page.locator('.folder-card', { hasText: renamedFolderName }).first()
    await expect(renamedFolderCard).toBeVisible()

    const folders = await listFolders(request, user.token)
    const folder = folders.find(item => item.name === renamedFolderName)
    expect(folder?.id).toBeTruthy()
    await moveSurveyToFolder(request, user.token, survey.id, folder!.id)

    await page.locator('.toolbar-right .search-btn').click()
    await renamedFolderCard.click()
    await expect(page.locator('.crumb-hero')).toContainText(renamedFolderName)
    await expect(page.locator('.survey-card', { hasText: surveyTitle }).first()).toBeVisible()

    await page.locator('.crumb-hero a').first().click()
    await expect(page.locator('.folder-card', { hasText: renamedFolderName })).toBeVisible()

    await page.locator('.folder-card', { hasText: renamedFolderName }).locator('.f-ops a').nth(1).click()
    await page.locator('.el-message-box__btns .el-button--primary').click()
    await expect(page.locator('.folder-card', { hasText: renamedFolderName })).toHaveCount(0)

    await page.locator('.sidebar .nav li').first().click()
    await expect(page.locator('.survey-card', { hasText: surveyTitle }).first()).toBeVisible()
  })
})
