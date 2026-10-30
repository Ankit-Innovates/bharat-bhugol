import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// Runs against the production build: `npm run build` first, then `npm run e2e`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // Tall enough that the whole map is on screen without scrolling.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1000 } },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
})
