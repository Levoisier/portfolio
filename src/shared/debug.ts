/** Debug mode: `?debug` in the URL, or always in `pnpm dev`. */
import type { Lang } from '../content/types';
import type { EventName, Events, Tier } from './bus';
import type { LayoutMode } from './layout-mode';

export function isDebug(search: string = location.search): boolean {
  return import.meta.env.DEV || new URLSearchParams(search).has('debug');
}

/** Snapshot of the panda (Phase 3 — ARCHITECTURE.md → Player), read from `PandaSprite`. */
export interface PlayerDebugState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: string;
  anim: string;
  frame?: string;
  flipX: boolean;
  grounded: boolean;
}

export interface GameState {
  ready: boolean;
  /** The tab is hidden and the game loop is paused. */
  paused: boolean;
  tier: Tier;
  mode: LayoutMode;
  zoom: number;
  dpr: number;
  backingW: number;
  backingH: number;
  fps: number;
  lang: Lang;
  /** The in-world pixel font is registered and the prototype label drawn. */
  pixelFont: boolean;
  /** Texture the panda shows: an asset id, or the code-drawn placeholder. */
  pandaTexture: string;
  /** `null` for one tick before `WorldScene.create()` has placed the panda. */
  player: PlayerDebugState | null;
  camera: { scrollX: number; scrollY: number };
  /** The measured display refresh Arcade steps at (`world.setFPS`). */
  physicsHz: number;
}

/**
 * `window.__PORTFOLIO__` (debug only) — e2e drives the game through it instead of simulating
 * long walks. Phase 5 adds `openStation(id)`.
 */
export interface PortfolioHook {
  getState(): GameState;
  setTier(tier: Tier): void;
  /** Places the panda on the ground at `x`, zero velocity, camera snapped. */
  teleport(x: number): void;
  /** Passthrough onto the bus (e.g. `emit('ui:modal', { open: true })`) so e2e can simulate a
   * panel/menu opening without building one. */
  emit<K extends EventName>(event: K, payload: Events[K]): void;
}

declare global {
  interface Window {
    __PORTFOLIO__?: PortfolioHook;
  }
}
