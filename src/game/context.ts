/** Session state shared by main.ts and the scenes (no Phaser import). */
import type { RuntimeManifest } from '../assets/runtime';
import type { PlayerDebugState } from '../shared/debug';
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
  /** The measured display refresh Arcade steps at; `LAYOUT_STEP_HZ` until `WorldScene` measures it. */
  physicsHz: number;
  /** Kept for the debug hook's `getState()` (Phase 3 — ARCHITECTURE.md → Player). */
  player: PlayerDebugState | null;
  camera: { scrollX: number; scrollY: number };
  /** The zone the player is currently in (`world/layout.ts` id), also emitted as `zone:enter`. */
  zone: string;
  /** Whether the classified wing's vault has rolled its door aside yet (Phase 8 — the vault has
   * no DOM panel of its own, so the debug hook's `getState()` reads this directly). */
  vaultOpen: boolean;
  /** The painted backdrop on screen (`fx/scenery.ts`), or null when the code sky draws. */
  backdrop: string | null;
  /** Set by `WorldScene.create()`; the debug hook's `teleport(x)` calls through it. */
  teleport?: (x: number) => void;
  /** Set by `WorldScene.create()`; the debug hook's `openStation(id)` calls through it —
   * teleports to the station then emits `station:open` (Phase 5). */
  openStation?: (id: string) => void;
}

export const REGISTRY_KEY = 'ctx';
