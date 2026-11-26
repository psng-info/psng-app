import { defineConfig, devices } from '@playwright/test';

// E2E_PORT: nötig, wenn auf 4173 schon ein anderer Dev-Server läuft (z. B. ein zweiter Worktree).
const PORT = Number(process.env['E2E_PORT']) || 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // VITE_AI=on: der v2-Prototyp „Mit Claude verarbeiten“ ist im E2E eingeschaltet (mit Mock-Planer, kein Netzwerk).
    command: `VITE_AI=on npm run dev:demo -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
