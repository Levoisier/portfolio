/**
 * Generates the helper images in art/reference/ that Cristian attaches to image
 * generations (see ASSETS.md → Delivery rules). Run: `pnpm references`.
 *
 * Phase 0 helper, deliberately self-contained. The Phase 1 asset pipeline may fold
 * these steps into scripts/assets/ — if it does, keep the outputs identical or
 * regenerate them in the same commit.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import palette from '../src/design/palette.json' with { type: 'json' };

const REF = new URL('../art/reference/', import.meta.url);
const SHEET = fileURLToPath(new URL('panda-sheet-v1.png', REF));
const slices = JSON.parse(readFileSync(new URL('panda-sheet-v1.slices.json', REF), 'utf8')) as {
  backgroundThreshold: number;
  scale: number;
  shadow: { bandRows: number; minMax: number; maxMax: number; maxChroma: number };
  strips: Record<string, [number, number, number, number][]>;
  /** Single sprites; `backgroundThreshold` overrides the sheet value (dark back fur). */
  sprites: Record<string, { box: [number, number, number, number]; backgroundThreshold?: number }>;
};

/** The delivery chroma key — the only non-palette color the project uses, never in art. */
const CHROMA_GREEN = { r: 0, g: 255, b: 0 };

type RGB = [number, number, number];
const PAL: RGB[] = Object.values(palette).map((h) => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16),
]);

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

function oklab([r8, g8, b8]: RGB): RGB {
  const r = linear(r8);
  const g = linear(g8);
  const b = linear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const PAL_LAB = PAL.map(oklab);

function snap(rgb: RGB): RGB {
  const p = oklab(rgb);
  let best = 0;
  let bestD = Infinity;
  PAL_LAB.forEach((q, i) => {
    const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return PAL[best] as RGB;
}

/** Keys one sheet box: black flood-fill from the box border, shadow strip, trim. */
async function keyBox(
  [bx, by, bw, bh]: [number, number, number, number],
  threshold = slices.backgroundThreshold
): Promise<Buffer> {
  const { data, info } = await sharp(SHEET)
    .extract({ left: bx, top: by, width: bw, height: bh })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const max = (i: number) => Math.max(data[i * 3]!, data[i * 3 + 1]!, data[i * 3 + 2]!);
  const min = (i: number) => Math.min(data[i * 3]!, data[i * 3 + 1]!, data[i * 3 + 2]!);
  const bg = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (bg[p] || max(p) > threshold) continue;
    bg[p] = 1;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  const { bandRows, minMax, maxMax, maxChroma } = slices.shadow;
  const rgba = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const inBand = Math.floor(p / w) >= h - bandRows;
    const shadow = inBand && max(p) >= minMax && max(p) <= maxMax && max(p) - min(p) <= maxChroma;
    rgba.set([data[p * 3]!, data[p * 3 + 1]!, data[p * 3 + 2]!, bg[p] || shadow ? 0 : 255], p * 4);
  }
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 0 })
    .png()
    .toBuffer();
}

/** Scales by the sheet factor, snaps to the palette, binarizes alpha. */
async function toPixelArt(keyed: Buffer): Promise<{ data: Buffer; w: number; h: number }> {
  const meta = await sharp(keyed).metadata();
  const w = Math.round((meta.width ?? 1) * slices.scale);
  const h = Math.round((meta.height ?? 1) * slices.scale);
  const { data } = await sharp(keyed)
    .resize(w, h, { kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) {
      data.fill(0, i, i + 4);
      continue;
    }
    const [r, g, b] = snap([data[i]!, data[i + 1]!, data[i + 2]!]);
    data.set([r, g, b, 255], i);
  }
  return { data, w, h };
}

/** Packs a sprite bottom-centre into a cell whose feet rest on `baseline`. */
function pack(s: { data: Buffer; w: number; h: number }, cell: number, baseline: number): Buffer {
  const out = Buffer.alloc(cell * cell * 4);
  const ox = Math.floor((cell - s.w) / 2);
  const oy = baseline - s.h;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const tx = ox + x;
      const ty = oy + y;
      if (tx < 0 || ty < 0 || tx >= cell || ty >= cell) continue;
      s.data.copy(out, (ty * cell + tx) * 4, (y * s.w + x) * 4, (y * s.w + x) * 4 + 4);
    }
  }
  return out;
}

const RAW64 = { raw: { width: 64, height: 64, channels: 4 as const } };
const out = (name: string) => fileURLToPath(new URL(name, REF));

async function main() {
  // 1. PixelLab reference: the RIGHT-facing sprite, true pixels, 64x64, transparent.
  const { box, backgroundThreshold } = slices.sprites['panda-right']!;
  const right = pack(await toPixelArt(await keyBox(box, backgroundThreshold)), 64, 60);
  await sharp(right, RAW64).png().toFile(out('panda-right-64.png'));

  // 2. Motion reference: the IDLE / WALK / RUN row without the sheet's text labels.
  await sharp(SHEET)
    .extract({ left: 0, top: 104, width: 1536, height: 128 })
    .png()
    .toFile(out('panda-motion-ref.png'));

  // 3. Aspect-ratio canvases: attach LAST so Nano Banana copies their shape.
  for (const [name, width, height] of [
    ['canvas-21x9.png', 2016, 864],
    ['canvas-16x9.png', 1920, 1080],
  ] as const) {
    await sharp({ create: { width, height, channels: 3, background: CHROMA_GREEN } })
      .png()
      .toFile(out(name));
  }

  // 4. Scale card: the 48 px panda next to one 16 px tile, x8, on green — pixel density ruler.
  const idle = pack(await toPixelArt(await keyBox(slices.strips['panda-idle']![0]!)), 64, 60);
  const [ir, ig, ib] = PAL[0] as RGB;
  const tile = Buffer.alloc(16 * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (x === 0 || y === 0 || x === 15 || y === 15) tile.set([ir, ig, ib, 255], (y * 16 + x) * 4);
    }
  }
  const card = await sharp({
    create: { width: 96, height: 64, channels: 4, background: CHROMA_GREEN },
  })
    .composite([
      { input: idle, ...RAW64, left: 0, top: 0 },
      { input: tile, raw: { width: 16, height: 16, channels: 4 }, left: 72, top: 44 },
    ])
    .png()
    .toBuffer();
  await sharp(card)
    .resize(96 * 8, 64 * 8, { kernel: 'nearest' })
    .png()
    .toFile(out('scale-card.png'));

  console.warn(
    'art/reference: panda-right-64, panda-motion-ref, canvas-21x9, canvas-16x9, scale-card'
  );
}

await main();
