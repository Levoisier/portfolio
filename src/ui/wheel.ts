/**
 * The single wheel path (ARCHITECTURE.md → Input → Wheel): a wheel anywhere on the page — canvas,
 * HUD or letterbox — walks the panda via `input:wheel`; the game never listens to Phaser's wheel.
 * Skipped over scrollable DOM content (panels, menu) and for Ctrl+wheel (browser zoom, and the
 * trackpad pinch). Passive, so it never delays scrolling.
 */
import { bus } from '../shared/bus';

const SCROLLABLE = '#panels, #menu';

export function forwardWheel(): () => void {
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return;
    if (e.target instanceof Element && e.target.closest(SCROLLABLE)) return;
    bus.emit('input:wheel', { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode });
  };
  window.addEventListener('wheel', onWheel, { passive: true });
  return () => window.removeEventListener('wheel', onWheel);
}
