/**
 * Generates the helper images in art/reference/ that Cristian attaches to image
 * generations (see ASSETS.md → Reference images). Run: `pnpm references`.
 * Reuses the asset pipeline's steps so references obey the same rendering contract.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { floodBlack } from './assets/lib/background.ts';
import { paletteRgb } from './assets/lib/color.ts';
import { labelComponents } from './assets/lib/components.ts';
import { crop, loadImg, opaqueBounds, resize, trim, type Img } from './assets/lib/img.ts';
import { encodePng } from './assets/lib/output.ts';
import { packStrip } from './assets/lib/pack.ts';
import { removeOrphans, snapToPalette } from './assets/lib/pixels.ts';
import type { Slices } from './assets/pipeline.ts';

type Box = [number, number, number, number];

const REF = new URL('../art/reference/', import.meta.url);
const out = (name: string) => fileURLToPath(new URL(name, REF));
const slices = JSON.parse(
  readFileSync(new URL('panda-sheet-v1.slices.json', REF), 'utf8')
) as Slices & {
  sprites: Record<string, { box: Box; backgroundThreshold?: number }>;
};

/** The delivery chroma key — the only non-palette color, used only in scripts/. */
const CHROMA_GREEN = { r: 0, g: 255, b: 0 };

/** True for a baked ground-shadow pixel inside the bottom band of a sheet box. */
function isShadow(data: Uint8Array, i: number, rowInBox: number, boxH: number): boolean {
  const { bandRows, minMax, maxMax, maxChroma } = slices.shadow;
  const max = Math.max(data[i]!, data[i + 1]!, data[i + 2]!);
  const min = Math.min(data[i]!, data[i + 1]!, data[i + 2]!);
  return rowInBox >= boxH - bandRows && max >= minMax && max <= maxMax && max - min <= maxChroma;
}

/** One sheet box → true pixels on the 64×64 cell baseline (same steps as the pipeline). */
async function spriteFromBox(sheet: Img, [bx, by, bw, bh]: Box, threshold: number): Promise<Img> {
  const keyed = floodBlack(crop(sheet, bx, by, bw, bh), threshold);
  const { labels, comps } = labelComponents(keyed);
  const keep = new Set(comps.filter((c) => c.area >= 20).map((c) => c.id));
  for (let p = 0; p < bw * bh; p++) {
    if (!keep.has(labels[p]!) || isShadow(keyed.data, p * 4, Math.floor(p / bw), bh))
      keyed.data[p * 4 + 3] = 0;
  }
  const tight = trim(keyed);
  const scaled = await resize(tight, tight.w * slices.scale, tight.h * slices.scale, 'lanczos3');
  const art = trim(removeOrphans(snapToPalette(scaled).img));
  return packStrip([art], [64, 64], 60).img;
}

const png = async (img: Img, name: string) => sharp(await encodePng(img)).toFile(out(name));

async function main() {
  const sheet = await loadImg(fileURLToPath(new URL(slices.source, REF)));

  // 1. PixelLab reference: the RIGHT-facing sprite, true pixels, 64×64, transparent.
  const right = slices.sprites['panda-right']!;
  await png(
    await spriteFromBox(sheet, right.box, right.backgroundThreshold ?? slices.backgroundThreshold),
    'panda-right-64.png'
  );

  // 2. Motion reference: the IDLE / WALK / RUN row without labels, baked shadows painted black.
  const row: Box = [0, 104, 1536, 128];
  const motion = crop(sheet, ...row);
  for (const id of ['panda-idle', 'panda-walk', 'panda-run']) {
    for (const [bx, by, bw, bh] of slices.strips[id]!) {
      // A few rows past the box too: some detached shadows sit just below it.
      for (let y = 0; y < bh + 8; y++) {
        for (let x = 0; x < bw; x++) {
          const mx = bx + x;
          const my = by + y - row[1];
          if (my < 0 || my >= motion.h) continue;
          const i = (my * motion.w + mx) * 4;
          if (isShadow(motion.data, i, y, bh)) motion.data.set([0, 0, 0, 255], i);
        }
      }
    }
  }
  await sharp(Buffer.from(motion.data), { raw: { width: motion.w, height: motion.h, channels: 4 } })
    .removeAlpha()
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

  // 4. Scale card: the 48 px panda next to one 16 px tile, ×8, on green — a pixel-style ruler.
  const idle = await spriteFromBox(
    sheet,
    slices.strips['panda-idle']![0]!,
    slices.backgroundThreshold
  );
  const ink = [...paletteRgb('ink-900'), 255];
  const card = await sharp({
    create: { width: 96, height: 64, channels: 4, background: CHROMA_GREEN },
  })
    .composite([
      {
        input: Buffer.from(idle.data),
        raw: { width: 64, height: 64, channels: 4 },
        left: 0,
        top: 0,
      },
      {
        input: Buffer.from(
          Array.from({ length: 256 }, (_, p) =>
            p % 16 === 0 || p % 16 === 15 || p < 16 || p >= 240 ? ink : [0, 0, 0, 0]
          ).flat()
        ),
        raw: { width: 16, height: 16, channels: 4 },
        left: 72,
        top: 44,
      },
    ])
    .png()
    .toBuffer();
  await sharp(card)
    .resize(96 * 8, 64 * 8, { kernel: 'nearest' })
    .png()
    .toFile(out('scale-card.png'));

  const h = opaqueBounds(idle)!;
  console.log(
    `art/reference regenerated (scale-card panda ${h.h}px tall, lowest row ${h.y + h.h - 1})`
  );
}

await main();
