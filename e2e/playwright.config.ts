import { defineConfig, devices } from '@playwright/test'

/**
 * A app sobe por docker compose — não há `webServer` aqui de propósito.
 *
 *   E2E_TARGET=legacy E2E_BASE_URL=http://localhost:5000 npx playwright test
 *   E2E_BASE_URL=http://localhost:5173 npx playwright test
 */
export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',

  // Um worker só: o carrinho e os pedidos compartilham o mesmo banco, e o
  // monolito tem um bug de checkout (fecha o pedido de qualquer usuário) que
  // tornaria uma execução paralela não-determinística contra a baseline.
  fullyParallel: false,
  workers: 1,
  retries: 0,

  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
