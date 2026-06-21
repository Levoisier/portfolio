/**
 * Hero Scene — the REFERENCE scene.
 *
 * Desktop (≥768px, no reduced-motion): pinned scrub DEPTH INTRO.
 *   The hero pins for ~140vh of scroll. On scrub 0→1 the atmosphere darkens +
 *   drifts back (scale-up, no edge gap), the particles push toward the viewer,
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
 * Reduced motion: instant reveal, no pin/scrub/loops.
 *
 * LCP guard: panda-body is the LCP element. This scene never writes opacity or
 * transform to it, so the frame at scroll progress 0 is identical to the static
 * painted hero.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

function splitChars(el: HTMLElement): HTMLElement[] {
  const text = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';
  el.textContent = '';
  el.setAttribute('aria-label', text);
  return text.split('').map((char) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.display = 'inline-block';
    if (char === ' ') {
      span.style.width = '0.32em';
    }
    span.setAttribute('aria-hidden', 'true');
    el.appendChild(span);
    return span;
  });
}

const heroScene = (_el: Element): Scene => {
  let tl: gsap.core.Timeline | null = null;
  let bobTween: gsap.core.Tween | null = null;
  let chars: HTMLElement[] = [];
  let mm: gsap.MatchMedia | null = null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    init(_el: Element) {
      const nameEl = document.getElementById('hero-name');
      if (nameEl) {
        chars = splitChars(nameEl);
        gsap.set(chars, {
          opacity: prefersReducedMotion ? 1 : 0,
          x: prefersReducedMotion ? 0 : -24,
        });
      }

      const premiseEl = document.getElementById('hero-premise');
      const roleEl = document.getElementById('hero-role');
      const scrollHint = document.getElementById('hero-scroll-hint');
      const reactionGlow = document.getElementById('hero-reaction-glow');

      if (prefersReducedMotion) {
        gsap.set([premiseEl, roleEl, scrollHint, ...chars], { opacity: 1, x: 0, y: 0 });
        gsap.set(reactionGlow, { opacity: 0.14, scale: 1, x: 0, y: 0 });
        return;
      }

      gsap.set(premiseEl, { opacity: 0, y: 14 });
      gsap.set(roleEl, { opacity: 0, y: 20 });
      gsap.set(scrollHint, { opacity: 0 });
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
        depthTl
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
    },

    enter() {
      if (tl) tl.kill();
      bobTween?.kill();
      bobTween = null;

      const premiseEl = document.getElementById('hero-premise');
      const roleEl = document.getElementById('hero-role');
      const scrollHint = document.getElementById('hero-scroll-hint');
      const reactionGlow = document.getElementById('hero-reaction-glow');

      if (prefersReducedMotion) {
        gsap.set([premiseEl, roleEl, scrollHint, ...chars], { opacity: 1, x: 0, y: 0 });
        gsap.set(reactionGlow, { opacity: 0.14, scale: 1, x: 0, y: 0 });
        return;
      }

      tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      tl.to(premiseEl, { opacity: 1, y: 0, duration: 0.5 })
        .to(
          chars,
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: { each: 0.035, from: 'start' },
          },
          '-=0.2'
        )
        .to(roleEl, { opacity: 1, y: 0, duration: 0.6 })
        .to(
          scrollHint,
          { opacity: 1, duration: 0.4, onComplete: () => bobTween?.play(0) },
          '+=0.1'
        );

      // Bob loop for scroll hint
      if (scrollHint) {
        bobTween = gsap.to(scrollHint, {
          y: 8,
          duration: 0.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          paused: true,
        });
      }
    },

    leave() {
      bobTween?.pause();
    },

    progress(_p: number) {
      // Desktop depth is driven by the pinned scrub; mobile hero is a static panda.
      // No per-frame work needed here.
    },

    destroy() {
      tl?.kill();
      bobTween?.kill();
      mm?.revert();
    },
  };
};

export default heroScene;
