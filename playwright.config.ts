import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests, run against the PRODUCTION build.
 *
 * Not the dev server, on purpose. The site that ships has things development
 * does not: the Content-Security-Policy, the absolute base path and the lazy
 * chunks. Every one of them has broken something in this project that only
 * appeared once built, so that is what these tests drive.
 */
const PORT = 4173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // One retry in CI absorbs a slow runner; locally a flaky test should be seen.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    // Relative paths in tests resolve under the base: page.goto('editor').
    baseURL: `http://localhost:${PORT}/cv-match/`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/cv-match/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
