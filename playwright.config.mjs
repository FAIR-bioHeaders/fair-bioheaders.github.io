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
    { name: 'mobile-320', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 800 } } },
    // Cross-engine coverage (issue #15): the two Blink projects above share an
    // engine, so Firefox and WebKit run the same desktop suite. Narrow-layout
    // (320px) coverage stays Chromium-only until that matrix is measured on the
    // other engines; the limitation is recorded in docs/maintenance.md.
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'python3 scripts/preview.py',
    url: 'http://127.0.0.1:4000/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
