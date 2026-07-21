/**
 * Auto-scrolling carousel (mobile).
 *
 * Gently drifts a horizontally-overflowing track back and forth (ping-pong, so
 * there is no jarring reset jump). The first genuine user gesture — touch, drag,
 * wheel, or arrow key — stops the drift for good and hands full manual control
 * to the reader; it never fights or snaps back.
 *
 * Programmatic scrollLeft writes never fire pointer/touch/wheel/key events, so
 * the auto-drift itself is not mistaken for user intent.
 *
 * Scroll-snap note: a `scroll-snap-type: x mandatory` track keeps snapping the
 * tiny per-frame scrollLeft writes back to the current snap point, so the drift
 * never advances. While auto-scrolling we therefore force snap OFF, and restore
 * the CSS value the moment the reader takes over — so manual swiping still snaps.
 *
 * Reduced motion: no-op (the track stays put, fully swipeable, snap intact).
 */

export interface AutoCarouselOptions {
  /** Pixels advanced per animation frame (~60fps). Default 0.7 (~42px/s). */
  speed?: number;
}

export function initAutoCarousel(
  track: HTMLElement,
  options: AutoCarouselOptions = {}
): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const speed = options.speed ?? 0.7;
  let rafId = 0;
  let direction = 1; // 1 → drift right, -1 → drift back left
  let stopped = false;

  // Suppress snap while the auto-drift runs; restore on takeover so manual
  // swipes still snap to cards.
  track.style.scrollSnapType = 'none';

  const tick = (): void => {
    if (stopped) return;
    const max = track.scrollWidth - track.clientWidth;
    if (max <= 1) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    let next = track.scrollLeft + direction * speed;
    if (next >= max) {
      next = max;
      direction = -1;
    } else if (next <= 0) {
      next = 0;
      direction = 1;
    }
    track.scrollLeft = next;
    rafId = requestAnimationFrame(tick);
  };

  const detach = (): void => {
    track.removeEventListener('pointerdown', stop);
    track.removeEventListener('wheel', stop);
    track.removeEventListener('touchstart', stop);
    track.removeEventListener('keydown', stop);
  };

  function stop(): void {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(rafId);
    // Hand snapping back to the reader (falls back to the CSS-declared value).
    track.style.scrollSnapType = '';
    detach();
  }

  // User-intent signals only.
  track.addEventListener('pointerdown', stop, { passive: true });
  track.addEventListener('wheel', stop, { passive: true });
  track.addEventListener('touchstart', stop, { passive: true });
  track.addEventListener('keydown', stop);

  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    track.style.scrollSnapType = '';
    detach();
  };
}
