/**
 * Loads the web fonts the canvas needs, then emits `fonts:ready` (the game rasterizes the pixel
 * font from them). Canvas text never triggers a font download on its own.
 */
import { CHARSET, RENDER_SIZE } from '../game/text/pixel-font';
import { bus } from '../shared/bus';

export async function loadFonts(): Promise<void> {
  try {
    await document.fonts.load(`${RENDER_SIZE}px "Pixelify Sans"`, CHARSET);
    bus.emit('fonts:ready', {});
  } catch (err) {
    // No in-world text is better than text in a fallback font; the DOM keeps its fallback.
    console.warn('pixel font unavailable', err);
  }
}
