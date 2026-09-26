import { describe, expect, it } from 'vitest';
import { computeViewport, screenFromCss } from './zoom';

const at = (w: number, h: number, dpr: number, target: number) =>
  computeViewport(screenFromCss(w, h, dpr), target);

describe('computeViewport — ARCHITECTURE examples', () => {
  it.each([
    [1920, 1080, 1, 360, 3, 640, 360],
    [1440, 900, 1, 360, 2, 720, 450],
    [1440, 900, 2, 360, 5, 576, 360],
    [1366, 657, 1, 360, 1, 960, 657],
    [1536, 730, 1.25, 360, 2, 960, 456],
    [390, 420, 3, 240, 5, 234, 252],
    [390, 506, 3, 240, 5, 234, 303],
    [1280, 720, 1, 360, 2, 640, 360],
    [2560, 1440, 1, 360, 4, 640, 360],
    [844, 390, 3, 240, 4, 633, 292],
    [390, 1000, 1, 240, 1, 390, 1000],
  ])('%i×%i@%s (target %i) → zoom %i, %i×%i', (w, h, dpr, target, zoom, bw, bh) => {
    const v = at(w, h, dpr, target);
    expect([v.zoom, v.backingW, v.backingH]).toEqual([zoom, bw, bh]);
  });
});

describe('computeViewport — invariants', () => {
  const sizes = [
    [1280, 720, 1],
    [1366, 657, 1],
    [1440, 900, 1],
    [1440, 900, 2],
    [1536, 730, 1.25],
    [1920, 1080, 1],
    [2560, 1440, 1],
    [390, 420, 3],
    [844, 390, 3],
    [375, 333, 2],
    [1000, 150, 1.5],
  ] as const;

  it.each(sizes)('%i×%i@%s: integer device scale, fits, centred on device px', (w, h, dpr) => {
    const screen = screenFromCss(w, h, dpr);
    const v = computeViewport(screen, 360);
    expect(Number.isInteger(v.zoom)).toBe(true);
    expect(v.cssW * dpr).toBeCloseTo(v.backingW * v.zoom, 9);
    expect(v.backingW * v.zoom).toBeLessThanOrEqual(screen.widthDev);
    expect(v.backingH * v.zoom).toBeLessThanOrEqual(screen.heightDev);
    expect(v.backingW).toBeLessThanOrEqual(960);
    expect(Number.isInteger(Math.round(v.offsetX * dpr * 1e9) / 1e9)).toBe(true);
    expect(Number.isInteger(Math.round(v.offsetY * dpr * 1e9) / 1e9)).toBe(true);
    expect(v.scaleZoom).toBeCloseTo(v.zoom / dpr, 12);
  });

  it('never goes below zoom 1 on tiny screens', () => {
    expect(at(120, 90, 1, 360).zoom).toBe(1);
  });
});
