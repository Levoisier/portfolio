import type { Page } from '@playwright/test';

/** Collects console errors, page errors, failed requests and HTTP ≥ 400 responses. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('requestfailed', (req) => errors.push(`request failed: ${req.url()}`));
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  return errors;
}

/** Waits until the game reports ready through the debug hook. */
export async function waitForGame(page: Page) {
  await page.waitForFunction(() => window.__PORTFOLIO__?.getState().ready === true);
}
