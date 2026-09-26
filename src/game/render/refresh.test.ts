import { describe, expect, it } from 'vitest';
import { estimateRefreshHz, RefreshMeter } from './refresh';

/** Seeded LCG (same recipe as follow.test.ts) for reproducible jitter. */
function lcg(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** `n` deltas around `1000 / hz` ms, jittered by up to ± `jitterMs`. */
function deltas(hz: number, n: number, jitterMs = 0.3, seed = 1): number[] {
  const rnd = lcg(seed);
  const base = 1000 / hz;
  return Array.from({ length: n }, () => base + (rnd() - 0.5) * 2 * jitterMs);
}

describe('estimateRefreshHz', () => {
  it('falls back to 60 for an empty or all-invalid series', () => {
    expect(estimateRefreshHz([])).toBe(60);
    expect(estimateRefreshHz([0, -5, NaN, Infinity, -Infinity])).toBe(60);
  });

  it('snaps a jittery 60 Hz series to 60', () => {
    expect(estimateRefreshHz(deltas(60, 40))).toBe(60);
  });

  it('snaps a jittery 120 Hz series to 120', () => {
    expect(estimateRefreshHz(deltas(120, 40))).toBe(120);
  });

  it('snaps a jittery 144 Hz series to 144', () => {
    expect(estimateRefreshHz(deltas(144, 40))).toBe(144);
  });

  it('is robust to a minority of outliers (dropped/duplicated frames)', () => {
    const clean = deltas(60, 40);
    // Every 10th frame is an 8x hitch, and a couple are 0 vsync ticks — the median shrugs both off.
    const withOutliers = clean.map((d, i) => (i % 10 === 0 ? d * 8 : i % 13 === 0 ? d * 0.05 : d));
    expect(estimateRefreshHz(withOutliers)).toBe(60);
  });

  it('rounds an odd rate that is not within 5 % of any common one', () => {
    // 85 Hz sits ~13 % from 75 and ~5.6 % from 90 — outside the 5 % tolerance either way.
    expect(estimateRefreshHz(deltas(85, 40, 0.02))).toBe(85);
  });

  it('snaps a slightly-off rate within 5 % tolerance to the nearest common one', () => {
    // 59 Hz sits ~1.7 % from 60 — well inside tolerance.
    expect(estimateRefreshHz(deltas(59, 40, 0.02))).toBe(60);
    // 136 Hz sits 20/144 ≈ 5.6 % from 144 (just outside) and further from every other rate.
    expect(estimateRefreshHz(deltas(136, 40, 0.02))).toBe(136);
  });

  it('handles a single sample', () => {
    expect(estimateRefreshHz([1000 / 120])).toBe(120);
  });
});

describe('RefreshMeter', () => {
  it('needs exactly 5 warm-up frames plus 30 samples before reporting, then stays null', () => {
    const meter = new RefreshMeter();
    const series = deltas(60, 35);
    const results = series.map((d) => meter.feed(d));
    expect(results.slice(0, 34).every((r) => r === null)).toBe(true);
    expect(results[34]).toBe(60);
    // One-shot: further good frames never report again.
    expect(meter.feed(1000 / 60)).toBeNull();
    expect(meter.feed(1000 / 60)).toBeNull();
  });

  it('ignores the first 5 frames regardless of their value', () => {
    const meter = new RefreshMeter();
    // Junk warm-up frames that would never resemble 60 Hz if they counted as samples.
    for (const d of [1, 9999, 0, -3, 500]) expect(meter.feed(d)).toBeNull();
    const clean = deltas(60, 30);
    const results = clean.map((d) => meter.feed(d));
    expect(results.slice(0, -1).every((r) => r === null)).toBe(true);
    expect(results.at(-1)).toBe(60);
  });

  it('ignores hitches over 250 ms without counting them toward the 30 samples', () => {
    const meter = new RefreshMeter();
    const warmup = Array(5).fill(1000 / 60) as number[];
    const clean = deltas(60, 30);
    const feed = [...warmup, 400, ...clean];
    const results = feed.map((d) => meter.feed(d));
    expect(results[5]).toBeNull(); // the hitch itself never reports
    expect(results.filter((r) => r !== null)).toEqual([60]);
    expect(results.at(-1)).toBe(60); // the 30th clean sample, one frame later than without the hitch
  });

  it('measures 120 and 144 Hz through the meter too', () => {
    for (const hz of [120, 144]) {
      const meter = new RefreshMeter();
      const series = deltas(hz, 40, 0.2, hz);
      const hits = series.map((d) => meter.feed(d)).filter((r): r is number => r !== null);
      expect(hits).toEqual([hz]);
    }
  });

  it('is robust to outliers mixed into the live stream', () => {
    const meter = new RefreshMeter();
    const warmup = Array(5).fill(1000 / 60) as number[];
    const clean = deltas(60, 30).map((d, i) => (i % 9 === 0 ? d * 4 : d));
    const hits = [...warmup, ...clean]
      .map((d) => meter.feed(d))
      .filter((r): r is number => r !== null);
    expect(hits).toEqual([60]);
  });
});
