import { describe, expect, it } from 'vitest';
import { WHEEL_LINE_PX, WHEEL_MAX_MS, WHEEL_MS_PER_PX, WHEEL_PAGE_PX } from '../config';
import { WheelWalker, normalizeWheel } from './wheel';

/** Frames of `dt` ms the walker keeps walking, and in which direction. */
function drain(w: WheelWalker, dt = 16): { dir: number; frames: number } {
  let frames = 0;
  let dir = 0;
  for (let d = w.update(dt); d !== 0; d = w.update(dt)) {
    dir = d;
    frames++;
    if (frames > 10_000) throw new Error('never decays');
  }
  return { dir, frames };
}

describe('normalizeWheel', () => {
  it('converts each deltaMode to px', () => {
    expect(normalizeWheel(0, 3, 0)).toBe(3);
    expect(normalizeWheel(0, 3, 1)).toBe(3 * WHEEL_LINE_PX);
    expect(normalizeWheel(0, 1, 2)).toBe(WHEEL_PAGE_PX);
  });

  it('uses the dominant axis', () => {
    expect(normalizeWheel(10, 4, 0)).toBe(10);
    expect(normalizeWheel(-2, 8, 0)).toBe(8);
    expect(normalizeWheel(-12, 8, 0)).toBe(-12);
    // A tie goes to deltaY (the common mouse wheel).
    expect(normalizeWheel(-5, 5, 0)).toBe(5);
  });

  it('scroll down and swipe right walk right; up and left walk left', () => {
    expect(normalizeWheel(0, 100, 0)).toBeGreaterThan(0);
    expect(normalizeWheel(100, 0, 0)).toBeGreaterThan(0);
    expect(normalizeWheel(0, -100, 0)).toBeLessThan(0);
    expect(normalizeWheel(-100, 0, 0)).toBeLessThan(0);
  });
});

describe('WheelWalker', () => {
  it('stands still with nothing banked', () => {
    expect(new WheelWalker().update(16)).toBe(0);
  });

  it('walks in the push direction and decays to 0', () => {
    const w = new WheelWalker();
    w.push(0, 40, 0); // 40 px → 100 ms
    expect(drain(w)).toEqual({ dir: 1, frames: Math.ceil((40 * WHEEL_MS_PER_PX) / 16) });
    expect(w.update(16)).toBe(0);

    w.push(0, -40, 0);
    expect(drain(w).dir).toBe(-1);
  });

  it('a horizontal swipe walks too', () => {
    const w = new WheelWalker();
    w.push(-30, 2, 0);
    expect(w.update(16)).toBe(-1);
  });

  it('pushes in the same direction add up to the cap', () => {
    const w = new WheelWalker();
    w.push(0, 20, 0);
    w.push(0, 20, 0);
    expect(drain(w, 1).frames).toBe(40 * WHEEL_MS_PER_PX);

    for (let i = 0; i < 50; i++) w.push(0, 100, 0);
    expect(drain(w, 1).frames).toBe(WHEEL_MAX_MS);
  });

  it('one huge push (a page) is capped too', () => {
    const w = new WheelWalker();
    w.push(0, 1, 2);
    expect(drain(w, 1).frames).toBe(WHEEL_MAX_MS);
  });

  it('a push in the opposite direction replaces the bank', () => {
    const w = new WheelWalker();
    w.push(0, 180, 0); // capped 450 ms right
    w.update(16);
    w.push(0, -8, 0); // 20 ms left
    expect(w.update(1)).toBe(-1);
    expect(drain(w, 1)).toEqual({ dir: -1, frames: 8 * WHEEL_MS_PER_PX - 1 });
  });

  it('ignores sub-pixel noise and NaN', () => {
    const w = new WheelWalker();
    w.push(0.4, 0.9, 0);
    w.push(Number.NaN, 0, 0);
    expect(w.update(16)).toBe(0);

    w.push(0, 100, 0);
    w.push(0, -0.5, 0); // noise does not turn the walker around
    expect(w.update(16)).toBe(1);
  });

  it('a small line-mode tick still walks (lines × 16 px)', () => {
    const w = new WheelWalker();
    w.push(0, 0.1, 1); // 1.6 px
    expect(w.update(16)).toBe(1);
  });

  it('reset clears the bank', () => {
    const w = new WheelWalker();
    w.push(0, 100, 0);
    w.reset();
    expect(w.update(16)).toBe(0);
  });
});
