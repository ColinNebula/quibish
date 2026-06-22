const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 15000
  },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] }
    }
  ],
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '3000',
      CI: 'true',
      BROWSER: 'none'
    }
  }
});
