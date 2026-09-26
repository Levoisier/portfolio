/**
 * Typed view of `art/manifest.json` — the asset registry shared by the asset
 * pipeline, the game loader and the docs (ASSETS.md must list the same ids).
 * Game code references media ONLY by these ids, never by file path.
 */
import manifestJson from '../../art/manifest.json';

export const ASSET_KINDS = ['strip', 'sprite', 'set', 'layer', 'tile-strip'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export type Wave = 'A' | 'B' | 'C' | 'D';
/** `high` assets load only on the high quality tier (desktop ambience). */
export type AssetTier = 'all' | 'high';
export type Size = readonly [width: number, height: number];

interface AssetBase {
  id: string;
  kind: AssetKind;
  /** Media delivery wave (see ASSETS.md). */
  wave: Wave;
  /** Needed for launch; optional assets degrade gracefully when absent. */
  required: boolean;
  tier: AssetTier;
}

export interface StripAsset extends AssetBase {
  kind: 'strip';
  /** Fixed frame cell every frame is packed into. */
  cell: Size;
  frames: number;
  /** Opaque height of the tallest frame after normalization. */
  targetHeight: number;
  /** 0 = frames are states, not an auto-playing animation. */
  fps: number;
  loop: boolean;
  frameNames?: string[];
}

export interface SpriteAsset extends AssetBase {
  kind: 'sprite';
  targetHeight: number;
  maxSize: Size;
}

export interface SetItem {
  name: string;
  targetHeight?: number;
  targetWidth?: number;
}

export interface SetAsset extends AssetBase {
  kind: 'set';
  /** Separate props in one source image, ordered left→right, top→bottom. */
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

export type AssetEntry = StripAsset | SpriteAsset | SetAsset | LayerAsset | TileStripAsset;

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
        if (typeof a.targetHeight !== 'number' || a.targetHeight > cellH)
          fail(`${id}: targetHeight must fit the cell`);
        if (typeof a.fps !== 'number' || typeof a.loop !== 'boolean') fail(`${id}: fps/loop`);
        if (a.frameNames !== undefined) {
          if (!Array.isArray(a.frameNames) || a.frameNames.length !== a.frames)
            fail(`${id}: frameNames must have one name per frame`);
        }
        break;
      }
      case 'sprite':
        if (typeof a.targetHeight !== 'number') fail(`${id}: targetHeight`);
        if (!isSize(a.maxSize)) fail(`${id}: maxSize must be [w, h]`);
        break;
      case 'set':
        if (!Array.isArray(a.items) || a.items.length === 0) fail(`${id}: items`);
        for (const item of a.items as SetItem[]) {
          if (!item.name || (item.targetHeight === undefined && item.targetWidth === undefined))
            fail(`${id}: every item needs a name and targetHeight or targetWidth`);
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
  }
  return json as AssetManifest;
}

export const ASSET_MANIFEST: AssetManifest = parseManifest(manifestJson);

export function getAsset(id: string): AssetEntry {
  const entry = ASSET_MANIFEST.assets.find((a) => a.id === id);
  if (!entry) throw new Error(`Unknown asset id "${id}" — add it to art/manifest.json first`);
  return entry;
}
