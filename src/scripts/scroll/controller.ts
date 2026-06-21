/**
 * SCROLL CONTROLLER — core. Do not modify this file to add scenes.
 * Add scenes by creating a module in ./scenes/ and registering in the
 * SCENE_REGISTRY below (one line per scene).
 *
 * Architecture:
 *   · Registers GSAP + ScrollTrigger once.
 *   · Queries [data-scene] elements in DOM order.
 *   · Matches each to a registered factory, calls init(), wires ST callbacks.
 *   · Emits a global scroll progress signal (0→1 over the full page) on
 *     a custom event "scroll:progress" for the parallax backdrop stage.
 *   · Respects prefers-reduced-motion: skips animation init, only mount.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import type { SceneFactory } from './types';

// ─── Scene imports ────────────────────────────────────────────────────────────
// ADD NEW SCENES HERE (import + registry entry). Touch nothing else.
import heroSceneFactory from './scenes/hero';
import backdropSceneFactory from './scenes/backdrop';
import skillsSceneFactory from './scenes/skills';
import projectsSceneFactory from './scenes/projects';
import confidentialSceneFactory from './scenes/confidential';
import contactSceneFactory from './scenes/contact';

// ─── Registry ─────────────────────────────────────────────────────────────────
// key = value of data-scene attribute on the section element
const SCENE_REGISTRY: Record<string, SceneFactory> = {
  backdrop: backdropSceneFactory,
  hero: heroSceneFactory,
  skills: skillsSceneFactory,
  projects: projectsSceneFactory,
  confidential: confidentialSceneFactory,
  contact: contactSceneFactory,
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Smooth scroll (SANCTIONED engine infra — Golden Rule 3 covers scene-adding) ──
// ScrollSmoother owns scrolling for the whole page. It transforms #smooth-content
// inside the fixed #smooth-wrapper (see Layout.astro). #scroll-stage is a sibling
// OUTSIDE the wrapper so it stays truly fixed. `effects: true` enables data-speed /
// data-lag for later phases. Reduced motion: skip entirely → native scroll.
// This is the ONLY edit permitted to the controller core. Do not add scene logic here.
function initSmoothScroll(): void {
  if (prefersReducedMotion) return;
  ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 1.2,
    effects: true,
    smoothTouch: 0,
  });
}
// ─── End smooth scroll infra ──────────────────────────────────────────────────

/** Global progress signal — emitted on every ScrollTrigger refresh tick. */
function emitGlobalProgress(progress: number): void {
  window.dispatchEvent(new CustomEvent('scroll:progress', { detail: { progress } }));
}

function mountScenes(): void {
  const sceneElements = document.querySelectorAll<HTMLElement>('[data-scene]');

  // Global ScrollTrigger that drives the parallax backdrop stage.
  ScrollTrigger.create({
    trigger: '#scroll-content',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => emitGlobalProgress(self.progress),
  });

  sceneElements.forEach((el) => {
    const sceneId = el.dataset['scene'];
    if (!sceneId) return;

    const factory = SCENE_REGISTRY[sceneId];
    if (!factory) {
      console.warn(`[controller] No scene registered for data-scene="${sceneId}"`);
      return;
    }

    const scene = factory(el);
    scene.init(el);

    // Make element visible (was opacity:0 to prevent FOUC)
    gsap.set(el, { opacity: 1 });

    if (prefersReducedMotion) {
      // Skip GSAP animation — just show content immediately.
      gsap.set(el, { opacity: 1 });
      return;
    }

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      end: 'bottom top',
      onEnter: () => scene.enter(),
      onLeave: () => scene.leave(),
      onEnterBack: () => scene.enter(),
      onLeaveBack: () => scene.leave(),
      onUpdate: (self) => scene.progress(self.progress),
    });
  });

  ScrollTrigger.refresh();
}

// ─── Entry point ──────────────────────────────────────────────────────────────

function bootstrap(): void {
  initSmoothScroll(); // create the smoother before scene ScrollTriggers mount
  mountScenes();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Cleanup on Astro view transitions (future-proof)
document.addEventListener('astro:before-swap', () => {
  ScrollSmoother.get()?.kill();
  ScrollTrigger.getAll().forEach((st) => st.kill());
});
