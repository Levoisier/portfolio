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

/**
 * Waits until the game reports ready through the debug hook, AND `#loading` has actually left
 * (`ready` flips as soon as `WorldScene.create()` returns, but the loading overlay fades out on
 * its own CSS transition and, being `position: fixed` above everything, still intercepts clicks
 * and taps at that moment — LESSONS.md: "A visual/e2e check must wait for the loading screen
 * too, not just ready"; the same is true of any coordinate-based pointer interaction, not only
 * screenshots).
 */
export async function waitForGame(page: Page) {
  await page.waitForFunction(() => window.__PORTFOLIO__?.getState().ready === true);
  await page.locator('#loading').waitFor({ state: 'hidden' });
}
