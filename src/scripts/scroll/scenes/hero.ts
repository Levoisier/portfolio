/**
 * Hero Scene — the REFERENCE scene. Fully working entrance animation.
 *
 * Sequence (reduced-motion: instant reveal, no motion):
 *   1. panda-body fades + slides up from y:60
 *   2. panda-head parallax layer offset reset
 *   3. hero-name chars stagger in from the left (manual split — no SplitText required)
 *   4. hero-role fades up
 *   5. hero-scroll-hint bob loop
 *
 * Parallax: on progress(p), panda-head translates upward at 0.4× rate.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

function splitChars(el: HTMLElement): HTMLElement[] {
  const text = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';
  el.textContent = '';
  el.setAttribute('aria-label', text);
  return text.split('').map((char) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? ' ' : char;
    span.style.display = 'inline-block';
    span.setAttribute('aria-hidden', 'true');
    el.appendChild(span);
    return span;
  });
}

const heroScene = (_el: Element): Scene => {
  let tl: gsap.core.Timeline | null = null;
  let bobTween: gsap.core.Tween | null = null;
  let chars: HTMLElement[] = [];

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

      const pandaBody = document.getElementById('panda-body');
      const pandaHead = document.getElementById('panda-head');
      const roleEl = document.getElementById('hero-role');
      const scrollHint = document.getElementById('hero-scroll-hint');

      if (prefersReducedMotion) {
        gsap.set([pandaBody, pandaHead, roleEl, scrollHint, ...chars], { opacity: 1, x: 0, y: 0 });
      } else {
        gsap.set([pandaBody, pandaHead], { opacity: 0, y: 60 });
        gsap.set(roleEl, { opacity: 0, y: 20 });
        gsap.set(scrollHint, { opacity: 0 });
      }
    },

    enter() {
      if (tl) tl.kill();
      bobTween?.kill();
      bobTween = null;

      const pandaBody = document.getElementById('panda-body');
      const pandaHead = document.getElementById('panda-head');
      const roleEl = document.getElementById('hero-role');
      const scrollHint = document.getElementById('hero-scroll-hint');

      if (prefersReducedMotion) {
        gsap.set([pandaBody, pandaHead, roleEl, scrollHint, ...chars], { opacity: 1, x: 0, y: 0 });
        return;
      }

      tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      tl.to(pandaBody, { opacity: 1, y: 0, duration: 1 })
        .to(pandaHead, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
        .to(
          chars,
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: { each: 0.035, from: 'start' },
          },
          '-=0.4'
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
      if (prefersReducedMotion) return;
      const pandaHead = document.getElementById('panda-head');
      if (pandaHead) {
        gsap.set(pandaHead, { y: p * -120 });
      }
    },

    destroy() {
      tl?.kill();
      bobTween?.kill();
    },
  };
};

export default heroScene;
