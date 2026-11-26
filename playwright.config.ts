import { defineConfig, devices } from '@playwright/test';

// Anderer Port, falls 4173 belegt ist: `E2E_PORT=4180 npm run e2e`.
const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev:demo -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Nie einen fremden Server auf dem Port mitbenutzen (z. B. aus einem anderen Checkout):
    // sonst testet Playwright still anderen Code. Der eigene Start dauert nur ein paar Sekunden.
    reuseExistingServer: false,
  },
});
