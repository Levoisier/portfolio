/** Session state shared by main.ts and the scenes (no Phaser import). */
import type { RuntimeManifest } from '../assets/runtime';
import type { Tier } from '../shared/bus';
import type { LayoutMode } from '../shared/layout-mode';
import type { Viewport } from './render/zoom';

export interface GameContext {
  manifest: RuntimeManifest | null;
  tier: Tier;
  /** `?tier=` pinned it: no runtime downgrade. */
  tierPinned: boolean;
  mode: LayoutMode;
  viewport: Viewport;
  dpr: number;
  debug: boolean;
  ready: boolean;
  paused: boolean;
  pixelFont: boolean;
  pandaTexture: string;
}

export const REGISTRY_KEY = 'ctx';
