/**
 * Hero Scene — the REFERENCE scene.
 *
 * Desktop (≥768px, no reduced-motion): pinned scrub DEPTH INTRO.
 *   The hero pins for ~140vh of scroll. On scrub 0→1 the stage layers gain depth
 *   (atmosphere recedes + darkens, mid-glass drifts laterally, particles push
 *   toward the viewer), panda-head separates upward from panda-body, and the
 *   molecule thread drifts. These run on the INNER .stage-depth channel so the
 *   backdrop's outer parallax keeps running with no conflict and no jump when the
 *   pin releases. The text entrance (name/role/hint) plays once on enter.
 *
 * Mobile (<768px): the v1 entrance choreography — no pin; panda-head parallax via
 *   progress().
 *
 * Reduced motion: instant reveal, no pin/scrub/loops.
 *
 * LCP guard: panda-body is the LCP element and is NEVER written by this scene.
 * Every depth tween uses fromTo() so the frame at scrub progress 0 is identical
 * to the static painted hero.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

function splitChars(el: HTMLElement): HTMLElement[] {
  const text = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';
  el.textContent = '';
  el.setAttribute('aria-label', text);
  return text.split('').map((char) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? ' ' : char;
    span.style.display = 'inline-block';
    span.setAttribute('aria-hidden', 'true');
    el.appendChild(span);
    return span;
  });
}

function loadHeroHead(el: HTMLImageElement | null): void {
  const src = el?.dataset.heroHeadSrc;
  if (!el || !src || el.src.endsWith(src)) return;

  el.onload = () => {
    gsap.to(el, { opacity: 1, duration: 0.6, ease: 'expo.out', overwrite: 'auto' });
  };
  el.src = src;
}

const isDesktop = (): boolean => window.matchMedia('(min-width: 768px)').matches;

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

      const pandaHead = document.getElementById('panda-head');
      const roleEl = document.getElementById('hero-role');
      const scrollHint = document.getElementById('hero-scroll-hint');

      if (prefersReducedMotion) {
        loadHeroHead(pandaHead instanceof HTMLImageElement ? pandaHead : null);
        const pandaBody = document.getElementById('panda-body');
        gsap.set([pandaBody, pandaHead, roleEl, scrollHint, ...chars], { opacity: 1, x: 0, y: 0 });
        return;
      }

      gsap.set(roleEl, { opacity: 0, y: 20 });
      gsap.set(scrollHint, { opacity: 0 });

      // ── Desktop pinned depth intro ───────────────────────────────────────────
      // matchMedia adds/removes the pin on resize and reverts its inline styles.
      mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        // Head starts at rest; the scrub separates it upward.
        gsap.set(pandaHead, { opacity: 0, y: 0 });

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
        // progress-0 frame equals the static hero. panda-body is untouched (LCP).
        depthTl
          .fromTo('#panda-head', { y: 0 }, { y: -170 }, 0)
          .fromTo(
            '#stage-atmosphere .stage-depth',
            { scale: 1, opacity: 1 },
            { scale: 0.92, opacity: 0.72 },
            0
          )
          .fromTo('#stage-mid-glass .stage-depth', { x: 0 }, { x: 70 }, 0)
          .fromTo('#stage-particles .stage-depth', { scale: 1, y: 0 }, { scale: 1.18, y: -60 }, 0)
          .fromTo('#molecule-a', { x: 0, y: 0 }, { x: 40, y: -50 }, 0)
          .fromTo('#molecule-b', { x: 0, y: 0 }, { x: -40, y: -30 }, 0);

        return () => {
          depthTl.scrollTrigger?.kill();
          depthTl.kill();
        };
      });

      // ── Mobile entrance: panda-head rises (v1) ───────────────────────────────
      mm.add('(max-width: 767px)', () => {
        gsap.set(pandaHead, { opacity: 0, y: 60 });
      });
    },

    enter() {
      if (tl) tl.kill();
      bobTween?.kill();
      bobTween = null;

      const pandaHead = document.getElementById('panda-head') as HTMLImageElement | null;
      const roleEl = document.getElementById('hero-role');
      const scrollHint = document.getElementById('hero-scroll-hint');

      if (prefersReducedMotion) {
        const pandaBody = document.getElementById('panda-body');
        gsap.set([pandaBody, pandaHead, roleEl, scrollHint, ...chars], { opacity: 1, x: 0, y: 0 });
        return;
      }

      // On desktop the head is part of the pinned depth intro, so reveal it now
      // (post-idle, post-LCP) instead of waiting for the first scroll.
      if (isDesktop()) loadHeroHead(pandaHead);

      tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      tl.to(
        chars,
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          stagger: { each: 0.035, from: 'start' },
        },
        '+=0.1'
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

    progress(p: number) {
      // Desktop panda-head is driven by the pinned depth intro; only mobile uses
      // this per-frame parallax (avoids double-driving the head).
      if (prefersReducedMotion || isDesktop()) return;
      const pandaHead = document.getElementById('panda-head') as HTMLImageElement | null;
      if (pandaHead) {
        if (window.scrollY > 16) loadHeroHead(pandaHead);
        gsap.set(pandaHead, { y: p * -120 });
      }
    },

    destroy() {
      tl?.kill();
      bobTween?.kill();
      mm?.revert();
    },
  };
};

export default heroScene;
