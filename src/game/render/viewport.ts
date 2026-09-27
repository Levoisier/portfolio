/**
 * Watches the #screen box in device px (ResizeObserver `devicePixelContentBoxSize` where
 * supported, else floor(css × dpr)) plus DPR changes — moving the window to another monitor
 * fires no resize. No Phaser import: main.ts turns the rect into a viewport and applies it.
 */
import { screenFromCss, type ScreenRect } from './zoom';

export function watchScreen(el: HTMLElement, fn: (rect: ScreenRect) => void): () => void {
  let last = '';
  const report = (rect: ScreenRect) => {
    const key = `${rect.widthDev}x${rect.heightDev}@${rect.dpr}`;
    if (key === last) return;
    last = key;
    fn(rect);
  };
  const fromCss = () => {
    const box = el.getBoundingClientRect();
    report(screenFromCss(box.width, box.height, devicePixelRatio));
  };

  const observer = new ResizeObserver(([entry]) => {
    const dev = entry?.devicePixelContentBoxSize?.[0];
    const css = entry?.contentBoxSize?.[0];
    // Emulated DPR (DevTools, Playwright) reports CSS px here; trust it only when it agrees.
    const agrees =
      dev &&
      css &&
      Math.abs(dev.inlineSize - css.inlineSize * devicePixelRatio) <= 2 &&
      Math.abs(dev.blockSize - css.blockSize * devicePixelRatio) <= 2;
    if (agrees)
      report({ widthDev: dev.inlineSize, heightDev: dev.blockSize, dpr: devicePixelRatio });
    else fromCss();
  });
  try {
    observer.observe(el, { box: 'device-pixel-content-box' });
  } catch {
    observer.observe(el);
  }

  let media: MediaQueryList | null = null;
  const onDpr = () => {
    media?.removeEventListener('change', onDpr);
    media = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    media.addEventListener('change', onDpr);
    fromCss();
  };
  onDpr();

  return () => {
    observer.disconnect();
    media?.removeEventListener('change', onDpr);
  };
}
