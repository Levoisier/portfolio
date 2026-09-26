/** Debug mode: `?debug` in the URL, or always in `pnpm dev`. */
import type { Lang } from '../content/types';
import type { Tier } from './bus';
import type { LayoutMode } from './layout-mode';

export function isDebug(search: string = location.search): boolean {
  return import.meta.env.DEV || new URLSearchParams(search).has('debug');
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
}

/**
 * `window.__PORTFOLIO__` (debug only) — e2e drives the game through it instead of simulating
 * long walks. Phase 3 adds `teleport(x)`, Phase 5 `openStation(id)`.
 */
export interface PortfolioHook {
  getState(): GameState;
  setTier(tier: Tier): void;
}

declare global {
  interface Window {
    __PORTFOLIO__?: PortfolioHook;
  }
}
