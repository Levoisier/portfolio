/**
 * Off-screen effect gating.
 *
 * The expensive parts of this page are pixel work, not JavaScript: the
 * `backdrop-filter` on every `.liquid-glass` surface, and the infinite
 * `glass-sheen-drift` animation on each surface's `::after`. Both used to run
 * for every surface all the time — including the six or so that are several
 * viewports away from whatever you're looking at.
 *
 * `backdrop-filter` is the worse offender: ScrollSmoother transforms
 * `#smooth-content` as one big composited layer, and a backdrop-filter inside a
 * continuously-transforming ancestor can never be cached — the browser re-reads
 * and re-blurs the pixels underneath it on every single frame.
 *
 * This module marks surfaces that are far from the viewport with `.is-offscreen`
 * so CSS can drop the blur and park the sheen. Note the polarity: effects are ON
 * by default and are switched OFF when off-screen, never the reverse. Gating the
 * other way round would leave the hero's glass unblurred on first paint and then
 * pop it in when the observer first fired.
 *
 * A generous rootMargin means a surface is fully re-enabled well before it can
 * be seen, so scrolling never reveals a surface mid-upgrade.
 *
 * Nothing here changes layout, so ScrollTrigger's measurements are untouched.
 */

/** Re-enable effects this far outside the viewport (roughly one screen). */
const ROOT_MARGIN = '100% 0px';

export function initOffscreenGating(): void {
  const targets = document.querySelectorAll<HTMLElement>('.liquid-glass');
  if (!targets.length || typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      }
    },
    { rootMargin: ROOT_MARGIN }
  );

  targets.forEach((target) => observer.observe(target));
}
