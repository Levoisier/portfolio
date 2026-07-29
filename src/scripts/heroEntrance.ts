/**
 * Hero copy entrance — premise → name stagger → role → scroll hint → idle bob.
 *
 * This used to be a GSAP timeline built in the hero scene's `enter()`. That tied
 * the site's first impression to the deferred controller: on a throttled phone
 * the entrance did not begin until ~1.6s, and because `#hero-name` is painted
 * (it is the page's `<h1>`), the scene had to blank it to `opacity: 0` first —
 * so the title was readable at 66ms, then visibly blinked out and re-staggered a
 * second and a half later.
 *
 * Now it runs here, off a ~1 KB module that needs no GSAP, so it plays on
 * arrival. The choreography is unchanged — same durations, offsets and easings
 * as the old timeline:
 *
 *   premise  t=0.00s  dur 0.5s  y 14→0
 *   chars    t=0.30s  dur 0.6s  x -24→0, +0.035s per character
 *   role     t=1.67s  dur 0.6s  y 20→0     (the old timeline appended this
 *                                            after the staggered chars ended)
 *   hint     t=2.37s  dur 0.4s  fade
 *   bob      t=2.77s  1.6s alternating loop, forever
 *
 * WHY THE WEB ANIMATIONS API AND NOT CSS KEYFRAMES:
 * ScrollTrigger's desktop hero pin re-parents `#hero` into a generated
 * `.pin-spacer` when the controller mounts. Re-inserting an element restarts
 * every CSS animation inside it — measured: `#hero`'s parent flipped to
 * `pin-spacer` at 1551ms and the entrance restarted from zero at exactly
 * 1551ms. A WAAPI animation is owned by the element rather than resolved from
 * its computed style, so it survives the move and keeps its current time.
 *
 * The elements start hidden in CSS (`html.js` gated — see global.css) to cover
 * the gap between first paint and this module executing. Every animation uses
 * `fill: 'both'`, so the animation output holds both the opening frame and the
 * final frame and nothing snaps back when it finishes.
 */

const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const SINE_IN_OUT = 'cubic-bezier(0.37, 0, 0.63, 1)';

/** The hint carries `-translate-x-1/2`; its transform keyframes must preserve
 *  that -50%, since a transform keyframe replaces the whole property. */
const HINT_X = '-50%';

function animate(
  el: Element | null,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions
): Animation | null {
  if (!el || typeof el.animate !== 'function') return null;
  return el.animate(keyframes, { fill: 'both', ...options });
}

export function initHeroEntrance(): void {
  const premise = document.getElementById('hero-premise');
  const role = document.getElementById('hero-role');
  const hint = document.getElementById('hero-scroll-hint');
  const chars = document.querySelectorAll<HTMLElement>('#hero-name .hero-char');

  animate(
    premise,
    [
      { opacity: 0, transform: 'translateY(14px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 500, delay: 0, easing: EXPO_OUT }
  );

  chars.forEach((char, index) => {
    animate(
      char,
      [
        { opacity: 0, transform: 'translateX(-24px)' },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: 600, delay: 300 + index * 35, easing: EXPO_OUT }
    );
  });

  animate(
    role,
    [
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 600, delay: 1670, easing: EXPO_OUT }
  );

  animate(hint, [{ opacity: 0 }, { opacity: 1 }], {
    duration: 400,
    delay: 2370,
    easing: EXPO_OUT,
  });

  const bob = animate(
    hint,
    [{ transform: `translate(${HINT_X}, 0)` }, { transform: `translate(${HINT_X}, 8px)` }],
    {
      duration: 1600,
      delay: 2770,
      easing: SINE_IN_OUT,
      iterations: Infinity,
      direction: 'alternate',
    }
  );

  // Park the idle loop while the hero is out of view. Same intent as the
  // `.is-offscreen` gating in offscreen.ts, but a WAAPI animation is paused
  // through its own handle rather than through CSS.
  if (bob && hint && typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) bob.play();
          else bob.pause();
        }
      },
      { rootMargin: '100% 0px' }
    );
    observer.observe(hint);
  }
}
