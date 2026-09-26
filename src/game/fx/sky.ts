/**
 * Night → sunrise sky, screen-space, drawn from palette colors only (ASSETS.md → _Drawn in
 * code_). The color/star/moon/sun math is pure (unit-tested below); the renderer only ever
 * calls methods on the `Phaser.Scene` it is given (ARCHITECTURE.md → Input: "world builders …
 * receive the scene and use it"), so this file never imports `phaser` at runtime and can be
 * loaded by Vitest directly.
 */
import type Phaser from 'phaser';
import { type PaletteName, num } from '../../design/palette';
import type { Zone, SkyMood } from '../world/layout';

interface MoodDef {
  /** Top → horizon, in playback order; `bandColorAt` steps through these deliberately instead
   * of blending, so every on-screen pixel stays a real palette color. */
  ramp: readonly PaletteName[];
  /** 0…1 fraction of the star field visible in this mood. */
  starDensity: number;
  moon: boolean;
  sun: boolean;
}

const MOODS: Record<SkyMood, MoodDef> = {
  'deep-night': {
    ramp: ['ink-900', 'navy-950', 'navy-950', 'navy-900'],
    starDensity: 1,
    moon: true,
    sun: false,
  },
  night: {
    ramp: ['navy-950', 'navy-900', 'navy-900', 'navy-700'],
    starDensity: 0.85,
    moon: true,
    sun: false,
  },
  'darkest-night': {
    ramp: ['ink-900', 'ink-900', 'ink-800', 'ink-800'],
    starDensity: 1,
    moon: false,
    sun: false,
  },
  'pre-dawn': {
    ramp: ['navy-900', 'navy-700', 'dusk-700', 'dusk-500'],
    starDensity: 0.3,
    moon: false,
    sun: false,
  },
  sunrise: {
    ramp: ['navy-700', 'dusk-500', 'amber-600', 'amber-400'],
    starDensity: 0,
    moon: false,
    sun: true,
  },
};

/** Rows the gradient is stepped into; screen-space, so it is re-sliced to the view on resize. */
export const SKY_BANDS = 8;

/** Fraction of the view height the sunrise sun rests at once fully risen (0 = top). */
const SUN_REST_FRACTION = 0.35;

/** A dispersed flip order (not top-to-bottom) so a mood change dithers in gradually across the
 * whole gradient instead of wiping it band by band — "no banding jumps" (ARCHITECTURE.md). */
const BAND_ORDER = [0, 4, 2, 6, 1, 5, 3, 7] as const;

function bandThreshold(band: number): number {
  const rank = BAND_ORDER.indexOf(band as (typeof BAND_ORDER)[number]);
  return (rank + 0.5) / SKY_BANDS;
}

/** The mood's ramp color for screen row `band` (0 = top … `SKY_BANDS − 1` = the horizon). */
export function rampColor(mood: SkyMood, band: number): PaletteName {
  const ramp = MOODS[mood].ramp;
  const idx = Math.min(ramp.length - 1, Math.floor((band / SKY_BANDS) * ramp.length));
  return ramp[idx]!;
}

export interface SkyStop {
  x: number;
  mood: SkyMood;
}

/** Width (art px) a mood change cross-fades over, centred on the zone boundary — kept well
 * inside the narrowest zone (320 px) so most of a zone still reads as a flat, "pure" mood
 * instead of blending for its whole width (GAME_DESIGN.md's "darkest night" classified wing and
 * "pre-dawn" lab need to actually hold those moods, not just touch them at one edge). */
const TRANSITION_W = 240;

/** A flat stop at `x = 0`, a `[from, to]` pair straddling every mood change in `zones` (in
 * order), and a closing flat stop at `worldW`. */
export function skyStopsFromZones(zones: readonly Zone[], worldW: number): SkyStop[] {
  const stops: SkyStop[] = [{ x: 0, mood: zones[0]?.sky ?? 'night' }];
  const half = TRANSITION_W / 2;
  for (let i = 1; i < zones.length; i++) {
    const prev = zones[i - 1]!;
    const cur = zones[i]!;
    if (cur.sky !== prev.sky) {
      stops.push({ x: cur.x0 - half, mood: prev.sky });
      stops.push({ x: cur.x0 + half, mood: cur.sky });
    }
  }
  stops.push({ x: worldW, mood: stops.at(-1)?.mood ?? 'night' });
  return stops;
}

export interface SkyPhase {
  a: SkyMood;
  b: SkyMood;
  /** 0…1 within the bracket `[a, b]`; `a === b` (the ends of the world) always has `t = 0`. */
  t: number;
}

/** Where `x` sits between two mood stops. Outside the world, both ends of the bracket collapse
 * to the same mood (`t = 0`, matching `SkyPhase`'s contract) instead of extrapolating. */
export function skyPhaseAt(x: number, stops: readonly SkyStop[]): SkyPhase {
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  if (x <= first.x) return { a: first.mood, b: first.mood, t: 0 };
  if (x >= last.x) return { a: last.mood, b: last.mood, t: 0 };
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1]!;
    const cur = stops[i]!;
    if (x <= cur.x) {
      const span = cur.x - prev.x;
      const t = span > 0 ? (x - prev.x) / span : 1;
      return { a: prev.mood, b: cur.mood, t: Math.min(1, Math.max(0, t)) };
    }
  }
  return { a: last.mood, b: last.mood, t: 0 };
}

/** The band's color at `x`: `a`'s ramp before its threshold flips it to `b`'s (ordered dither
 * across the transition's width, not a single instant swap). */
export function bandColorAt(x: number, stops: readonly SkyStop[], band: number): PaletteName {
  const { a, b, t } = skyPhaseAt(x, stops);
  if (a === b) return rampColor(a, band);
  return t >= bandThreshold(band) ? rampColor(b, band) : rampColor(a, band);
}

function lerpFlag(a: boolean, b: boolean, t: number): number {
  return (a ? 1 : 0) + ((b ? 1 : 0) - (a ? 1 : 0)) * t;
}

export function starDensityAt(x: number, stops: readonly SkyStop[]): number {
  const { a, b, t } = skyPhaseAt(x, stops);
  return MOODS[a].starDensity + (MOODS[b].starDensity - MOODS[a].starDensity) * t;
}

export function moonAlphaAt(x: number, stops: readonly SkyStop[]): number {
  const { a, b, t } = skyPhaseAt(x, stops);
  return lerpFlag(MOODS[a].moon, MOODS[b].moon, t);
}

export function sunAlphaAt(x: number, stops: readonly SkyStop[]): number {
  const { a, b, t } = skyPhaseAt(x, stops);
  return lerpFlag(MOODS[a].sun, MOODS[b].sun, t);
}

/** Deterministic star field: each star has a fixed screen-space position (fraction of the sky
 * area) and a fixed "priority" — it shows once `starDensityAt()` clears its priority, so stars
 * fade in/out one at a time rather than all at once. Seeded (no `Math.random`): reruns and
 * screenshots are reproducible. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export interface Star {
  fx: number;
  fy: number;
  priority: number;
}

export function makeStarField(count: number, seed = 1337): Star[] {
  const rnd = seeded(seed);
  return Array.from({ length: count }, () => ({
    fx: rnd(),
    fy: rnd() * 0.7, // stars stay in the upper 70 % of the sky, clear of the horizon band
    priority: rnd(),
  }));
}

// ─── Phaser renderer (receives the scene; never imports phaser itself) ───────────────────────

export class SkyRenderer {
  private readonly stops: SkyStop[];
  private readonly stars: Star[];
  private readonly bandRects: Phaser.GameObjects.Rectangle[];
  private readonly starRects: Phaser.GameObjects.Rectangle[];
  private readonly moon: Phaser.GameObjects.Arc;
  private readonly sun: Phaser.GameObjects.Arc;
  private viewH = 0;

  /** `erasableSyntaxOnly` forbids parameter properties, so `scene` is a plain (unstored)
   * parameter: everything it builds is kept on `this` instead. */
  constructor(scene: Phaser.Scene, zones: readonly Zone[], worldW: number, starCount: number) {
    this.stops = skyStopsFromZones(zones, worldW);
    this.stars = makeStarField(starCount);
    this.bandRects = Array.from({ length: SKY_BANDS }, () =>
      scene.add
        .rectangle(0, 0, 1, 1, num('ink-900'))
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-100)
    );
    this.starRects = this.stars.map(() =>
      scene.add
        .rectangle(0, 0, 1, 1, num('paper-100'))
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(-95)
        .setVisible(false)
    );
    this.moon = scene.add
      .circle(0, 0, 8, num('paper-300'))
      .setScrollFactor(0)
      .setDepth(-96)
      .setAlpha(0);
    this.sun = scene.add
      .circle(0, 0, 12, num('amber-100'))
      .setScrollFactor(0)
      .setDepth(-96)
      .setAlpha(0);
  }

  /** Screen size changed (resize, DPR change, layout mode change): re-slice the bands and
   * reposition the fixed screen-space objects. */
  resize(viewW: number, viewH: number): void {
    this.viewH = viewH;
    const bandH = viewH / SKY_BANDS;
    this.bandRects.forEach((r, i) => {
      const y0 = Math.round(i * bandH);
      const y1 = Math.round((i + 1) * bandH);
      r.setPosition(0, y0);
      r.setSize(viewW, Math.max(1, y1 - y0));
    });
    this.starRects.forEach((r, i) => {
      const star = this.stars[i]!;
      r.setPosition(star.fx * viewW, star.fy * viewH);
    });
    this.moon.setPosition(viewW * 0.78, viewH * 0.18);
    this.sun.setPosition(viewW * 0.5, viewH);
  }

  /** Player x moved: recompute the mood phase and repaint every screen-space object. */
  update(x: number): void {
    this.bandRects.forEach((r, band) => r.setFillStyle(num(bandColorAt(x, this.stops, band))));
    const density = starDensityAt(x, this.stops);
    this.stars.forEach((star, i) => this.starRects[i]!.setVisible(star.priority < density));
    this.moon.setAlpha(moonAlphaAt(x, this.stops));
    const sunT = sunAlphaAt(x, this.stops);
    this.sun.setAlpha(sunT);
    // The sun rises as it fades in, from the horizon up to its resting height.
    this.sun.setY(this.viewH - (this.viewH - this.viewH * SUN_REST_FRACTION) * sunT);
  }

  destroy(): void {
    for (const r of this.bandRects) r.destroy();
    for (const r of this.starRects) r.destroy();
    this.moon.destroy();
    this.sun.destroy();
  }
}
