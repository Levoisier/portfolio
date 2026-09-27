/**
 * The single source of truth for ambience decisions, and one of the two modules allowed to
 * inspect the device (AGENTS.md → Golden Rule 8). Pure decisions + a thin browser reader.
 */
import type { Tier } from '../shared/bus';

export type { Tier };

export interface TierInputs {
  finePointer: boolean;
  /** CSS px. */
  viewportWidth: number;
  saveData: boolean;
  /** The `?tier=` query value, if any. */
  pinned: string | null;
}

export interface TierDecision {
  tier: Tier;
  /** A pinned tier never downgrades at runtime. */
  pinned: boolean;
}

export function decideTier({
  finePointer,
  viewportWidth,
  saveData,
  pinned,
}: TierInputs): TierDecision {
  if (pinned === 'high' || pinned === 'low') return { tier: pinned, pinned: true };
  const high = finePointer && viewportWidth >= 1024 && !saveData;
  return { tier: high ? 'high' : 'low', pinned: false };
}

export interface TierFlags {
  /** Parallax layers drawn (bg-far, bg-mid, bg-fore). */
  parallaxLayers: number;
  /** Multiplier on particle counts. */
  particleScale: number;
  /** WebGL filters (glow, bloom) enabled. */
  filters: boolean;
  /** Animated props farther than this from the camera centre (art px) are paused. */
  animatedPropRadius: number;
}

export function tierFlags(tier: Tier): TierFlags {
  return tier === 'high'
    ? { parallaxLayers: 3, particleScale: 1, filters: true, animatedPropRadius: Infinity }
    : { parallaxLayers: 2, particleScale: 0.35, filters: false, animatedPropRadius: 480 };
}

/** Assets tagged `tier: "high"` load only on the high tier. */
export function loadsOnTier(assetTier: 'all' | 'high', tier: Tier): boolean {
  return assetTier === 'all' || tier === 'high';
}

/**
 * Runtime guard: the high tier averaging < 50 fps over a 3 s window downgrades to low for the
 * session. Feed it every frame's delta (ms); `true` means "downgrade now" (reported once).
 */
export class FpsGuard {
  private elapsed = 0;
  private frames = 0;
  private tripped = false;

  private readonly minFps: number;
  private readonly windowMs: number;

  constructor(minFps = 50, windowMs = 3000) {
    this.minFps = minFps;
    this.windowMs = windowMs;
  }

  feed(deltaMs: number): boolean {
    if (this.tripped) return false;
    // A hidden tab or a debugger pause produces one huge delta; it is not a slow frame rate.
    if (deltaMs > 250) {
      this.elapsed = this.frames = 0;
      return false;
    }
    this.elapsed += deltaMs;
    this.frames += 1;
    if (this.elapsed < this.windowMs) return false;
    const fps = (this.frames * 1000) / this.elapsed;
    this.elapsed = this.frames = 0;
    if (fps >= this.minFps) return false;
    this.tripped = true;
    return true;
  }
}

interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean };
}

export function detectTier(search: string = location.search): TierDecision {
  return decideTier({
    finePointer: matchMedia('(pointer: fine)').matches,
    viewportWidth: innerWidth,
    saveData: (navigator as NavigatorWithConnection).connection?.saveData === true,
    pinned: new URLSearchParams(search).get('tier'),
  });
}
