/**
 * Contract for `public/game/assets.json` — written by the asset pipeline (Phase 1),
 * read by the shell at build time and by BootScene (Phase 2). Types only: both sides
 * import them, so the format cannot drift between two agents working in parallel.
 */
import type { AssetKind, AssetTier, Rect } from './registry';

/**
 * Where the served file came from. `missing` = an optional asset with no delivery and no
 * reference frames: no file is written and the game applies its documented fallback.
 */
export type AssetSource = 'raw' | 'reference' | 'placeholder' | 'missing';

interface RuntimeBase {
  id: string;
  kind: AssetKind;
  tier: AssetTier;
  required: boolean;
  source: Exclude<AssetSource, 'missing'>;
  /** `/game/<id>.png`. */
  url: string;
  /**
   * Resolved anchors in final art px (detected on delivered art, else the manifest defaults).
   * For strips, a rect anchor is the union across frames (it covers every frame's position).
   */
  anchors?: Record<string, Rect>;
  /** Human-readable pipeline warnings (also printed in the report). */
  warnings: string[];
}

export interface RuntimeStrip extends RuntimeBase {
  kind: 'strip';
  /** Load with `this.load.spritesheet(id, url, { frameWidth, frameHeight })`. */
  frameWidth: number;
  frameHeight: number;
  /** The frame count actually packed — may differ from the manifest for interim art. */
  frames: number;
  baseline: number;
  fps: number;
  loop: boolean;
  frameNames?: string[];
}

export interface RuntimeSprite extends RuntimeBase {
  kind: 'sprite';
  width: number;
  height: number;
}

export interface RuntimeSet extends RuntimeBase {
  kind: 'set';
  /** Phaser JSON-hash atlas; frame keys are the item names. `url` is the atlas image. */
  atlasUrl?: string;
  items: Record<string, { w: number; h: number; anchors?: Record<string, Rect> }>;
}

export interface RuntimeLayer extends RuntimeBase {
  kind: 'layer' | 'tile-strip' | 'backdrop';
  width: number;
  height: number;
  scrollFactor?: number;
}

/** An optional asset with nothing to serve: check `source === 'missing'` before `kind`. */
export interface RuntimeMissing {
  id: string;
  kind: AssetKind;
  tier: AssetTier;
  required: false;
  source: 'missing';
  warnings: string[];
}

export type RuntimeAsset =
  | RuntimeStrip
  | RuntimeSprite
  | RuntimeSet
  | RuntimeLayer
  | RuntimeMissing;

export interface RuntimeManifest {
  version: 1;
  /** Hash of all pipeline inputs; changes whenever any output may have changed. */
  hash: string;
  assets: Record<string, RuntimeAsset>;
}
