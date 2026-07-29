/**
 * Hero Scene — the REFERENCE scene.
 *
 * Presentation veil: #hero-veil is a static full-bleed curtain over the fixed
 *   backdrop stage so the first view is a clean presentation (panda + name on
 *   the palette gradient). Scrolling fades it out — inside the pinned scrub on
 *   desktop, via a plain scrub trigger on mobile — revealing the parallax art.
 *
 * Desktop (≥768px): pinned scrub DEPTH INTRO.
 *   The hero pins for ~140vh of scroll. On scrub 0→1 the veil lifts, the
 *   atmosphere darkens + drifts back (scale-up, no edge gap), the particles
 *   push toward the viewer,
 *   and a separate non-LCP reaction glow intensifies over the flask.
 *   Depth runs on the INNER .stage-depth channel so the backdrop's outer parallax
 *   keeps running with no conflict and no jump when the pin releases. The text
 *   entrance (premise/name/role/hint) plays once on enter.
 *
 *   NOTE: no lateral (x) drift on the full-bleed stage layers — moving them
 *   sideways exposes the (black) ink behind their edges. Darken + scale-up only.
 *
 * Mobile (<768px): the v1 entrance choreography — no pin, hero panda only.
 *
 * LCP guard: panda-body is the LCP element. This scene never writes opacity or
 * transform to it, so the frame at scroll progress 0 is identical to the static
 * painted hero.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

const heroScene = (_el: Element): Scene => {
  let mm: gsap.MatchMedia | null = null;

  return {
    init(_el: Element) {
      // NOTE: the hero copy entrance (premise → name stagger → role → scroll
      // hint → idle bob) is NOT here. It is a CSS animation in global.css so it
      // plays at first paint instead of waiting for this deferred controller to
      // download and mount — which measured ~1.6s on a throttled phone and made
      // the name blink out after it had already been read. Do not re-add GSAP
      // writes to #hero-premise, #hero-name/.hero-char, #hero-role or
      // #hero-scroll-hint; CSS owns their opacity and transform now.
      //
      // This scene owns only scroll-driven work: the veil, the pinned depth
      // scrub, and the reaction glow.
      const reactionGlow = document.getElementById('hero-reaction-glow');
      gsap.set(reactionGlow, { opacity: 0, scale: 0.85 });

      // ── Desktop pinned depth intro ───────────────────────────────────────────
      // matchMedia adds/removes the pin on resize and reverts its inline styles.
      mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        const depthTl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: '+=140%',
            pin: true,
            scrub: 1,
          },
        });

        // All depth tweens run in parallel (position 0) and use fromTo so the
        // progress-0 frame equals the static hero. The LCP panda body is not a
        // target. No lateral drift on full-bleed layers (would expose black
        // edges); atmosphere scales UP while darkening.
        // The presentation veil fades over the first ~64% of the pin (duration
        // 0.32 vs 0.5 on the depth tweens) so the backdrop art is fully
        // revealed before the pin releases.
        depthTl
          .fromTo('#hero-veil', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.32 }, 0)
          .fromTo(
            '#hero-reaction-glow',
            { opacity: 0, scale: 0.85 },
            { opacity: 0.44, scale: 1.2 },
            0
          )
          .fromTo(
            '#stage-atmosphere .stage-depth',
            { scale: 1, opacity: 1 },
            { scale: 1.05, opacity: 0.7 },
            0
          )
          .fromTo('#stage-particles .stage-depth', { scale: 1, y: 0 }, { scale: 1.18, y: -60 }, 0);

        return () => {
          depthTl.scrollTrigger?.kill();
          depthTl.kill();
        };
      });

      // ── Mobile veil fade ─────────────────────────────────────────────────────
      // No pin on mobile — the veil simply scrubs out as the hero scrolls away,
      // revealing the backdrop stage behind the following sections.
      mm.add('(max-width: 767px)', () => {
        const veilTween = gsap.fromTo(
          '#hero-veil',
          { autoAlpha: 1 },
          {
            autoAlpha: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '#hero',
              start: 'top top',
              end: 'bottom 45%',
              scrub: true,
            },
          }
        );

        return () => {
          veilTween.scrollTrigger?.kill();
          veilTween.kill();
        };
      });
    },

    enter() {
      // The copy entrance is a CSS animation that has already played by the
      // time this runs (see init). The scroll-hint's idle bob is a CSS loop too,
      // parked by offscreen.ts when the hero leaves the viewport.
    },

    leave() {
      // Nothing to pause — see enter().
    },

    progress(_p: number) {
      // Desktop depth is driven by the pinned scrub; mobile hero is a static panda.
      // No per-frame work needed here.
    },

    destroy() {
      mm?.revert();
    },
  };
};

export default heroScene;
