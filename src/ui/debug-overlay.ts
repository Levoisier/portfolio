/** `?debug` overlay: fps, zoom, view size, tier, layout mode (from `debug:stats`). */
import { bus } from '../shared/bus';

export function mountDebugOverlay(host: HTMLElement): void {
  const pre = document.createElement('pre');
  pre.className = 'debug-overlay';
  pre.setAttribute('aria-hidden', 'true');
  host.append(pre);
  bus.on('debug:stats', (s) => {
    pre.textContent = `${s.fps} fps · ×${s.zoom} @${s.dpr} · ${s.viewW}×${s.viewH} · ${s.tier} · ${s.mode}`;
  });
}
