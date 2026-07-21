/**
 * Global backdrop scene.
 *
 * This scene listens to the controller's page-level `scroll:progress` event
 * instead of section-local progress so the fixed stage moves as one narrative
 * layer behind every section.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

type BackdropLayer = {
  el: HTMLElement; // OUTER layer — receives parallax transform + opacity
  fill: HTMLElement; // INNER .stage-depth — receives the background image
  path: string;
  rate: number;
  drift?: number;
};

const LAYER_CONFIG = [
  { id: 'stage-atmosphere', path: '/media/backdrop/atmosphere.webp', rate: 0.05 },
  { id: 'stage-mid-glass', path: '/media/backdrop/mid-glass.webp', rate: 0.15, drift: 32 },
  { id: 'stage-particles', path: '/media/backdrop/particles.webp', rate: 0.3 },
] as const;

function loadLayer(layer: BackdropLayer, animateIn: boolean): void {
  const image = new Image();

  image.onload = () => {
    layer.fill.style.backgroundImage = `url("${layer.path}")`;
    // Fade the image in over the base gradient so it never hard-pops.
    if (animateIn) {
      gsap.fromTo(layer.fill, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'sine.out' });
    } else {
      gsap.set(layer.fill, { opacity: 1 });
    }
  };

  image.onerror = () => {
    layer.fill.style.backgroundImage = '';
    gsap.set(layer.fill, { opacity: 1 });
  };

  image.src = layer.path;
}

function atmosphereOpacity(progress: number): number {
  const distanceFromMidpoint = Math.abs(progress - 0.5) / 0.5;
  return 1 - 0.2 * (1 - Math.min(distanceFromMidpoint, 1));
}

const backdropScene = (_el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let layers: BackdropLayer[] = [];
  let progressHandler: ((event: Event) => void) | null = null;

  function render(progress: number): void {
    layers.forEach((layer) => {
      const y = prefersReducedMotion ? 0 : -window.innerHeight * layer.rate * progress;
      const x = prefersReducedMotion ? 0 : (layer.drift ?? 0) * progress;
      const opacity = layer.path.includes('atmosphere') ? atmosphereOpacity(progress) : 1;

      gsap.set(layer.el, {
        x,
        y,
        opacity,
      });
    });
  }

  return {
    init() {
      layers = LAYER_CONFIG.flatMap((config) => {
        const el = document.getElementById(config.id);
        const fill = el?.querySelector<HTMLElement>('.stage-depth') ?? null;
        const drift = 'drift' in config ? config.drift : undefined;

        return el instanceof HTMLElement && fill instanceof HTMLElement
          ? [{ el, fill, path: config.path, rate: config.rate, drift }]
          : [];
      });

      layers.forEach((layer) => {
        // Start the image transparent so it can fade in on decode (unless reduced
        // motion, where it just appears). The outer layer stays fully opaque.
        gsap.set(layer.fill, { opacity: prefersReducedMotion ? 1 : 0 });
        loadLayer(layer, !prefersReducedMotion);
        gsap.set(layer.el, { x: 0, y: 0, opacity: 1 });
      });

      if (prefersReducedMotion) return;

      progressHandler = (event: Event) => {
        const progress = (event as CustomEvent<{ progress: number }>).detail?.progress ?? 0;
        render(progress);
      };

      window.addEventListener('scroll:progress', progressHandler);
      render(0);
    },

    enter() {
      render(0);
    },

    leave() {
      // The backdrop persists across the full document; no section-local leave state.
    },

    progress() {
      // Global `scroll:progress` drives this scene.
    },

    destroy() {
      if (progressHandler) {
        window.removeEventListener('scroll:progress', progressHandler);
      }

      layers.forEach((layer) => {
        gsap.set(layer.el, { clearProps: 'transform,opacity' });
        gsap.set(layer.fill, { clearProps: 'backgroundImage,opacity' });
      });
    },
  };
};

export default backdropScene;
