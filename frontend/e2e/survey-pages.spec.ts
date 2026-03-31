import { test, expect } from 'playwright/test'

const backendBaseUrl = process.env.PLAYWRIGHT_BACKEND_URL || 'http://127.0.0.1:63002'

async function createUser(request: import('playwright/test').APIRequestContext) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const username = `e2e_user_${suffix}`
  const password = `E2ePass!${suffix}`
  const email = `${username}@example.com`

  const response = await request.post(`${backendBaseUrl}/api/auth/register`, {
    data: { username, password, email }
  })
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  return {
    username,
    password,
    token: body.data.token
  }
}

async function withAuth(page: import('playwright/test').Page, token: string) {
  await page.addInitScript(value => {
    window.localStorage.setItem('token', value)
  }, token)
}

async function fillWithRetry(locator: import('playwright/test').Locator, value: string, attempts = 5) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await expect(locator).toBeVisible()
      await locator.click()
      await locator.fill(value)
      await expect(locator).toHaveValue(value)
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

async function createSurvey(request: import('playwright/test').APIRequestContext, token: string, payload: Record<string, unknown>) {
  const response = await request.post(`${backendBaseUrl}/api/surveys`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: payload
  })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return body.data
}

async function loginUser(request: import('playwright/test').APIRequestContext, username: string, password: string) {
  const response = await request.post(`${backendBaseUrl}/api/auth/login`, {
    data: { username, password }
  })
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  return {
    username,
    token: body.data.token
  }
}

async function createRepo(
  request: import('playwright/test').APIRequestContext,
  token: string,
  payload: { name: string; description?: string }
) {
  const response = await request.post(`${backendBaseUrl}/api/repos`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: payload
  })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return body.data
}

async function createBankQuestion(
  request: import('playwright/test').APIRequestContext,
  token: string,
  repoId: number,
  payload: Record<string, unknown>
) {
  const response = await request.post(`${backendBaseUrl}/api/repos/${repoId}/questions`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: payload
  })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return body.data
}

async function publishSurvey(request: import('playwright/test').APIRequestContext, token: string, surveyId: number) {
  const response = await request.post(`${backendBaseUrl}/api/surveys/${surveyId}/publish`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  expect(response.ok()).toBeTruthy()
}

async function submitSurveyResponse(request: import('playwright/test').APIRequestContext, surveyId: number, answers: unknown[], duration = 30) {
  const response = await request.post(`${backendBaseUrl}/api/surveys/${surveyId}/responses`, {
    data: {
      clientSubmissionToken: `e2e-submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      duration,
      answers
    }
  })
  expect(response.ok()).toBeTruthy()
}

test.describe('Survey Browser E2E', () => {
  test('editor can create a survey, add a question, and publish it', async ({ page, request }) => {
    const user = await createUser(request)
    await withAuth(page, user.token)

    const dialogs: string[] = []
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message())
      await dialog.accept()
    })

    await page.goto('/surveys/create')
    await page.locator('.create-box .title-input').fill('Editor E2E Survey')
    await page.locator('.create-box .btn-primary').click()

    await page.waitForURL(/\/surveys\/\d+\/edit(\?|$)/)
    const surveyId = Number(page.url().match(/\/surveys\/(\d+)\/edit(?:\?|$)/)?.[1])

    await expect(page.getByTestId('editor-survey-title-input')).toHaveValue('Editor E2E Survey')
    await page.waitForTimeout(500)
    await page.locator('.question-categories .category-compact').first().locator('.type-item').first().click()
    await expect(page.getByTestId('question-editor-0')).toBeVisible()
    await fillWithRetry(page.getByTestId('question-title-input-0'), 'Editor Choice Question')
    await page.getByTestId('editor-publish-button').click()

    await page.waitForURL('**/user-dashboard')
    expect(dialogs.length).toBeGreaterThanOrEqual(2)

    const surveyResponse = await request.get(`${backendBaseUrl}/api/surveys/${surveyId}`, {
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    })
    expect(surveyResponse.ok()).toBeTruthy()
    const surveyBody = await surveyResponse.json()
    expect(surveyBody.data.status).toBe('published')
  })

  test('editor can import a structured question bank question into the survey editor', async ({ page, request }) => {
    const admin = await loginUser(request, 'admin', '123456')
    const user = await createUser(request)
    const repo = await createRepo(request, admin.token, {
      name: `Repo Import ${Date.now()}`
    })
    const bankQuestion = await createBankQuestion(request, admin.token, repo.id, {
      title: '登录频率题',
      type: 'radio',
      stem: '请选择最符合你当前登录频率的一项。',
      options: ['每天', '每周'],
      analysis: '用于判断用户活跃频率。'
    })

    page.on('dialog', async dialog => {
      await dialog.accept()
    })

    const survey = await createSurvey(request, user.token, {
      title: 'Repo Import Survey',
      description: 'Question bank import test.',
      questions: [
        {
          type: 'input',
          title: 'Existing question'
        }
      ],
      settings: {
        allowMultipleSubmissions: true
      }
    })

    await withAuth(page, user.token)
    await page.goto(`/surveys/${survey.id}/edit`)
    await page.waitForURL(new RegExp(`/surveys/${survey.id}/edit(\\?|$)`))

    await page.getByTestId('survey-panel-tab-repo').click()
    await expect(page.getByTestId('survey-question-bank-panel')).toBeVisible()
    await page.getByTestId('survey-bank-repo-select').selectOption(String(repo.id))
    await page.getByTestId(`survey-bank-import-button-${bankQuestion.id}`).click()

    await expect(page.getByTestId('question-editor-1')).toBeVisible()
    await expect(page.getByTestId('question-title-input-1')).toHaveValue('请选择最符合你当前登录频率的一项。')
    await expect(page.locator('[data-opt="q1-o0"]')).toHaveValue('每天')
    await expect(page.locator('[data-opt="q1-o1"]')).toHaveValue('每周')

    await page.getByTestId('editor-publish-button').click()
    await page.waitForURL('**/user-dashboard')

    const surveyResponse = await request.get(`${backendBaseUrl}/api/surveys/${survey.id}`, {
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    })
    expect(surveyResponse.ok()).toBeTruthy()
    const surveyBody = await surveyResponse.json()
    expect(surveyBody.data.questions[1].title).toBe('请选择最符合你当前登录频率的一项。')
    expect(surveyBody.data.questions[1].description).toBe('用于判断用户活跃频率。')
    expect(surveyBody.data.questions[1].options.map((item: { label: string }) => item.label)).toEqual(['每天', '每周'])
  })

  test('editor can save the current survey question back into a question bank repo', async ({ page, request }) => {
    const admin = await loginUser(request, 'admin', '123456')
    const repo = await createRepo(request, admin.token, {
      name: `Repo Export ${Date.now()}`
    })
    const survey = await createSurvey(request, admin.token, {
      title: 'Repo Export Survey',
      description: 'Question bank export test.',
      questions: [
        {
          type: 'radio',
          title: '你通常通过什么渠道了解活动信息？',
          description: '用于识别活动传播渠道。',
          options: [
            { label: '微信群', value: '1' },
            { label: '邮件通知', value: '2' }
          ]
        }
      ],
      settings: {
        allowMultipleSubmissions: true
      }
    })

    await withAuth(page, admin.token)
    await page.goto(`/surveys/${survey.id}/edit`)
    await page.waitForURL(new RegExp(`/surveys/${survey.id}/edit(\\?|$)`))

    await page.getByTestId('question-editor-0').locator('.question-content').click()
    await page.getByTestId('survey-panel-tab-repo').click()
    await page.getByTestId('survey-bank-repo-select').selectOption(String(repo.id))
    await expect(page.getByTestId('survey-bank-save-current-button')).toBeVisible()
    await page.getByTestId('survey-bank-export-tags-input').fill('渠道, 触达')
    await page.getByTestId('survey-bank-export-knowledge-input').fill('用户研究, 传播分析')
    await page.getByTestId('survey-bank-export-scenes-input').fill('活动报名, 市场调研')
    await page.getByTestId('survey-bank-export-ai-meta-input').fill('{"generatedBy":"gpt-5.2","reviewStatus":"draft"}')
    await page.getByTestId('survey-bank-save-current-button').click()

    let repoQuestionsBody: any = null
    await expect.poll(async () => {
      const repoQuestionsResponse = await request.get(`${backendBaseUrl}/api/repos/${repo.id}/questions`, {
        headers: {
          Authorization: `Bearer ${admin.token}`
        }
      })
      expect(repoQuestionsResponse.ok()).toBeTruthy()
      repoQuestionsBody = await repoQuestionsResponse.json()
      return repoQuestionsBody.data.length
    }).toBe(1)

    expect(repoQuestionsBody.data[0].title).toBe('你通常通过什么渠道了解活动信息？')
    expect(repoQuestionsBody.data[0].analysis).toBe('用于识别活动传播渠道。')
    expect(repoQuestionsBody.data[0].options.map((item: { label: string }) => item.label)).toEqual(['微信群', '邮件通知'])
    expect(repoQuestionsBody.data[0].tags).toEqual(['渠道', '触达'])
    expect(repoQuestionsBody.data[0].knowledgePoints).toEqual(['用户研究', '传播分析'])
    expect(repoQuestionsBody.data[0].applicableScenes).toEqual(['活动报名', '市场调研'])
    expect(repoQuestionsBody.data[0].content?.surveyQuestion?.type).toBe('radio')
    expect(repoQuestionsBody.data[0].content?.surveyQuestion?.logic).toBeUndefined()
    expect(repoQuestionsBody.data[0].content?.surveyQuestion?.jumpLogic).toBeUndefined()
    expect(repoQuestionsBody.data[0].content?.aiMeta).toEqual({
      generatedBy: 'gpt-5.2',
      reviewStatus: 'draft'
    })
  })

  test('public fill page can submit a published survey', async ({ page, request }) => {
    const user = await createUser(request)
    const survey = await createSurvey(request, user.token, {
      title: 'Public Fill E2E Survey',
      description: 'Survey used for public fill regression.',
      questions: [
        {
          type: 'radio',
          title: 'Public choice',
          options: [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' }
          ]
        },
        {
          type: 'input',
          title: 'Public note'
        }
      ],
      settings: {
        allowMultipleSubmissions: true
      }
    })
    await publishSurvey(request, user.token, survey.id)

    await page.goto(`/s/${survey.id}?force=desktop`)
    await expect(page.getByTestId('fill-survey-page')).toBeVisible()
    await expect(page.getByText('Public Fill E2E Survey')).toBeVisible()

    await page.locator('[data-testid="fill-question-0"]').getByText('Option A').click()
    await page.locator('[data-testid="fill-question-1"]').locator('input').fill('Public fill submitted from browser E2E')
    await page.locator('.submit-btn').click()

    await page.waitForURL(new RegExp(`/s/${survey.id}/success`))
  })

  test('results page shows collected summary and analysis data', async ({ page, request }) => {
    const user = await createUser(request)
    const survey = await createSurvey(request, user.token, {
      title: 'Results E2E Survey',
      description: 'Survey used for results regression.',
      questions: [
        {
          type: 'radio',
          title: 'Results choice',
          options: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' }
          ]
        },
        {
          type: 'input',
          title: 'Results note'
        }
      ],
      settings: {
        allowMultipleSubmissions: true
      }
    })
    await publishSurvey(request, user.token, survey.id)
    await submitSurveyResponse(request, survey.id, [
      { questionId: 1, value: 'yes' },
      { questionId: 2, value: 'first result note' }
    ], 25)
    await submitSurveyResponse(request, survey.id, [
      { questionId: 1, value: 'no' },
      { questionId: 2, value: 'second result note' }
    ], 40)

    await withAuth(page, user.token)
    await page.goto(`/surveys/${survey.id}/results`)

    await expect(page.getByTestId('results-page')).toBeVisible()
    await expect(page.getByTestId('results-hero-title')).toHaveText('Results E2E Survey')
    await expect(page.getByTestId('results-total-submissions')).toHaveText('2')

    await page.getByTestId('results-nav-analysis').click()
    await expect(page.getByTestId('results-analysis-list')).toBeVisible()
    await expect(page.getByText('Results choice')).toBeVisible()
    await expect(page.getByText('Results note')).toBeVisible()
  })
})
