import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * Configurazione Playwright per test E2E con Docker
 * Usa i container in esecuzione invece di mock
 */
const config: PlaywrightTestConfig = {
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: 1, // Retry una volta in caso di fallimento
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure', // Screenshot solo in caso di errore
    video: 'retain-on-failure', // Video solo in caso di errore
  },
  // Non avviare webServer, usa i container Docker già running
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
};

export default config;
