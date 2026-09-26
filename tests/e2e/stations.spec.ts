import { expect, test } from '@playwright/test';
import { projects } from '../../src/content';
import { waitForGame } from './helpers';

/** Phase 5 — Stations & project panels (BACKLOG.md). */

test('teleporting to each station and interacting opens its panel with the right title', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);

  for (const project of projects) {
    await page.evaluate((id) => window.__PORTFOLIO__!.openStation(id), project.id);
    const title = page.locator(`[data-panel="${project.id}"] [lang="es-419"] .panel__title`);
    await expect(title).toHaveText(project.title);
    await page.keyboard.press('Escape');
    await expect(page.locator(`[data-panel="${project.id}"]`)).toBeHidden();
  }
});

test('the panel title shows in the active language (ES by default, EN when stored)', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));
  const es = page.locator('[data-panel="fiora"] [lang="es-419"]');
  const en = page.locator('[data-panel="fiora"] [lang="en"]');
  await expect(es.locator('.panel__title')).toBeVisible();
  await expect(es.locator('.panel__title')).toHaveText('Fiora');
  await expect(en).toBeHidden();
  await page.keyboard.press('Escape');
});

test('the panel title shows in English once English is the stored language', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('portfolio:lang', 'en'));
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));
  const en = page.locator('[data-panel="fiora"] [lang="en"]');
  await expect(en.locator('.panel__title')).toBeVisible();
  await expect(en.locator('.panel__title')).toHaveText('Fiora');
});

test('deep link /#japaniracer spawns at the station and opens its panel', async ({ page }) => {
  await page.goto('/?debug#japaniracer');
  await waitForGame(page);
  await expect
    .poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState().zone))
    .toBe('japaniracer');
  await expect(page.locator('[data-panel="japaniracer"]')).toBeVisible();
});

test('Esc closes an open panel and the game does not react to that same key press', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));
  await expect(page.locator('[data-panel="fiora"]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-panel="fiora"]')).toBeHidden();

  // The very Escape press that closed the panel must not also register as a stray "menu" press
  // that keeps the game from reacting to the next real key (LESSONS.md → keydown replay).
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player))?.vx)
    .toBeGreaterThan(0);
  await page.keyboard.up('ArrowRight');
});

test('closing a panel marks it visited (persisted in localStorage)', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));
  await page.keyboard.press('Escape');
  const stored = await page.evaluate(() => localStorage.getItem('portfolio:visited'));
  expect(JSON.parse(stored ?? '[]')).toContain('fiora');
});

test('Enter and Space both activate a live link inside an open panel', async ({
  page,
  context,
}) => {
  // Stub the destination so the test never depends on real network access — only that
  // activating the link opened it (a new tab, `target="_blank"`).
  await context.route('https://japaniracer.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>ok</title>',
    })
  );
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('japaniracer'));

  const link = page.locator('[data-panel="japaniracer"] [lang="es-419"] .panel__link');
  await expect(link).toBeVisible();

  await link.focus();
  const [byEnter] = await Promise.all([page.waitForEvent('popup'), page.keyboard.press('Enter')]);
  await byEnter.waitForLoadState();
  expect(byEnter.url()).toBe('https://japaniracer.com/');
  await byEnter.close();

  await link.focus();
  const [bySpace] = await Promise.all([page.waitForEvent('popup'), page.keyboard.press('Space')]);
  await bySpace.waitForLoadState();
  expect(bySpace.url()).toBe('https://japaniracer.com/');
  await bySpace.close();
});

test('Tab traps focus inside the open panel', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('japaniracer'));

  const lang = page.locator('[data-panel="japaniracer"] [lang="es-419"]');
  const close = lang.locator('[data-panel-close]');
  const link = lang.locator('.panel__link');

  // Shift+Tab from the first focusable wraps to the last.
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(link).toBeFocused();

  // Tab from the last focusable wraps back to the first.
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
});

test('Fiora shows an accessible screenshot gallery: thumbnails, arrows, Esc', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));

  const panel = page.locator('[data-panel="fiora"] [lang="es-419"]');
  const thumbs = panel.locator('[data-gallery-open]');
  await expect(thumbs).toHaveCount(5);

  await thumbs.nth(0).click();
  const lightbox = panel.locator('[data-gallery-lightbox]');
  const image = lightbox.locator('[data-gallery-image]');
  await expect(lightbox).toBeVisible();
  const first = await image.getAttribute('src');

  await lightbox.locator('[data-gallery-next]').click();
  await expect(image).not.toHaveAttribute('src', first ?? '');

  // Esc closes the lightbox only — the panel itself stays open.
  await page.keyboard.press('Escape');
  await expect(lightbox).toBeHidden();
  await expect(page.locator('[data-panel="fiora"]')).toBeVisible();

  // A second Esc then closes the panel.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-panel="fiora"]')).toBeHidden();
});

test('Transcolombia (empty stack) renders no stack heading or list', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('transcolombia'));
  const panel = page.locator('[data-panel="transcolombia"] [lang="es-419"]');
  await expect(panel.locator('.panel__subheading')).toHaveCount(0);
  await expect(panel.locator('.panel__stack')).toHaveCount(0);
});

test('a project with a stack renders its chips', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));
  const panel = page.locator('[data-panel="fiora"] [lang="es-419"]');
  await expect(panel.locator('.panel__chip')).toHaveCount(3);
});
