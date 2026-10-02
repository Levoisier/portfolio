/**
 * Asset pipeline core: turns one manifest entry into normalized output + its runtime entry.
 * Spec: ARCHITECTURE.md → Asset pipeline. Pure apart from reading source files.
 */
import { existsSync } from 'node:fs';
import type {
  AssetEntry,
  BackdropAsset,
  Rect,
  SetAsset,
  SpriteAsset,
  StripAsset,
} from '../../src/assets/registry.ts';
import type { AssetSource, RuntimeAsset, RuntimeStrip } from '../../src/assets/runtime.ts';

type Served = Exclude<AssetSource, 'missing'>;
import { DOORWAY, detectHole, detectPanel, detectSurface, detectTile } from './lib/anchors.ts';
import {
  cleanGreenEdges,
  detectBackground,
  floodBlack,
  keyChecker,
  keyGreen,
  type Background,
} from './lib/background.ts';
import {
  extractGroup,
  groupComponents,
  labelComponents,
  type Component,
} from './lib/components.ts';
import {
  createImg,
  crop,
  liftAbove,
  loadImg,
  opaqueBounds,
  resize,
  trim,
  type Img,
} from './lib/img.ts';
import type { PaletteSet } from './lib/color.ts';
import { buildAtlas } from './lib/output.ts';
import { cropToLoop, packStrip, placeBottomCentre, placeLayer, seamError } from './lib/pack.ts';
import { makePlaceholder } from './lib/placeholder.ts';
import {
  downscaleBy,
  removeOrphans,
  runGcd,
  snapToPalette,
  uniqueOpaqueColors,
  type SnapStats,
} from './lib/pixels.ts';

export interface Slices {
  source: string;
  backgroundThreshold: number;
  scale: number;
  shadow: { bandRows: number; minMax: number; maxMax: number; maxChroma: number };
  strips: Record<string, [number, number, number, number][]>;
  /** Interim strips built from one sliced frame instead of their own boxes (wins over `strips`). */
  derived?: Record<string, DerivedStrip>;
  /** Single poses on the sheet (the directional sprites), each with its own key threshold. */
  sprites?: Record<string, SheetSprite>;
}

export interface SheetSprite {
  box: [number, number, number, number];
  backgroundThreshold?: number;
}

/**
 * One frame of `strips[from]`, animated with `liftAbove`: frame f lifts the rows above each
 * `cuts[k]` (rows above the feet) by `lifts[f][k]` px — a breathing idle from a standing pose.
 */
export interface DerivedStrip {
  /** Source: frame `frame` of `strips[from]`… */
  from?: string;
  frame?: number;
  /** …or the `sprites` entry `sprite`, scaled so its art is `height` px tall. */
  sprite?: string;
  height?: number;
  /** Keep only the largest component (drops a detached paw the stride left floating). */
  bodyOnly?: boolean;
  cuts: number[];
  lifts: number[][];
}

export interface Output {
  runtime: RuntimeAsset;
  /** Image written to `/game/<id>.png` (absent for `missing`). */
  png?: Img;
  /** Phaser JSON-hash atlas written to `/game/<id>.json` (sets only). */
  atlasJson?: unknown;
  stats?: SnapStats;
  seam?: number;
}

export interface Context {
  rawPath: (id: string) => string;
  slices?: Slices;
  sheet?: () => Promise<Img>;
  /** The reference sheet as delivered (unkeyed), for `sprites` that key with their own threshold. */
  rawSheet?: () => Promise<Img>;
}

/** Thrown when a raw delivery can't be used; the next source is tried. */
class Rejected extends Error {}

const url = (id: string) => `/game/${id}.png`;
const NATIVE_MAX_COLORS = 64;
/** Source px eroded off a checker-keyed silhouette: its light anti-aliasing fringe. */
const CHECKER_ERODE = 2;

const paletteSet = (entry: AssetEntry): PaletteSet =>
  entry.palette === 'scenery' ? 'scenery' : 'core';

function mergeStats(all: SnapStats[]): SnapStats {
  if (!all.length) return { meanDE: 0, p95DE: 0 };
  return {
    meanDE: all.reduce((s, x) => s + x.meanDE, 0) / all.length,
    p95DE: Math.max(...all.map((x) => x.p95DE)),
  };
}

const unionRect = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a[0], b[0]);
  const y = Math.min(a[1], b[1]);
  return [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(a[1] + a[3], b[1] + b[3]) - y];
};

/** Snap → orphan cleanup → trim for one normalized image. */
function finish(img: Img, stats: SnapStats[], set: PaletteSet = 'core'): Img {
  const snapped = snapToPalette(img, set);
  stats.push(snapped.stats);
  return trim(removeOrphans(snapped.img));
}

async function scaleFake(img: Img, factor: number, bg: Background): Promise<Img> {
  const source =
    bg === 'green' ? cleanGreenEdges(img, Math.max(1, Math.round(1 / factor / 3))) : img;
  const b = opaqueBounds(source);
  if (!b) return source;
  const tight = crop(source, b.x, b.y, b.w, b.h);
  return resize(tight, tight.w * factor, tight.h * factor, 'lanczos3');
}

/** Keys a raw source and reports whether it is native pixel art. */
function keyRaw(src: Img, threshold?: number): { keyed: Img; bg: Background; native: boolean } {
  const { kind, borderMax } = detectBackground(src);
  let keyed: Img;
  if (kind === 'alpha') keyed = src;
  else if (kind === 'green') keyed = keyGreen(src);
  else if (kind === 'black') keyed = floodBlack(src, threshold ?? borderMax + 4);
  else if (kind === 'checker') keyed = keyChecker(src, CHECKER_ERODE);
  else throw new Rejected('background is neither transparent, #00FF00, black nor a checkerboard');
  return { keyed, bg: kind, native: uniqueOpaqueColors([keyed]) <= NATIVE_MAX_COLORS };
}

async function normalizeNative(frames: Img[]): Promise<Img[]> {
  const k = runGcd(frames);
  return k > 1 ? frames.map((f) => downscaleBy(f, k)) : frames;
}

function stripRuntime(
  entry: StripAsset,
  frames: number,
  source: Served,
  warnings: string[]
): RuntimeStrip {
  return {
    id: entry.id,
    kind: 'strip',
    tier: entry.tier,
    required: entry.required,
    source,
    url: url(entry.id),
    anchors: entry.anchors,
    warnings,
    frameWidth: entry.cell[0],
    frameHeight: entry.cell[1],
    frames,
    baseline: entry.baseline,
    fps: entry.fps,
    loop: entry.loop,
    ...(entry.frameNames && frames === entry.frames ? { frameNames: entry.frameNames } : {}),
  };
}

async function finishStrip(
  entry: StripAsset,
  frames: Img[],
  source: Served,
  warnings: string[],
  stats: SnapStats[]
): Promise<Output> {
  const tall = Math.max(...frames.map((f) => f.h));
  if (tall > entry.targetHeight + 2)
    warnings.push(`tallest frame ${tall}px exceeds targetHeight ${entry.targetHeight}`);
  if (frames.length !== entry.frames) warnings.push(`${frames.length} of ${entry.frames} frames`);
  const { img, clipped } = packStrip(frames, entry.cell, entry.baseline);
  if (clipped.length) warnings.push(`frames ${clipped.join(', ')} clipped by the cell`);
  const runtime = stripRuntime(entry, frames.length, source, warnings);
  if (entry.anchors?.window && source !== 'placeholder') {
    // Union across frames: a bumped (squashed) frame moves the window down.
    let union: Rect | null = null;
    for (let f = 0; f < frames.length; f++) {
      const hole = detectHole(crop(img, f * entry.cell[0], 0, entry.cell[0], entry.cell[1]));
      if (hole) union = union ? unionRect(union, hole) : hole;
    }
    if (union) runtime.anchors = { ...entry.anchors, window: union };
    else warnings.push('window anchor not detected — using manifest default');
  }
  return { runtime, png: img, stats: mergeStats(stats) };
}

async function rawStrip(entry: StripAsset, src: Img): Promise<Output> {
  const { keyed, bg, native } = keyRaw(src, entry.backgroundThreshold);
  // Only green-screen (Nano Banana) deliveries carry the ruler; PixelLab exports are transparent.
  const hasRuler = Boolean(entry.ruler) && bg === 'green';
  const fixed = Boolean(entry.frameNames) || entry.fps === 0 || !entry.loop;
  const { labels, comps } = labelComponents(keyed);
  const groups = groupComponents(comps, {
    count: fixed ? entry.frames + (hasRuler ? 1 : 0) : undefined,
  });
  if (!groups) throw new Rejected('fewer separate frames than required');
  let frames = groups.map((g) => extractGroup(keyed, labels, g));
  const ruler = hasRuler ? frames.shift() : undefined;
  if (entry.frameNames && frames.length !== entry.frames)
    throw new Rejected(`needs exactly ${entry.frames} frames (${entry.frameNames.join(', ')})`);
  const warnings: string[] = [];
  if (native) frames = await normalizeNative(frames);
  else {
    const heights = frames.map((f) => opaqueBounds(f)?.h ?? 1);
    const factor = ruler
      ? 48 / (opaqueBounds(ruler)?.h ?? 48)
      : entry.fps === 0
        ? entry.targetHeight / heights[0]!
        : entry.targetHeight / Math.max(...heights);
    frames = await Promise.all(frames.map((f) => scaleFake(f, factor, bg)));
  }
  const stats: SnapStats[] = [];
  frames = frames.map((f) => finish(f, stats, paletteSet(entry)));
  return finishStrip(entry, frames, 'raw', warnings, stats);
}

/** Every component ≥ 0.5 % of the largest, as one image (a sprite may have detached parts). */
function wholeObject(keyed: Img): Img {
  const { labels, comps } = labelComponents(keyed);
  if (!comps.length) throw new Rejected('no opaque pixels after keying');
  const largest = Math.max(...comps.map((c) => c.area));
  const keep = new Set(comps.filter((c) => c.area >= largest * 0.005).map((c) => c.id));
  const data = new Uint8Array(keyed.data);
  for (let p = 0; p < keyed.w * keyed.h; p++) if (!keep.has(labels[p]!)) data[p * 4 + 3] = 0;
  return trim({ ...keyed, data });
}

async function rawSprite(entry: SpriteAsset, src: Img): Promise<Output> {
  const { keyed: whole, bg, native } = keyRaw(src, entry.backgroundThreshold);
  const keyed = entry.sourceCrop ? crop(whole, ...entry.sourceCrop) : whole;
  let img = wholeObject(keyed);
  const warnings: string[] = [];
  if (native) {
    img = (await normalizeNative([img]))[0]!;
    if (img!.w > entry.maxSize[0] || img!.h > entry.maxSize[1])
      warnings.push('native art exceeds maxSize');
  } else {
    const factor = Math.min(
      entry.targetHeight / img.h,
      entry.maxSize[0] / img.w,
      entry.maxSize[1] / img.h
    );
    img = await scaleFake(img, factor, bg);
  }
  const stats: SnapStats[] = [];
  img = finish(img!, stats, paletteSet(entry));
  if (img.h < entry.targetHeight - 2) warnings.push(`height ${img.h}px: limited by maxSize width`);
  const anchors: Record<string, Rect> = { ...(entry.anchors ?? {}) };
  const surface = detectSurface(img);
  for (const name of Object.keys(anchors)) {
    const found =
      name === 'surface'
        ? surface
        : name === 'tile'
          ? surface && detectTile(img, surface[1])
          : detectPanel(img);
    if (found) anchors[name] = found;
    else warnings.push(`${name} anchor not detected — using manifest default`);
  }
  return {
    runtime: {
      id: entry.id,
      kind: 'sprite',
      tier: entry.tier,
      required: entry.required,
      source: 'raw',
      url: url(entry.id),
      ...(entry.anchors ? { anchors } : {}),
      warnings,
      width: img.w,
      height: img.h,
    },
    png: img,
    stats: mergeStats(stats),
  };
}

function setOutput(
  entry: SetAsset,
  items: Record<string, Img>,
  source: Served,
  warnings: string[],
  stats?: SnapStats,
  anchors: Record<string, Record<string, Rect>> = Object.fromEntries(
    entry.items.filter((i) => i.anchors).map((i) => [i.name, i.anchors!])
  )
): Output {
  const { atlas, json } = buildAtlas(items, `${entry.id}.png`);
  return {
    runtime: {
      id: entry.id,
      kind: 'set',
      tier: entry.tier,
      required: entry.required,
      source,
      url: url(entry.id),
      atlasUrl: `/game/${entry.id}.json`,
      warnings,
      items: Object.fromEntries(
        Object.entries(items).map(([n, i]) => [
          n,
          { w: i.w, h: i.h, ...(anchors[n] ? { anchors: anchors[n] } : {}) },
        ])
      ),
    },
    png: atlas,
    atlasJson: json,
    stats,
  };
}

async function rawSet(entry: SetAsset, src: Img): Promise<Output> {
  const { keyed, bg, native } = keyRaw(src, entry.backgroundThreshold);
  const { labels, comps } = labelComponents(keyed);
  const groups = groupComponents(comps, { count: entry.items.length });
  if (!groups) throw new Rejected(`needs ${entry.items.length} separate items`);
  let imgs = groups.map((g) => extractGroup(keyed, labels, g));
  const warnings: string[] = [];
  if (native) {
    imgs = await normalizeNative(imgs);
    entry.items.forEach((item, i) => {
      const b = opaqueBounds(imgs[i]!);
      if (item.fill && b && b.w !== item.size[0])
        warnings.push(`${item.name} is ${b.w}px wide native art; its box needs ${item.size[0]}px`);
    });
  } else {
    // Free items share one factor (drawn at the same scale): the tightest fit of any free item.
    // `fill` items (platforms, fence panels) are scaled on their own to their exact box width.
    const fits = imgs.map((img, i) => {
      const b = opaqueBounds(img)!;
      const item = entry.items[i]!;
      return item.fill ? item.size[0] / b.w : Math.min(item.size[0] / b.w, item.size[1] / b.h);
    });
    const free = fits.filter((_, i) => !entry.items[i]!.fill);
    const shared = free.length ? Math.min(...free) : 1;
    imgs = await Promise.all(
      imgs.map((img, i) => scaleFake(img, entry.items[i]!.fill ? fits[i]! : shared, bg))
    );
  }
  const stats: SnapStats[] = [];
  const items: Record<string, Img> = {};
  const itemAnchors: Record<string, Record<string, Rect>> = {};
  entry.items.forEach((item, i) => {
    const done = finish(imgs[i]!, stats, paletteSet(entry));
    const [w, h] = item.size;
    let placed: { img: Img; clipped: boolean };
    if (item.fill) {
      if (Math.abs(done.h - h) / h > 0.1)
        warnings.push(`${item.name} aspect differs from ${w}×${h} by > 10 %`);
      const layer = placeLayer(done, item.size, item.fill);
      placed = { img: layer.img, clipped: layer.cropped };
    } else placed = placeBottomCentre(done, item.size);
    if (placed.clipped) warnings.push(`${item.name} clipped by its ${w}×${h} box`);
    items[item.name] = placed.img;
    if (item.anchors) {
      const found = detectPanel(placed.img, DOORWAY);
      itemAnchors[item.name] = found
        ? Object.fromEntries(Object.keys(item.anchors).map((k) => [k, found]))
        : item.anchors;
      if (!found) warnings.push(`${item.name} anchors not detected — using manifest defaults`);
    }
  });
  return setOutput(entry, items, 'raw', warnings, mergeStats(stats), itemAnchors);
}

async function rawLayer(
  entry: Extract<AssetEntry, { kind: 'layer' | 'tile-strip' }>,
  src: Img
): Promise<Output> {
  const { keyed, bg, native } = keyRaw(src, entry.backgroundThreshold);
  let img = wholeObject(keyed);
  const warnings: string[] = [];
  const loop = cropToLoop(img);
  if (loop.error > 0.05)
    warnings.push(`best loop point still has seam error ${loop.error.toFixed(3)}`);
  img = loop.img;
  const [w] = entry.size;
  if (native) {
    img = (await normalizeNative([img]))[0]!;
    if (img!.w !== w) warnings.push(`native width ${img!.w}px ≠ ${w}px`);
  } else img = await scaleFake(img, w / img.w, bg);
  const stats: SnapStats[] = [];
  const snapped = snapToPalette(img!, paletteSet(entry));
  stats.push(snapped.stats);
  img = removeOrphans(snapped.img);
  const placed = placeLayer(img, entry.size, entry.kind === 'layer' ? 'bottom' : 'top');
  if (placed.cropped) warnings.push('rows beyond the manifest height were cropped');
  const seam = seamError(placed.img);
  const runtime: RuntimeAsset = {
    id: entry.id,
    kind: entry.kind,
    tier: entry.tier,
    required: entry.required,
    source: 'raw',
    url: url(entry.id),
    ...(entry.anchors ? { anchors: entry.anchors } : {}),
    warnings,
    width: entry.size[0],
    height: entry.size[1],
    ...(entry.kind === 'layer' ? { scrollFactor: entry.scrollFactor } : {}),
  };
  return { runtime, png: placed.img, stats: mergeStats(stats), seam };
}

/** Most frequent color of row 0 — the backdrop's sky above everything it painted. */
function topRowColor(img: Img): number[] {
  const counts = new Map<number, number>();
  for (let x = 0; x < img.w; x++) {
    const i = x * 4;
    const key = (img.data[i]! << 16) | (img.data[i + 1]! << 8) | img.data[i + 2]!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [key] = [...counts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
  return [(key >> 16) & 255, (key >> 8) & 255, key & 255, 255];
}

/** Opaque painting → `size[0]` wide (lanczos) → palette → padded at the top to `size[1]`. */
async function rawBackdrop(entry: BackdropAsset, src: Img): Promise<Output> {
  const [w, h] = entry.size;
  const warnings: string[] = [];
  let img = await resize(src, w, (src.h * w) / src.w, 'lanczos3');
  const snapped = snapToPalette(img, paletteSet(entry));
  img = snapped.img;
  let out = img;
  if (img.h > h) {
    warnings.push(`scaled height ${img.h}px exceeds ${h}px — the top was cropped`);
    out = crop(img, 0, img.h - h, w, h);
  } else if (img.h < h) {
    out = createImg(w, h);
    const sky = topRowColor(img);
    for (let p = 0; p < w * (h - img.h); p++) out.data.set(sky, p * 4);
    out.data.set(img.data, w * (h - img.h) * 4);
  }
  return {
    runtime: {
      id: entry.id,
      kind: 'backdrop',
      tier: entry.tier,
      required: entry.required,
      source: 'raw',
      url: url(entry.id),
      ...(entry.anchors ? { anchors: entry.anchors } : {}),
      warnings,
      width: w,
      height: h,
    },
    png: out,
    stats: snapped.stats,
  };
}

/** One keyed sheet box → the character only: its largest component plus every other piece of
 * ≥ 20 px except detached ground-shadow blobs, and the baked shadow band cleared. */
function cleanBox(box: Img, slices: Slices): Img | null {
  const { bandRows, minMax, maxMax, maxChroma } = slices.shadow;
  const { labels, comps } = labelComponents(box);
  const body = comps.reduce<Component | undefined>(
    (a, c) => (!a || c.area > a.area ? c : a),
    undefined
  );
  if (!body) return null;
  const bodyBottom = body.y + body.h;
  const keep = new Set(
    comps
      .filter((c) => c.area >= 20)
      .filter((c) => !(c !== body && c.h <= 10 && c.w > 3 * c.h && c.y >= bodyBottom - 12))
      .map((c) => c.id)
  );
  const { w, h } = box;
  const data = new Uint8Array(box.data);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const inBand = Math.floor(p / w) >= h - bandRows;
    const max = Math.max(data[i]!, data[i + 1]!, data[i + 2]!);
    const min = Math.min(data[i]!, data[i + 1]!, data[i + 2]!);
    const shadow = inBand && max >= minMax && max <= maxMax && max - min <= maxChroma;
    if (!keep.has(labels[p]!) || shadow) data[i + 3] = 0;
  }
  return { w, h, data };
}

/** Sheet boxes → finished frames: array order, shadows stripped, one sheet scale. */
async function referenceFrames(
  boxes: [number, number, number, number][],
  slices: Slices,
  sheet: Img,
  stats: SnapStats[]
): Promise<Img[]> {
  const frames: Img[] = [];
  for (const [bx, by, bw, bh] of boxes) {
    const clean = cleanBox(crop(sheet, bx, by, bw, bh), slices);
    if (clean) frames.push(await scaleFake(clean, slices.scale, 'black'));
  }
  return frames.map((f) => finish(f, stats));
}

/** A `sprites` entry → one finished frame `height` art px tall. It is keyed on its own (its
 * `backgroundThreshold`, from the unkeyed sheet) and scaled to `height`, not by the sheet's
 * `scale`: the directional sprites are drawn a little larger than the animation rows. */
async function spriteFrame(
  sprite: SheetSprite,
  height: number,
  slices: Slices,
  rawSheet: Img,
  stats: SnapStats[]
): Promise<Img | null> {
  const [bx, by, bw, bh] = sprite.box;
  const keyed = floodBlack(
    crop(rawSheet, bx, by, bw, bh),
    sprite.backgroundThreshold ?? slices.backgroundThreshold
  );
  const clean = cleanBox(keyed, slices);
  const b = clean && opaqueBounds(clean);
  if (!clean || !b) return null;
  return finish(await scaleFake(clean, height / b.h, 'black'), stats);
}

/** Interim frames from the reference sheet. */
async function referenceStrip(entry: StripAsset, slices: Slices, sheet: Img): Promise<Output> {
  const stats: SnapStats[] = [];
  const frames = await referenceFrames(slices.strips[entry.id]!, slices, sheet, stats);
  return finishStrip(entry, frames, 'reference', [], stats);
}

/** Keeps only the largest 8-connected component. */
function largestComponent(img: Img): Img {
  const { labels, comps } = labelComponents(img);
  const body = comps.reduce<Component | undefined>(
    (a, c) => (!a || c.area > a.area ? c : a),
    undefined
  );
  if (!body) return img;
  const data = new Uint8Array(img.data);
  for (let p = 0; p < img.w * img.h; p++) if (labels[p] !== body.id) data[p * 4 + 3] = 0;
  return trim({ w: img.w, h: img.h, data });
}

/** An interim strip animated from one sliced frame (`Slices.derived`); null if it can't be cut. */
async function derivedStrip(
  entry: StripAsset,
  spec: DerivedStrip,
  slices: Slices,
  ctx: Context
): Promise<Output | null> {
  const stats: SnapStats[] = [];
  let cut: Img | null | undefined;
  const sprite = spec.sprite ? slices.sprites?.[spec.sprite] : undefined;
  if (sprite && spec.height && ctx.rawSheet) {
    cut = await spriteFrame(sprite, spec.height, slices, await ctx.rawSheet(), stats);
  } else if (spec.from !== undefined && spec.frame !== undefined && ctx.sheet) {
    const box = slices.strips[spec.from]?.[spec.frame];
    if (box) [cut] = await referenceFrames([box], slices, await ctx.sheet(), stats);
  }
  if (!cut) return null;
  const base = spec.bodyOnly ? largestComponent(cut) : cut;
  // Highest cut first: a lift never moves the rows below it, so lower cuts keep their height.
  const order = spec.cuts.map((_, k) => k).sort((a, b) => spec.cuts[b]! - spec.cuts[a]!);
  const frames = spec.lifts.map((lift) =>
    order.reduce((img, k) => liftAbove(img, spec.cuts[k]!, lift[k] ?? 0), base)
  );
  return finishStrip(entry, frames, 'reference', [], stats);
}

function placeholder(entry: AssetEntry): Output {
  const ph = makePlaceholder(entry);
  const warnings = ['placeholder'];
  if (entry.kind === 'set') return setOutput(entry, ph.items!, 'placeholder', warnings);
  const img = ph.img!;
  const base = {
    id: entry.id,
    tier: entry.tier,
    required: entry.required,
    source: 'placeholder' as const,
    url: url(entry.id),
    warnings,
  };
  const anchors = entry.anchors ? { anchors: entry.anchors } : {};
  if (entry.kind === 'strip')
    return { runtime: stripRuntime(entry, entry.frames, 'placeholder', warnings), png: img };
  if (entry.kind === 'sprite')
    return {
      runtime: { ...base, ...anchors, kind: 'sprite', width: img.w, height: img.h },
      png: img,
    };
  return {
    runtime: {
      ...base,
      ...anchors,
      kind: entry.kind,
      width: img.w,
      height: img.h,
      ...(entry.kind === 'layer' ? { scrollFactor: entry.scrollFactor } : {}),
    },
    png: img,
  };
}

async function fromRaw(entry: AssetEntry, src: Img): Promise<Output> {
  switch (entry.kind) {
    case 'strip':
      return rawStrip(entry, src);
    case 'sprite':
      return rawSprite(entry, src);
    case 'set':
      return rawSet(entry, src);
    case 'backdrop':
      return rawBackdrop(entry, src);
    default:
      return rawLayer(entry, src);
  }
}

async function derivedFor(entry: AssetEntry, ctx: Context): Promise<Output | null> {
  const spec = entry.kind === 'strip' ? ctx.slices?.derived?.[entry.id] : undefined;
  if (entry.kind !== 'strip' || !spec || !ctx.slices) return null;
  return derivedStrip(entry, spec, ctx.slices, ctx);
}

/** No usable raw delivery: sheet slices, else a placeholder (required) or `missing`. */
async function interim(entry: AssetEntry, ctx: Context): Promise<Output> {
  if (entry.kind === 'strip' && ctx.slices?.strips[entry.id] && ctx.sheet)
    return referenceStrip(entry, ctx.slices, await ctx.sheet());
  if (entry.required) return placeholder(entry);
  return {
    runtime: {
      id: entry.id,
      kind: entry.kind,
      tier: entry.tier,
      required: false,
      source: 'missing',
      warnings: [],
    },
  };
}

export async function processEntry(entry: AssetEntry, ctx: Context): Promise<Output> {
  const notes: string[] = [];
  const rawPath = ctx.rawPath(entry.id);
  if (existsSync(rawPath)) {
    try {
      return await fromRaw(entry, await loadImg(rawPath));
    } catch (err) {
      if (!(err instanceof Rejected)) throw err;
      notes.push(`raw delivery rejected: ${err.message}`);
    }
  }
  const out = (await derivedFor(entry, ctx)) ?? (await interim(entry, ctx));
  out.runtime.warnings.unshift(...notes);
  return out;
}

/** The reference sheet keyed once with the slices threshold (flood-fill from its borders). */
export async function loadSheet(path: string, slices: Slices): Promise<Img> {
  return floodBlack(await loadImg(path), slices.backgroundThreshold);
}
