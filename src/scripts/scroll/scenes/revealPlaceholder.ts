/**
 * Reveal Placeholder Scene
 *
 * Generic reveal-on-scroll used by all non-hero sections until each gets
 * its own choreography scene. Fades + slides the section up on enter.
 *
 * Replace by registering a dedicated factory in controller.ts registry;
 * this file stays as the fallback — never delete it.
 *
 * Reduced-motion: instant opacity reveal, no Y motion.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

const REVEAL_DURATION = 0.7;
const REVEAL_Y = 40;

const revealPlaceholder = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let entered = false;

  return {
    init(_el: Element) {
      if (!prefersReducedMotion) {
        gsap.set(el, { opacity: 0, y: REVEAL_Y });
      }
    },

    enter() {
      if (entered) return;
      entered = true;

      if (prefersReducedMotion) {
        gsap.set(el, { opacity: 1 });
      } else {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: REVEAL_DURATION,
          ease: 'expo.out',
        });
      }
    },

    leave() {
      // intentional no-op — sections stay visible once revealed
    },

    progress(_p: number) {
      // no per-frame work for placeholder scenes
    },

    destroy() {
      gsap.set(el, { clearProps: 'opacity,transform' });
    },
  };
};

export default revealPlaceholder;
