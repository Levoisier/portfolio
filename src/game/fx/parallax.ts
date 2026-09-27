/**
 * `bg-far` / `bg-mid` / `bg-fore` tiled behind the floor (ARCHITECTURE.md → World model).
 * Like `sky.ts`, this only ever calls methods on the `Phaser.Scene` and textures it is given —
 * never a runtime `import 'phaser'` — so it stays loadable outside a browser.
 */
import type Phaser from 'phaser';
import { type PaletteName, num } from '../../design/palette';
import type { RuntimeManifest } from '../../assets/runtime';
import type { Tier } from '../../shared/bus';
import { tierFlags } from '../quality';
import { MAX_VIEW_W } from '../render/zoom';

const LAYER_IDS = ['bg-far', 'bg-mid', 'bg-fore'] as const;
type LayerId = (typeof LAYER_IDS)[number];

/** Used when the manifest has no entry (no pipeline run) or it resolved to `missing`. */
const FALLBACK: Record<
  LayerId,
  { w: number; h: number; scrollFactor: number; color: PaletteName }
> = {
  'bg-far': { w: 640, h: 160, scrollFactor: 0.15, color: 'navy-900' },
  'bg-mid': { w: 640, h: 128, scrollFactor: 0.4, color: 'navy-700' },
  'bg-fore': { w: 640, h: 64, scrollFactor: 1.25, color: 'ink-900' },
};

/** Widest a layer's screen position can drift from its world position over the whole level, so
 * the tiled sprite never runs out of width before the camera reaches either end. */
function layerWidth(worldW: number, viewWMax: number, scrollFactor: number): number {
  return Math.ceil(worldW * Math.max(1, scrollFactor)) + viewWMax;
}

interface Layer {
  id: LayerId;
  sprite: Phaser.GameObjects.TileSprite;
  /** The manifest's own factor (before any reduced-motion adjustment). */
  baseScrollFactor: number;
}

export interface ParallaxHandle {
  layers: Layer[];
}

/** The pipeline's documented fallback for a layer with nothing to load: a transparent canvas
 * with a flat skyline block in the bottom 40 % (ARCHITECTURE.md → Asset pipeline). */
function ensureLayerPlaceholder(scene: Phaser.Scene, id: LayerId, w: number, h: number): string {
  const key = `${id}-placeholder`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    const bandH = Math.round(h * 0.4);
    g.fillStyle(num(FALLBACK[id].color)).fillRect(0, h - bandH, w, bandH);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return key;
}

/** Builds the layers the current tier shows (`tierFlags().parallaxLayers`: 2 on low, 3 on high),
 * skipping an optional layer that resolved to `missing`. Bottom-aligned at `groundY`, in world
 * space (normal `scrollFactorY`), with the manifest's `scrollFactor` driving only the horizontal
 * parallax — the classic side-scroller technique. */
export function buildParallax(
  scene: Phaser.Scene,
  manifest: RuntimeManifest | null,
  tier: Tier,
  worldW: number,
  groundY: number,
  viewWMax = MAX_VIEW_W
): ParallaxHandle {
  const activeCount = tierFlags(tier).parallaxLayers;
  const layers: Layer[] = [];
  LAYER_IDS.forEach((id, i) => {
    if (i >= activeCount) return;
    const asset = manifest?.assets[id];
    if (asset && asset.source === 'missing') return;
    const fallback = FALLBACK[id];
    const w = asset && 'width' in asset ? asset.width : fallback.w;
    const h = asset && 'height' in asset ? asset.height : fallback.h;
    const scrollFactor =
      asset && 'scrollFactor' in asset && asset.scrollFactor !== undefined
        ? asset.scrollFactor
        : fallback.scrollFactor;
    const key = scene.textures.exists(id) ? id : ensureLayerPlaceholder(scene, id, w, h);
    const width = layerWidth(worldW, viewWMax, scrollFactor);
    const sprite = scene.add
      .tileSprite(0, groundY, width, h, key)
      .setOrigin(0, 1)
      .setScrollFactor(scrollFactor, 1)
      .setDepth(-80 + i * 10);
    layers.push({ id, sprite, baseScrollFactor: scrollFactor });
  });
  return { layers };
}

/** `prefers-reduced-motion`: lower the parallax differential to 0.3× (ARCHITECTURE.md → Motion
 * preference) instead of removing it — the layers still read as background, just steadier. */
export function applyParallaxMotion(handle: ParallaxHandle, reduced: boolean): void {
  for (const layer of handle.layers) {
    const differential = layer.baseScrollFactor - 1;
    const factor = reduced ? 1 + differential * 0.3 : layer.baseScrollFactor;
    layer.sprite.setScrollFactor(factor, 1);
  }
}
