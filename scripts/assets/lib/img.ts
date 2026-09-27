/** Minimal RGBA raster used by every pipeline step (pure, no I/O except load/save). */
import sharp from 'sharp';

export interface Img {
  w: number;
  h: number;
  /** RGBA, row-major, 4 bytes per pixel. */
  data: Uint8Array;
}

export const createImg = (w: number, h: number): Img => ({ w, h, data: new Uint8Array(w * h * 4) });

export const alphaAt = (img: Img, x: number, y: number): number =>
  img.data[(y * img.w + x) * 4 + 3]!;

export function crop(img: Img, x0: number, y0: number, w: number, h: number): Img {
  const out = createImg(w, h);
  for (let y = 0; y < h; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= img.h) continue;
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= img.w) continue;
      const s = (sy * img.w + sx) * 4;
      out.data.set(img.data.subarray(s, s + 4), (y * w + x) * 4);
    }
  }
  return out;
}

/** Bounding box of opaque pixels, or null when fully transparent. */
export function opaqueBounds(img: Img): { x: number; y: number; w: number; h: number } | null {
  let x0 = img.w;
  let y0 = img.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (alphaAt(img, x, y) === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function trim(img: Img): Img {
  const b = opaqueBounds(img);
  return b ? crop(img, b.x, b.y, b.w, b.h) : createImg(1, 1);
}

/** Copies `src` into `dst` at (dx, dy); returns true if any opaque pixel was clipped. */
export function blit(dst: Img, src: Img, dx: number, dy: number): boolean {
  let clipped = false;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const s = (y * src.w + x) * 4;
      if (src.data[s + 3] === 0) continue;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dst.w || ty >= dst.h) {
        clipped = true;
        continue;
      }
      dst.data.set(src.data.subarray(s, s + 4), (ty * dst.w + tx) * 4);
    }
  }
  return clipped;
}

export function fillRect(img: Img, x: number, y: number, w: number, h: number, rgba: number[]) {
  for (let yy = Math.max(0, y); yy < Math.min(img.h, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(img.w, x + w); xx++) {
      img.data.set(rgba, (yy * img.w + xx) * 4);
    }
  }
}

export async function loadImg(path: string): Promise<Img> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data: new Uint8Array(data) };
}

/** Resamples with lanczos3 (sharp premultiplies alpha) or nearest. */
export async function resize(
  img: Img,
  w: number,
  h: number,
  kernel: 'lanczos3' | 'nearest'
): Promise<Img> {
  const nw = Math.max(1, Math.round(w));
  const nh = Math.max(1, Math.round(h));
  const { data } = await sharp(Buffer.from(img.data), {
    raw: { width: img.w, height: img.h, channels: 4 },
  })
    .resize(nw, nh, { kernel, fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: nw, h: nh, data: new Uint8Array(data) };
}
