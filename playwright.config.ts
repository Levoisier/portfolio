import { defineConfig, devices } from '@playwright/test';

// Own ports + never reuse: e2e must test a fresh production build, not a dev or stale preview.
const PORT = 4323;
const NO_ASSETS_PORT = 4324;
const url = (port: number) => `http://127.0.0.1:${port}`;

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };
const mobile = {
  ...devices['Desktop Chrome'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: url(PORT),
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: desktop },
    { name: 'mobile', use: mobile },
    // The same page built with a null manifest (as if public/game/ were empty).
    {
      name: 'no-assets',
      testMatch: /(smoke|shell)\.spec\.ts/,
      use: { ...desktop, baseURL: url(NO_ASSETS_PORT) },
    },
    {
      name: 'no-assets-mobile',
      testMatch: /(smoke|shell)\.spec\.ts/,
      use: { ...mobile, baseURL: url(NO_ASSETS_PORT) },
    },
  ],
  // Started in order: the first build runs the asset pipeline; the second only reuses public/.
  webServer: [
    {
      command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${PORT}`,
      url: url(PORT),
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `astro build && astro preview --host 127.0.0.1 --port ${NO_ASSETS_PORT}`,
      env: { PORTFOLIO_NO_ASSETS: '1' },
      url: url(NO_ASSETS_PORT),
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
