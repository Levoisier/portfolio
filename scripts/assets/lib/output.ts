/** Palette-exact PNG output (sharp's indexed encoder can silently re-quantize — verify). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import { isPaletteColor } from './color.ts';
import type { Img } from './img.ts';

/** True when every pixel is fully clear or an exact palette color at full alpha. */
export function isPaletteExact(img: Img): boolean {
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3]!;
    if (a === 0) continue;
    if (a !== 255 || !isPaletteColor(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!))
      return false;
  }
  return true;
}

export async function encodePng(img: Img): Promise<Buffer> {
  const raw = () =>
    sharp(Buffer.from(img.data), { raw: { width: img.w, height: img.h, channels: 4 } });
  const indexed = await raw()
    .png({ palette: true, colours: 256, quality: 100, effort: 10, dither: 0 })
    .toBuffer();
  const { data } = await sharp(indexed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const back: Img = { w: img.w, h: img.h, data: new Uint8Array(data) };
  if (Buffer.compare(Buffer.from(back.data), Buffer.from(img.data)) === 0 && isPaletteExact(back))
    return indexed;
  return raw().png({ palette: false, compressionLevel: 9 }).toBuffer();
}

export async function writePng(img: Img, path: string): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, await encodePng(img));
}

/** Packs set items left→right into one atlas image + Phaser JSON-hash frames. */
export function buildAtlas(items: Record<string, Img>, imageName: string) {
  const names = Object.keys(items);
  const width = names.reduce((s, n) => s + items[n]!.w + 1, 0);
  const height = Math.max(...names.map((n) => items[n]!.h));
  const atlas: Img = {
    w: Math.max(1, width),
    h: height,
    data: new Uint8Array(Math.max(1, width) * height * 4),
  };
  const frames: Record<string, unknown> = {};
  let x = 0;
  for (const name of names) {
    const it = items[name]!;
    for (let y = 0; y < it.h; y++) {
      atlas.data.set(it.data.subarray(y * it.w * 4, (y + 1) * it.w * 4), (y * atlas.w + x) * 4);
    }
    frames[name] = {
      frame: { x, y: 0, w: it.w, h: it.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: it.w, h: it.h },
      sourceSize: { w: it.w, h: it.h },
    };
    x += it.w + 1;
  }
  const json = { frames, meta: { image: imageName, size: { w: atlas.w, h: atlas.h }, scale: '1' } };
  return { atlas, json };
}
