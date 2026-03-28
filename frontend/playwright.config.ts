import { defineConfig, devices } from 'playwright/test'

const frontendBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:63000'
const backendBaseUrl = process.env.PLAYWRIGHT_BACKEND_URL || 'http://127.0.0.1:63002'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  reporter: [['list']],
  use: {
    baseURL: frontendBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge'
      }
    }
  ],
  webServer: [
    {
      command: 'node scripts/start-e2e.js',
      cwd: '../backend',
      url: `${backendBaseUrl}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        ...process.env,
        FRONTEND_URL: frontendBaseUrl,
        PORT: '63002'
      }
    },
    {
      command: 'cmd /c npm run dev',
      cwd: '.',
      url: frontendBaseUrl,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        ...process.env
      }
    }
  ]
})
