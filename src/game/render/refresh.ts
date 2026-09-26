/**
 * Display refresh measurement, so Arcade can step once per displayed frame (`world.setFPS`):
 * at the default 60 Hz a 120/144 Hz screen moves the body only on some frames, which reads as
 * judder however clean the rounding is (ARCHITECTURE.md → Player). Pure; feed it frame deltas.
 */

/** Refresh rates real panels run at; an estimate within 5 % of one snaps to it. */
export const COMMON_REFRESH_HZ = [
  30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240,
] as const;
const SNAP_TOLERANCE = 0.05;
/** Startup frames are irregular (compile, first uploads, the loading screen fading out). */
const SKIP_FRAMES = 5;
/** Longer than this is a hitch or a background tab, not a refresh interval. */
const MAX_DELTA_MS = 250;
const SAMPLES = 30;
const FALLBACK_HZ = 60;

/** The median frame interval as a rate — the median shrugs off dropped frames and GC pauses. */
export function estimateRefreshHz(deltasMs: readonly number[]): number {
  const sorted = deltasMs.filter((d) => Number.isFinite(d) && d > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return FALLBACK_HZ;
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  const hz = 1000 / median;
  let nearest: number = COMMON_REFRESH_HZ[0];
  for (const rate of COMMON_REFRESH_HZ)
    if (Math.abs(hz - rate) / rate < Math.abs(hz - nearest) / nearest) nearest = rate;
  return Math.abs(hz - nearest) / nearest <= SNAP_TOLERANCE ? nearest : Math.round(hz);
}

/**
 * Collects frame deltas and reports the refresh rate once (after `SAMPLES` usable frames), then
 * `null` forever. Feed it the loop's raw delta (`game.loop.rawDelta`), not the smoothed one.
 * A new meter measures again (e.g. after the window moves to another monitor).
 */
export class RefreshMeter {
  private frames = 0;
  private samples: number[] = [];
  private done = false;

  feed(deltaMs: number): number | null {
    if (this.done) return null;
    if (++this.frames <= SKIP_FRAMES) return null;
    if (!(deltaMs > 0) || deltaMs > MAX_DELTA_MS) return null;
    this.samples.push(deltaMs);
    if (this.samples.length < SAMPLES) return null;
    this.done = true;
    return estimateRefreshHz(this.samples);
  }
}
