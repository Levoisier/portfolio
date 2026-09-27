import { expect, test } from '@playwright/test';
import { confidentialProjects } from '../../src/content';
import { WORLD_LAYOUT } from '../../src/game/world/layout';
import { waitForGame } from './helpers';

/** Phase 8 — Classified wing (BACKLOG.md). */

test('interacting with the vault rolls its door aside; it has no panel of its own', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await expect
    .poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState().vaultOpen))
    .toBe(false);

  await page.evaluate(() => window.__PORTFOLIO__!.openStation('classified'));

  await expect
    .poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState().vaultOpen))
    .toBe(true);
  // GAME_DESIGN.md → Canonical ids: "classified → no panel of its own".
  await expect(page.locator('[data-panel="classified"]')).toHaveCount(0);
});

test('a second interact with the vault is a no-op (idempotent open)', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('classified'));
  await expect
    .poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState().vaultOpen))
    .toBe(true);
  // Does not throw and stays open.
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('classified'));
  expect(await page.evaluate(() => window.__PORTFOLIO__!.getState().vaultOpen)).toBe(true);
});

test('the vault shows an interact prompt with the classified wing title', async ({ page }) => {
  await page.goto('/?debug#classified');
  await waitForGame(page);
  // The E/Toca prefix depends on layout mode (desktop vs. touch — tests/e2e/stations.spec.ts and
  // pad.spec.ts already cover that); here only the title resolution is new (BACKLOG.md Phase 8).
  await expect(page.locator('[data-slot="prompt"]')).toContainText('Ala clasificada');
});

for (const c of confidentialProjects) {
  test(`the ${c.id} dossier panel shows exactly industry, role, stack, impact, duration, team size`, async ({
    page,
  }) => {
    await page.goto('/?debug');
    await waitForGame(page);
    await page.evaluate((id) => window.__PORTFOLIO__!.openStation(id), c.id);

    const panel = page.locator(`[data-panel="${c.id}"] [lang="es-419"]`);
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel__title')).toHaveText(c.industry.es);
    await expect(panel).toContainText(c.role.es);
    for (const s of c.stack) await expect(panel).toContainText(s);
    await expect(panel).toContainText(c.impact.es);
    await expect(panel).toContainText(c.duration.es);
    await expect(panel).toContainText(c.teamSize);

    // AGENTS.md Golden Rule 3: never a screenshot, a live link, a client or an employer name.
    await expect(panel.locator('a[href]')).toHaveCount(0);
    await expect(panel.locator('img')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.locator(`[data-panel="${c.id}"]`)).toBeHidden();
  });

  test(`the ${c.id} dossier panel renders in English once English is the stored language`, async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('portfolio:lang', 'en'));
    await page.goto('/?debug');
    await waitForGame(page);
    await page.evaluate((id) => window.__PORTFOLIO__!.openStation(id), c.id);

    const panel = page.locator(`[data-panel="${c.id}"] [lang="en"]`);
    await expect(panel.locator('.panel__title')).toHaveText(c.industry.en);
    await expect(panel).toContainText(c.role.en);
    await expect(panel).toContainText(c.impact.en);
    await expect(panel).toContainText(c.duration.en);
    await expect(page.locator(`[data-panel="${c.id}"] [lang="es-419"]`)).toBeHidden();
  });

  test(`a dossier prompt shows ${c.id}'s industry as the title`, async ({ page }) => {
    await page.goto('/?debug');
    await waitForGame(page);
    const station = WORLD_LAYOUT.stations.find((s) => s.id === c.id)!;
    await page.evaluate((x) => window.__PORTFOLIO__!.teleport(x), station.x);
    await expect(page.locator('[data-slot="prompt"]')).toContainText(c.industry.es);
  });
}
