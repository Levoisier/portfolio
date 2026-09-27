import { expect, test } from '@playwright/test';
import { GROUND_Y } from '../../src/game/world/layout';
import { waitForGame } from './helpers';

/** Painted scenery + the full-screen touch layout (ARCHITECTURE.md → Scenery, Layout modes). */

test('each layout mode shows the painting made for its aspect', async ({ page }, info) => {
  await page.goto('/?debug');
  await waitForGame(page);
  const state = () => page.evaluate(() => window.__PORTFOLIO__!.getState());
  if (info.project.name === 'mobile') {
    expect((await state()).backdrop).toBe('backdrop-portrait');
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(async () => (await state()).mode).toBe('landscape-touch');
    await expect.poll(async () => (await state()).backdrop).toBe('backdrop-landscape');
  } else {
    expect((await state()).backdrop).toBe('backdrop-landscape');
  }
});

test.describe('handheld', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch layout only');

  test('the game fills the screen and the ground sits above the pad', async ({ page }) => {
    await page.goto('/?debug');
    await waitForGame(page);
    const viewport = page.viewportSize()!;
    const screen = await page.locator('#screen').boundingBox();
    expect(screen!.height).toBeGreaterThan(viewport.height * 0.95);

    const { zoom, dpr, camera } = await page.evaluate(() => {
      const s = window.__PORTFOLIO__!.getState();
      return { zoom: s.zoom, dpr: s.dpr, camera: s.camera };
    });
    const canvas = await page.locator('canvas').boundingBox();
    const groundCss = canvas!.y + ((GROUND_Y - camera.scrollY) * zoom) / dpr;
    const dpad = await page.locator('[data-pad-btn="left"]').boundingBox();
    expect(groundCss).toBeLessThan(dpad!.y);
  });

  test('a panel is a full-screen sheet; only B stays on top of it, and closes it', async ({
    page,
  }) => {
    await page.goto('/?debug');
    await waitForGame(page);
    await page.evaluate(() => window.__PORTFOLIO__!.openStation('fiora'));
    const panel = page.locator('[data-panel="fiora"] .panel').first();
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
    await expect(page.locator('[data-pad-btn="left"]')).toBeHidden();
    await expect(page.locator('[data-pad-btn="a"]')).toBeHidden();
    await page.locator('[data-pad-btn="b"]').click();
    await expect(page.locator('[data-panel="fiora"]')).toBeHidden();
    await expect(page.locator('[data-pad-btn="left"]')).toBeVisible();
  });

  test('the HUD fits on one row', async ({ page }) => {
    await page.goto('/?debug');
    await waitForGame(page);
    const tops = await page
      .locator('#hud [data-slot="badge"] button, #hud [data-slot="actions"] button')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    await page.screenshot({ path: 'test-results/scenery-handheld.png' });
  });
});
