/** The DOM loading screen: progress from `game:progress`, gone on `game:ready`. */
import { bus } from '../shared/bus';
import { prefersReducedMotion } from '../shared/motion';

export function mountLoading(root: HTMLElement): void {
  const bar = root.querySelector<HTMLElement>('[role="progressbar"]');
  const offProgress = bus.on(
    'game:progress',
    ({ progress }) => {
      const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
      bar?.style.setProperty('--progress', String(pct / 100));
      bar?.setAttribute('aria-valuenow', String(pct));
    },
    { replay: true }
  );
  bus.once(
    'game:ready',
    () => {
      offProgress();
      const hide = () => {
        root.hidden = true;
      };
      if (prefersReducedMotion()) return hide();
      root.dataset.state = 'leaving';
      root.addEventListener('transitionend', hide, { once: true });
      // transitionend never fires if the page is hidden mid-fade.
      setTimeout(hide, 600);
    },
    { replay: true }
  );
}
