import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: true,
  // Camera/video and audio cases share the machine; avoid saturating it while
  // measuring cadence or trying to strike a moving synthetic target.
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: ['**/offline.spec.ts','**/collection-review.spec.ts','**/legacy-skills-camera.spec.ts','**/public-*-levels.spec.ts'], use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: ['**/offline.spec.ts','**/collection-review.spec.ts','**/legacy-skills-camera.spec.ts','**/public-*-levels.spec.ts'], use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: ['**/offline.spec.ts','**/collection-review.spec.ts','**/legacy-skills-camera.spec.ts','**/public-*-levels.spec.ts'], use: { ...devices['Desktop Safari'] } },
    { name: 'collection', testMatch: ['**/collection-review.spec.ts','**/legacy-skills-camera.spec.ts','**/public-*-levels.spec.ts'], use: { ...devices['Desktop Chrome'] } },
    { name: 'offline', testMatch: '**/offline.spec.ts', use: { ...devices['Desktop Chrome'] } },
  ],
})
