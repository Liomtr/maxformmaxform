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
    await page.locator('.question-categories .type-item').first().click()
    await expect(page.getByTestId('question-editor-0')).toBeVisible()
    await page.getByTestId('question-title-input-0').fill('Editor Choice Question')
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
