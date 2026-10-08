import { defineConfig, devices } from '@playwright/test';

// Runs the browser/a11y regression suite against the built site, served the
// same way GitHub Pages resolves extensionless URLs.
export default defineConfig({
  testDir: './scripts/browser',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4000',
    trace: 'off'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-320', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 800 } } }
  ],
  webServer: {
    command: 'python3 scripts/preview.py',
    url: 'http://127.0.0.1:4000/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
