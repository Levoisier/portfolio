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
import type { SceneFactory } from './types';

// ─── Scene imports ────────────────────────────────────────────────────────────
// ADD NEW SCENES HERE (import + registry entry). Touch nothing else.
import heroSceneFactory from './scenes/hero';
import backdropSceneFactory from './scenes/backdrop';
import revealSceneFactory from './scenes/revealPlaceholder';

// ─── Registry ─────────────────────────────────────────────────────────────────
// key = value of data-scene attribute on the section element
const SCENE_REGISTRY: Record<string, SceneFactory> = {
  backdrop: backdropSceneFactory,
  hero: heroSceneFactory,
  skills: revealSceneFactory,
  projects: revealSceneFactory,
  confidential: revealSceneFactory,
  contact: revealSceneFactory,
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountScenes);
} else {
  mountScenes();
}

// Cleanup on Astro view transitions (future-proof)
document.addEventListener('astro:before-swap', () => {
  ScrollTrigger.getAll().forEach((st) => st.kill());
});
