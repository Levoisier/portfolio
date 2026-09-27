/**
 * Typed view of `art/manifest.json` — the asset registry shared by the asset
 * pipeline, the game loader and the docs (ASSETS.md must list the same ids).
 * Game code references media ONLY by these ids, never by file path.
 */
import manifestJson from '../../art/manifest.json' with { type: 'json' };

export const ASSET_KINDS = ['strip', 'sprite', 'set', 'layer', 'tile-strip', 'backdrop'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export type Wave = 'A' | 'B' | 'C' | 'D';
/** `high` assets load only on the high quality tier (desktop ambience). */
export type AssetTier = 'all' | 'high';
export type Size = readonly [width: number, height: number];
/** `[x, y, w, h]` in final art px; `w = h = 0` marks a point. */
export type Rect = readonly [x: number, y: number, w: number, h: number];

interface AssetBase {
  id: string;
  kind: AssetKind;
  /** Media delivery wave (see ASSETS.md). */
  wave: Wave;
  /** Needed for launch; optional assets get no placeholder and the game falls back. */
  required: boolean;
  tier: AssetTier;
  /**
   * Where the game draws on the art (sign text, screen content, block window, flame).
   * Values are the placeholder geometry; the pipeline re-detects them on delivered art
   * and the game reads the resolved values from `public/game/assets.json`.
   */
  anchors?: Record<string, Rect>;
  /** Black flood-fill threshold override for `art/raw/<id>.png` (default: border max + 4). */
  backgroundThreshold?: number;
  /**
   * `scenery`: snap to the whole palette, scenery ramps included (DECISIONS.md → _Scenery
   * palette_). Omitted: the core ramps only, so characters and UI art never pick up a moss green.
   */
  palette?: 'scenery';
}

export interface StripAsset extends AssetBase {
  kind: 'strip';
  /** Fixed frame cell every frame is packed into. */
  cell: Size;
  /** Animation frames (a green-screen delivery's ruler frame is not counted). */
  frames: number;
  /** y of the line the art stands on; the lowest opaque row is `baseline − 1`. */
  baseline: number;
  /**
   * When the source is green-screen, its leftmost frame is a size reference (scaled to 48 px,
   * then dropped). Transparent sources never carry one.
   */
  ruler?: boolean;
  /** Clip guard: the report warns when a frame is taller than this + 2 px. */
  targetHeight: number;
  /** 0 = frames are states, not an auto-playing animation. */
  fps: number;
  loop: boolean;
  frameNames?: string[];
}

export interface SpriteAsset extends AssetBase {
  kind: 'sprite';
  /** Maximum height; the sprite is fitted inside `maxSize` preserving aspect. */
  targetHeight: number;
  maxSize: Size;
  /** `[x, y, w, h]` in **source** px: only this part of the raw file is used (e.g. a bridge
   * delivered between two terrain ends). */
  sourceCrop?: Rect;
}

export interface SetItem {
  name: string;
  /** Final box: the item is fitted into it preserving aspect and bottom-centred… */
  size: Size;
  /**
   * …unless it must fill the box width exactly (it tiles or collides): scaled to `size[0]`
   * wide, then aligned to the box's `top` (platforms) or `bottom` (fence panels).
   */
  fill?: 'top' | 'bottom';
  /** Anchors relative to the item's `size` box (e.g. the vault wall's `doorway`). */
  anchors?: Record<string, Rect>;
}

export interface SetAsset extends AssetBase {
  kind: 'set';
  /** Separate props in one source image, in reading order (rows top→bottom, left→right). */
  items: SetItem[];
}

export interface LayerAsset extends AssetBase {
  kind: 'layer';
  size: Size;
  seamless: 'x';
  scrollFactor: number;
}

export interface TileStripAsset extends AssetBase {
  kind: 'tile-strip';
  size: Size;
  seamless: 'x';
}

/**
 * A full-screen painted background, drawn in screen space behind everything. Scaled to
 * `size[0]` wide, then padded at the top with its own top-row color up to `size[1]`, so it covers
 * any view height without resampling at runtime.
 */
export interface BackdropAsset extends AssetBase {
  kind: 'backdrop';
  size: Size;
}

export type AssetEntry =
  | StripAsset
  | SpriteAsset
  | SetAsset
  | LayerAsset
  | TileStripAsset
  | BackdropAsset;

export interface AssetManifest {
  version: number;
  grid: number;
  assets: AssetEntry[];
}

const fail = (msg: string): never => {
  throw new Error(`[art/manifest.json] ${msg}`);
};

const isSize = (v: unknown): v is Size =>
  Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n > 0);

const isRect = (v: unknown): v is Rect =>
  Array.isArray(v) && v.length === 4 && v.every((n) => Number.isInteger(n) && n >= 0);

/** The box anchors must fit in: the cell, the max sprite size, or the layer size. */
function geometryOf(a: Record<string, unknown>): Size | undefined {
  if (a.kind === 'strip') return a.cell as Size;
  if (a.kind === 'sprite') return [(a.maxSize as Size)[0], a.targetHeight as number];
  if (a.kind === 'layer' || a.kind === 'tile-strip' || a.kind === 'backdrop') return a.size as Size;
  return undefined;
}

/** Validates the raw JSON shape; throws with a readable message on the first problem. */
export function parseManifest(json: unknown): AssetManifest {
  if (typeof json !== 'object' || json === null) return fail('not an object');
  const { version, grid, assets } = json as Record<string, unknown>;
  if (typeof version !== 'number') fail('missing version');
  if (typeof grid !== 'number') fail('missing grid');
  if (!Array.isArray(assets)) return fail('assets must be an array');

  const seen = new Set<string>();
  for (const a of assets as Record<string, unknown>[]) {
    const id = String(a.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fail(`id "${id}" is not kebab-case`);
    if (seen.has(id)) fail(`duplicate id "${id}"`);
    seen.add(id);
    if (!ASSET_KINDS.includes(a.kind as AssetKind)) fail(`${id}: unknown kind ${String(a.kind)}`);
    if (!['A', 'B', 'C', 'D'].includes(String(a.wave))) fail(`${id}: bad wave`);
    if (typeof a.required !== 'boolean') fail(`${id}: required must be boolean`);
    if (!['all', 'high'].includes(String(a.tier))) fail(`${id}: bad tier`);

    switch (a.kind) {
      case 'strip': {
        if (!isSize(a.cell)) fail(`${id}: cell must be [w, h]`);
        const [, cellH] = a.cell as Size;
        if (!Number.isInteger(a.frames) || (a.frames as number) < 1) fail(`${id}: frames`);
        const { baseline, targetHeight } = a as { baseline: unknown; targetHeight: unknown };
        if (!Number.isInteger(baseline) || (baseline as number) > cellH)
          fail(`${id}: baseline must be an integer ≤ the cell height`);
        if (typeof targetHeight !== 'number' || targetHeight > (baseline as number))
          fail(`${id}: targetHeight must fit above the baseline`);
        if (typeof a.fps !== 'number' || typeof a.loop !== 'boolean') fail(`${id}: fps/loop`);
        if (a.ruler !== undefined && typeof a.ruler !== 'boolean') fail(`${id}: ruler`);
        if (a.frameNames !== undefined) {
          if (!Array.isArray(a.frameNames) || a.frameNames.length !== a.frames)
            fail(`${id}: frameNames must have one name per frame`);
        }
        break;
      }
      case 'sprite':
        if (typeof a.targetHeight !== 'number') fail(`${id}: targetHeight`);
        if (!isSize(a.maxSize)) fail(`${id}: maxSize must be [w, h]`);
        if ((a.targetHeight as number) > (a.maxSize as Size)[1])
          fail(`${id}: targetHeight must fit in maxSize`);
        if (a.sourceCrop !== undefined && !isRect(a.sourceCrop))
          fail(`${id}: sourceCrop must be [x, y, w, h]`);
        break;
      case 'backdrop':
        if (!isSize(a.size)) fail(`${id}: size must be [w, h]`);
        break;
      case 'set':
        if (!Array.isArray(a.items) || a.items.length === 0) fail(`${id}: items`);
        for (const item of a.items as Record<string, unknown>[]) {
          if (typeof item.name !== 'string' || !isSize(item.size))
            fail(`${id}: every item needs a name and a size [w, h]`);
          if (item.fill !== undefined && item.fill !== 'top' && item.fill !== 'bottom')
            fail(`${id}: ${String(item.name)} fill must be "top" or "bottom"`);
          for (const [name, rect] of Object.entries(
            (item.anchors ?? {}) as Record<string, unknown>
          )) {
            const [w, h] = item.size as Size;
            if (!isRect(rect) || rect[0] + rect[2] > w || rect[1] + rect[3] > h)
              fail(
                `${id}: ${String(item.name)} anchor "${name}" must be [x, y, w, h] inside its size`
              );
          }
        }
        break;
      case 'layer':
      case 'tile-strip':
        if (!isSize(a.size)) fail(`${id}: size must be [w, h]`);
        if ((a.size as Size)[0] % (grid as number) !== 0) fail(`${id}: width must be grid-aligned`);
        if (a.seamless !== 'x') fail(`${id}: seamless must be "x"`);
        if (a.kind === 'layer' && typeof a.scrollFactor !== 'number') fail(`${id}: scrollFactor`);
        break;
    }

    if (a.palette !== undefined && a.palette !== 'scenery')
      fail(`${id}: palette must be "scenery" when set`);

    if (
      a.backgroundThreshold !== undefined &&
      (!Number.isInteger(a.backgroundThreshold) ||
        (a.backgroundThreshold as number) < 0 ||
        (a.backgroundThreshold as number) > 64)
    )
      fail(`${id}: backgroundThreshold must be an integer 0–64`);

    if (a.anchors !== undefined) {
      const box = geometryOf(a);
      if (!box) fail(`${id}: anchors are only supported on strips, sprites, layers and backdrops`);
      for (const [name, rect] of Object.entries(a.anchors as Record<string, unknown>)) {
        if (!isRect(rect)) fail(`${id}: anchor "${name}" must be [x, y, w, h]`);
        const [x, y, w, h] = rect as Rect;
        if (box && (x + w > box[0] || y + h > box[1]))
          fail(`${id}: anchor "${name}" out of bounds`);
      }
    }
  }
  return json as AssetManifest;
}

export const ASSET_MANIFEST: AssetManifest = parseManifest(manifestJson);

export function getAsset(id: string): AssetEntry {
  const entry = ASSET_MANIFEST.assets.find((a) => a.id === id);
  if (!entry) throw new Error(`Unknown asset id "${id}" — add it to art/manifest.json first`);
  return entry;
}
