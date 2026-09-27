import { expect, test } from '@playwright/test';
import type { RuntimeManifest } from '../../src/assets/runtime';
import { loadPlan, planUrls } from '../../src/game/load-plan';
import { watchErrors, waitForGame } from './helpers';

test('boots the game: loading screen goes, canvas draws, only manifest files requested', async ({
  page,
}) => {
  const errors = watchErrors(page);
  const gameRequests: string[] = [];
  page.on('request', (req) => {
    const { pathname, search } = new URL(req.url());
    if (pathname.startsWith('/game/')) gameRequests.push(pathname + search);
  });

  await page.goto('/?debug');
  await waitForGame(page);
  await expect(page.locator('#loading')).toBeHidden();

  const state = await page.evaluate(() => window.__PORTFOLIO__!.getState());
  const manifest = await page.evaluate(
    () => JSON.parse(document.getElementById('assets')!.textContent!) as RuntimeManifest | null
  );
  const expected = planUrls(loadPlan(manifest, state.tier));
  // The loading screen may request the portrait and walk strip (also in the plan) first.
  expect([...new Set(gameRequests)].sort()).toEqual([...expected].sort());
  expect(state.pandaTexture).toBe(manifest ? 'panda-idle' : 'panda-placeholder');

  // Canvas is not blank: the WebGL buffer is not preserved, so read a screenshot.
  const shot = await page.locator('canvas').screenshot();
  const variance = await page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    const colors = new Set<number>();
    for (let i = 0; i < d.length; i += 4) colors.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return colors.size;
  }, shot.toString('base64'));
  expect(variance).toBeGreaterThan(3);

  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('canvas is an integer multiple of its backing size in device px', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  const m = await page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    const r = c.getBoundingClientRect();
    const s = window.__PORTFOLIO__!.getState();
    return {
      w: r.width * devicePixelRatio,
      h: r.height * devicePixelRatio,
      x: r.x * devicePixelRatio,
      y: r.y * devicePixelRatio,
      bw: c.width,
      bh: c.height,
      zoom: s.zoom,
      mode: s.mode,
    };
  });
  expect(Math.abs(m.w - m.bw * m.zoom)).toBeLessThan(0.1);
  expect(Math.abs(m.h - m.bh * m.zoom)).toBeLessThan(0.1);
  expect(Math.abs(m.x - Math.round(m.x))).toBeLessThan(0.1);
  expect(Math.abs(m.y - Math.round(m.y))).toBeLessThan(0.1);
  expect(m.zoom).toBeGreaterThanOrEqual(1);
  expect(m.mode).toBe(test.info().project.name.includes('mobile') ? 'handheld' : 'desktop');
});

test('recomputes the zoom on resize without a reload', async ({ page }) => {
  test.skip(test.info().project.name.includes('mobile'), 'desktop resize');
  await page.goto('/?debug');
  await waitForGame(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect
    .poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState()))
    .toMatchObject({ zoom: 3, backingW: 640, backingH: 360 });
});

test('the in-world pixel font renders', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.waitForFunction(() => window.__PORTFOLIO__!.getState().pixelFont);
});

test('stored language applies before paint', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('portfolio:lang', 'en'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-lang', 'en');
});

test('reduced motion: the loading screen leaves without a fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?debug');
  await waitForGame(page);
  await expect(page.locator('#loading')).toBeHidden({ timeout: 100 });
  await expect(page.locator('#loading')).not.toHaveAttribute('data-state', 'leaving');
});
