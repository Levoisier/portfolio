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
  el: HTMLElement;
  path: string;
  rate: number;
  drift?: number;
};

const LAYER_CONFIG = [
  { id: 'stage-atmosphere', path: '/media/backdrop/atmosphere.webp', rate: 0.05 },
  { id: 'stage-mid-glass', path: '/media/backdrop/mid-glass.webp', rate: 0.15, drift: 32 },
  { id: 'stage-particles', path: '/media/backdrop/particles.webp', rate: 0.3 },
] as const;

function loadLayer(layer: BackdropLayer): void {
  const image = new Image();

  image.onload = () => {
    layer.el.style.backgroundImage = `url("${layer.path}")`;
  };

  image.onerror = () => {
    layer.el.style.backgroundImage = '';
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
        const drift = 'drift' in config ? config.drift : undefined;

        return el instanceof HTMLElement
          ? [{ el, path: config.path, rate: config.rate, drift }]
          : [];
      });

      layers.forEach((layer) => {
        loadLayer(layer);
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
        gsap.set(layer.el, { clearProps: 'transform,opacity,backgroundImage' });
      });
    },
  };
};

export default backdropScene;
