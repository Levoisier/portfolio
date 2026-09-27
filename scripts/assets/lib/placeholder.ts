/** Placeholders with the final geometry, so the game works before media arrives (no text). */
import type { AssetEntry, Rect } from '../../../src/assets/registry.ts';
import { paletteRgb } from './color.ts';
import { createImg, fillRect, type Img } from './img.ts';

const rgba = (name: Parameters<typeof paletteRgb>[0]) => [...paletteRgb(name), 255];
const CLEAR = [0, 0, 0, 0];

function outlinedBox(
  img: Img,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number[],
  line: number[]
) {
  fillRect(img, x, y, w, h, line);
  fillRect(img, x + 1, y + 1, w - 2, h - 2, fill);
}

/**
 * `window` is punched transparent (the game fills it behind the sprite); `doorway` is the
 * vault's dark interior; other rects (`sign`) are navy-900 panels; a point anchor (`flare`)
 * gets a 4-px stack from the ground up to it so effects placed there sit on something.
 */
function drawAnchors(img: Img, anchors: Record<string, Rect> | undefined, ox = 0) {
  for (const [name, [x, y, w, h]] of Object.entries(anchors ?? {})) {
    if (!w || !h) {
      fillRect(img, ox + x - 2, y, 4, img.h - y, rgba('navy-900'));
      continue;
    }
    const color =
      name === 'window' ? CLEAR : name === 'doorway' ? rgba('navy-950') : rgba('navy-900');
    fillRect(img, ox + x, y, w, h, color);
  }
}

export interface Placeholder {
  /** One image per output file: the strip/sprite/layer, or one per set item. */
  img?: Img;
  items?: Record<string, Img>;
}

export function makePlaceholder(entry: AssetEntry): Placeholder {
  switch (entry.kind) {
    case 'strip': {
      const [cw, ch] = entry.cell;
      const img = createImg(cw * entry.frames, ch);
      const bh = entry.targetHeight;
      const bw = Math.min(cw, Math.round(bh * 0.7));
      for (let f = 0; f < entry.frames; f++) {
        const x = f * cw + Math.floor((cw - bw) / 2);
        const y = entry.baseline - bh;
        outlinedBox(img, x, y, bw, bh, rgba('ink-700'), rgba('ink-900'));
        // Round the corners.
        for (const [cx, cy] of [
          [x, y],
          [x + bw - 1, y],
          [x, y + bh - 1],
          [x + bw - 1, y + bh - 1],
        ] as const)
          fillRect(img, cx, cy, 1, 1, CLEAR);
        const dot = x + 2 + ((f * 3) % Math.max(1, bw - 5));
        fillRect(img, dot, y + 2, 2, 2, rgba('scarlet-500'));
        drawAnchors(img, entry.anchors, f * cw);
      }
      return { img };
    }
    case 'sprite': {
      const img = createImg(entry.maxSize[0], entry.targetHeight);
      outlinedBox(img, 0, 0, img.w, img.h, rgba('navy-700'), rgba('navy-400'));
      drawAnchors(img, entry.anchors);
      return { img };
    }
    case 'set': {
      const items: Record<string, Img> = {};
      for (const item of entry.items) {
        const img = createImg(item.size[0], item.size[1]);
        outlinedBox(img, 0, 0, img.w, img.h, rgba('navy-700'), rgba('navy-400'));
        drawAnchors(img, item.anchors);
        items[item.name] = img;
      }
      return { items };
    }
    case 'tile-strip': {
      const [w, h] = entry.size;
      const img = createImg(w, h);
      fillRect(img, 0, 0, w, h, rgba('ink-700'));
      fillRect(img, 0, 0, w, 2, rgba('paper-500'));
      return { img };
    }
    case 'backdrop': {
      // Backdrops are optional (the code-drawn sky is their fallback); this is only for tests.
      const [w, h] = entry.size;
      const img = createImg(w, h);
      fillRect(img, 0, 0, w, h, rgba('navy-950'));
      return { img };
    }
    case 'layer': {
      const [w, h] = entry.size;
      const img = createImg(w, h);
      const color =
        entry.id === 'bg-far'
          ? rgba('navy-900')
          : entry.id === 'bg-mid'
            ? rgba('navy-700')
            : rgba('ink-900');
      // A deterministic skyline whose pattern period divides the width, so it tiles.
      const maxH = Math.floor(h * 0.6);
      const period = 64;
      for (let x = 0; x < w; x += 16) {
        const step = (x % period) / 16;
        const bh = Math.max(4, Math.floor(maxH * [0.35, 0.8, 0.5, 1][step]!));
        fillRect(img, x, h - bh, 16, bh, color);
      }
      drawAnchors(img, entry.anchors);
      return { img };
    }
  }
}
