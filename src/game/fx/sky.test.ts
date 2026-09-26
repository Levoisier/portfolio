import { describe, expect, it } from 'vitest';
import {
  SKY_BANDS,
  bandColorAt,
  makeStarField,
  moonAlphaAt,
  rampColor,
  skyPhaseAt,
  skyStopsFromZones,
  starDensityAt,
  sunAlphaAt,
  type SkyStop,
} from './sky';
import { WORLD_LAYOUT, WORLD_W } from '../world/layout';

const STOPS = skyStopsFromZones(WORLD_LAYOUT.zones, WORLD_W);
/** The first `[from, to]` pair straddling an actual mood change — used by every test below that
 * needs a real transition bracket instead of a flat one. */
const firstChange = STOPS.findIndex((s, i) => i > 0 && s.mood !== STOPS[i - 1]!.mood);
const CHANGE: [SkyStop, SkyStop] = [STOPS[firstChange - 1]!, STOPS[firstChange]!];

describe('skyStopsFromZones', () => {
  it('starts flat, ends flat, and straddles every mood change with a [from, to] pair', () => {
    // gate→night, night→darkest-night, darkest-night→pre-dawn, pre-dawn→sunrise: 4 changes,
    // 2 stops each, plus the opening and closing flat stops.
    expect(STOPS).toHaveLength(1 + 4 * 2 + 1);
    expect(STOPS[0]).toEqual({ x: 0, mood: 'deep-night' });
    expect(STOPS.at(-1)).toEqual({ x: WORLD_W, mood: 'sunrise' });
  });

  it('is strictly increasing in x (no inverted or overlapping brackets)', () => {
    for (let i = 1; i < STOPS.length; i++) expect(STOPS[i]!.x).toBeGreaterThan(STOPS[i - 1]!.x);
  });

  it('holds a flat, pure mood through the middle of the classified wing and the lab', () => {
    const classified = WORLD_LAYOUT.zones.find((z) => z.id === 'classified')!;
    const lab = WORLD_LAYOUT.zones.find((z) => z.id === 'lab')!;
    expect(skyPhaseAt((classified.x0 + classified.x1) / 2, STOPS)).toMatchObject({
      a: 'darkest-night',
      b: 'darkest-night',
    });
    expect(skyPhaseAt((lab.x0 + lab.x1) / 2, STOPS)).toMatchObject({
      a: 'pre-dawn',
      b: 'pre-dawn',
    });
  });
});

describe('skyPhaseAt', () => {
  it('clamps outside the world to the first/last mood with t = 0', () => {
    expect(skyPhaseAt(-100, STOPS)).toMatchObject({ a: 'deep-night', b: 'deep-night', t: 0 });
    expect(skyPhaseAt(WORLD_W + 500, STOPS)).toMatchObject({ a: 'sunrise', b: 'sunrise', t: 0 });
  });

  it('rises monotonically from just past one stop to the next, reaching t = 1 exactly there', () => {
    const [a, b] = CHANGE;
    // `a.x` itself is the tail of the flat run before it (same mood on both sides — a harmless
    // tie the ordered-dither color functions don't care about); start just past it instead.
    let last = -1;
    for (let x = a.x + 1; x <= b.x; x += 7) {
      const { t } = skyPhaseAt(x, STOPS);
      expect(t).toBeGreaterThanOrEqual(last);
      last = t;
    }
    expect(skyPhaseAt(b.x, STOPS)).toMatchObject({ a: a.mood, b: b.mood, t: 1 });
  });
});

describe('bandColorAt — ordered dither, no banding jumps', () => {
  const [a, b] = CHANGE;

  it('every band matches mood a at the start of a bracket and mood b at its end', () => {
    for (let band = 0; band < SKY_BANDS; band++) {
      expect(bandColorAt(a.x, STOPS, band)).toBe(rampColor(a.mood, band));
      expect(bandColorAt(b.x, STOPS, band)).toBe(rampColor(b.mood, band));
    }
  });

  it('flips band by band across the transition, never all at once', () => {
    const span = b.x - a.x;
    const flippedCounts: number[] = [];
    for (let step = 0; step <= 8; step++) {
      const x = a.x + (span * step) / 8;
      const flipped = Array.from(
        { length: SKY_BANDS },
        (_, band) => bandColorAt(x, STOPS, band) === rampColor(b.mood, band)
      ).filter(Boolean).length;
      flippedCounts.push(flipped);
    }
    // Monotonic: once a band has flipped to `b`, it never flips back as x keeps increasing.
    for (let i = 1; i < flippedCounts.length; i++)
      expect(flippedCounts[i]).toBeGreaterThanOrEqual(flippedCounts[i - 1]!);
    // Gradual: at least one intermediate sample is neither all-a nor all-b (no single jump).
    expect(flippedCounts.some((n) => n > 0 && n < SKY_BANDS)).toBe(true);
    expect(flippedCounts[0]).toBe(0);
    expect(flippedCounts.at(-1)).toBe(SKY_BANDS);
  });
});

describe('starDensityAt / moonAlphaAt / sunAlphaAt', () => {
  it('stay within [0, 1] and hit the exact mood values at each stop', () => {
    for (const stop of STOPS) {
      for (const fn of [starDensityAt, moonAlphaAt, sunAlphaAt]) {
        const v = fn(stop.x, STOPS);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    // The gate is the darkest, brightest-starred moment; the lookout has none.
    expect(starDensityAt(0, STOPS)).toBeCloseTo(1);
    expect(starDensityAt(WORLD_W, STOPS)).toBe(0);
    // The moon is out at the gate and gone by the classified wing's total blackout.
    expect(moonAlphaAt(0, STOPS)).toBe(1);
    const classified = WORLD_LAYOUT.zones.find((z) => z.id === 'classified')!;
    expect(moonAlphaAt(classified.x1, STOPS)).toBe(0);
    // The sun only appears at the very end.
    expect(sunAlphaAt(0, STOPS)).toBe(0);
    expect(sunAlphaAt(WORLD_W, STOPS)).toBe(1);
  });
});

describe('makeStarField', () => {
  it('is deterministic and produces valid fractions', () => {
    const a = makeStarField(24);
    const b = makeStarField(24);
    expect(a).toEqual(b);
    expect(a).toHaveLength(24);
    for (const star of a) {
      expect(star.fx).toBeGreaterThanOrEqual(0);
      expect(star.fx).toBeLessThan(1);
      expect(star.fy).toBeGreaterThanOrEqual(0);
      expect(star.fy).toBeLessThan(0.7);
      expect(star.priority).toBeGreaterThanOrEqual(0);
      expect(star.priority).toBeLessThan(1);
    }
  });
});
