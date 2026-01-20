import type { PlaywrightTestConfig } from '@playwright/test';

// Usa il container Docker in esecuzione invece di avviare un nuovo server
const E2E_PORT = Number(process.env.E2E_PORT || 5173);
const USE_DOCKER = process.env.USE_DOCKER === 'true' || true; // Default a true per usare Docker

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://127.0.0.1:${E2E_PORT}`,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  // Avvia webServer solo se non stai usando Docker
  webServer: USE_DOCKER ? undefined : {
    command: `npm run dev -- --host --port ${E2E_PORT}`,
    url: `http://127.0.0.1:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 60_000,
  },
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
};

export default config;
