import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { waitForGame } from './helpers';

/** Phase 7 — an axe-core scan of the menu and an open panel (BACKLOG.md; DECISIONS.md → the
 * `@axe-core/playwright` ADR). Only `serious`/`critical` findings fail the test: `minor`/
 * `moderate` axe rules flag things (e.g. landmark regions) this single-page game intentionally
 * does not have and are for a human to triage, not a hard gate. */

function seriousViolations(results: { violations: { impact?: string | null }[] }) {
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

test('the menu has no serious/critical accessibility violations', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.emit('menu:open', {}));
  await expect(page.locator('#menu')).toBeVisible();

  const results = await new AxeBuilder({ page }).include('#menu').analyze();
  expect(seriousViolations(results), JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('an open project panel has no serious/critical accessibility violations', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));
  await expect(page.locator('[data-panel="fiora"]')).toBeVisible();

  const results = await new AxeBuilder({ page }).include('[data-panel="fiora"]').analyze();
  expect(seriousViolations(results), JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('the HUD has no serious/critical accessibility violations', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  const results = await new AxeBuilder({ page }).include('#hud').analyze();
  expect(seriousViolations(results), JSON.stringify(results.violations, null, 2)).toEqual([]);
});
