import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5005',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 5005,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
