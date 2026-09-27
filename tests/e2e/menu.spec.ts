import { expect, test } from '@playwright/test';
import { confidentialProjects, projects } from '../../src/content';
import { travelTargetX } from '../../src/game/travel/plan';
import { panelIdFor } from '../../src/ui/panels';
import { waitForGame } from './helpers';

/** Phase 7 — Menu, fast travel, HUD & accessibility (BACKLOG.md). */

/** Every menu entry the finished menu must list, each with the panel id it should open (a stub
 * for a stop whose own phase has not merged yet — GAME_DESIGN.md → Canonical ids). */
const ENTRIES = [
  'gate',
  ...projects.map((p) => p.id),
  'classified',
  ...confidentialProjects.map((c) => c.id),
  'lab',
  'contact',
];

/** Teleports right onto `id`'s target first, so the menu's fast-travel plan starts with zero
 * distance and resolves on the very next frame instead of playing out a real run/fade — keeps
 * the "every stop" loop below fast without weakening what it checks (the arrival + open still
 * goes through the real `travel:to` → `travel:arrived` → `station:open` path). */
async function teleportOnto(page: import('@playwright/test').Page, id: string) {
  const x = travelTargetX(id);
  if (x === null) throw new Error(`no travel target for "${id}"`);
  await page.evaluate((tx) => window.__PORTFOLIO__!.teleport(tx), x);
}

test('M, Esc (nothing open) and the HUD menu button all open the menu', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);

  await page.keyboard.press('m');
  await expect(page.locator('#menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeHidden();

  await page.locator('[data-hud-menu]').click();
  await expect(page.locator('#menu')).toBeVisible();
});

test('every stop opens its own panel (or stub), then the menu stays closed', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);

  for (const id of ENTRIES) {
    await teleportOnto(page, id);
    await page.evaluate(() => window.__PORTFOLIO__!.emit('menu:open', {}));
    await page.locator(`#menu [lang="es-419"] [data-menu-entry="${id}"]`).click();
    await expect(page.locator('#menu')).toBeHidden();
    if (id === 'classified') {
      // GAME_DESIGN.md → Canonical ids: the vault has no panel of its own (BACKLOG.md Phase 8) —
      // arriving just reveals the vault (tests/e2e/classified.spec.ts covers that).
      await expect(page.locator('[data-panel="classified"]')).toHaveCount(0);
      continue;
    }
    const panelId = panelIdFor(id);
    await expect(page.locator(`[data-panel="${panelId}"]`)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator(`[data-panel="${panelId}"]`)).toBeHidden();
    await expect(page.locator('#menu')).toBeHidden();
  }
});

test('a stub panel is titled with the stop name and says it is not built yet', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await teleportOnto(page, 'lab');
  await page.evaluate(() => window.__PORTFOLIO__!.emit('menu:open', {}));
  await page.locator('#menu [lang="es-419"] [data-menu-entry="lab"]').click();
  const panel = page.locator('[data-panel="lab"] [lang="es-419"]');
  await expect(panel.locator('.panel__title')).toHaveText('Laboratorio de reactivos');
  await expect(panel.locator('.panel__desc')).toHaveText(
    'Esta parada llega en una fase futura del proyecto.'
  );
});

test('closing a panel opened from the menu marks it visited there next time', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await teleportOnto(page, 'fiora');
  await page.evaluate(() => window.__PORTFOLIO__!.emit('menu:open', {}));
  const fioraEntry = page.locator('#menu [lang="es-419"] [data-menu-entry="fiora"]');
  await expect(fioraEntry.locator('[data-menu-check]')).toHaveText('');
  await fioraEntry.click();
  await page.keyboard.press('Escape');

  await page.evaluate(() => window.__PORTFOLIO__!.emit('menu:open', {}));
  await expect(fioraEntry.locator('[data-menu-check]')).toHaveText('✓');
  await expect(fioraEntry.locator('[data-menu-visited-label]')).not.toHaveAttribute('hidden');
});

test('the language toggle switches the HUD and an open panel instantly, no reload', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await expect(page.locator('[data-hud-contact]')).toHaveText('Contacto');

  await page.locator('[data-hud-lang]').click();
  await expect(page.locator('[data-hud-contact]')).toHaveText('Contact');
  expect(await page.evaluate(() => localStorage.getItem('portfolio:lang'))).toBe('en');

  await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));
  await expect(page.locator('[data-panel="fiora"] [lang="en"] .panel__title')).toBeVisible();
  await expect(page.locator('[data-panel="fiora"] [lang="es-419"]')).toBeHidden();
});

test('the HUD Contact button opens the contact panel from anywhere', async ({ page }) => {
  await page.goto('/?debug#japaniracer');
  await waitForGame(page);
  // The deep link itself opened japaniracer's panel; close it first — Contact opens "from
  // anywhere in the world" (a different zone/spawn), not on top of whatever else is open.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-panel="japaniracer"]')).toBeHidden();
  await page.locator('[data-hud-contact]').click();
  await expect(page.locator('[data-panel="contact"]')).toBeVisible();
});

test('Tab traps focus inside the open menu (wraps both ways)', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.keyboard.press('m');
  const dialog = page.locator('#menu [lang="es-419"]');
  await expect(dialog).toBeVisible();

  const close = dialog.locator('[data-menu-close]');
  const gate = dialog.locator('[data-menu-entry="gate"]');
  const contactEntry = dialog.locator('[data-menu-entry="contact"]');

  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(contactEntry).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(gate).toBeFocused();
});

test('keyboard-only: M, Tab to a project entry, Enter opens it, Esc closes it', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await teleportOnto(page, 'fiora');

  await page.keyboard.press('m');
  await expect(page.locator('#menu')).toBeVisible();

  const isFioraFocused = () =>
    page.evaluate(() => document.activeElement?.getAttribute('data-menu-entry') === 'fiora');
  for (let i = 0; i < 20 && !(await isFioraFocused()); i++) {
    await page.keyboard.press('Tab');
  }
  expect(await isFioraFocused()).toBe(true);

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-panel="fiora"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-panel="fiora"]')).toBeHidden();
});

test('recruiter test: a project panel opens in ≤ 10s by mouse, and by keyboard', async ({
  page,
}) => {
  const startMouse = Date.now();
  await page.goto('/?debug');
  await waitForGame(page);
  await page.locator('[data-hud-menu]').click();
  await page.locator('#menu [lang="es-419"] [data-menu-entry="fiora"]').click();
  // The Playwright-level wait is intentionally more generous than the 10s business budget below
  // (itself measured from `Date.now()`, not this wait): under parallel-worker load the run/fade
  // animation can take noticeably longer in wall-clock time than it would alone, and that slack
  // belongs to Playwright's retry, not to a false failure of the actual ≤ 10s requirement.
  await expect(page.locator('[data-panel="fiora"]')).toBeVisible({ timeout: 15_000 });
  expect(Date.now() - startMouse).toBeLessThanOrEqual(10_000);
  await page.keyboard.press('Escape');

  const startKeyboard = Date.now();
  await page.reload();
  await waitForGame(page);
  await page.keyboard.press('m');
  await page.keyboard.press('Tab'); // dialog → close button
  await page.keyboard.press('Tab'); // close button → gate (first real entry)
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-panel="intro"]')).toBeVisible({ timeout: 15_000 });
  expect(Date.now() - startKeyboard).toBeLessThanOrEqual(10_000);
});
