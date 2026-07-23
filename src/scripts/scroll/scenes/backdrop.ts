/**
 * Global backdrop scene.
 *
 * This scene listens to the controller's page-level `scroll:progress` event
 * instead of section-local progress so the fixed stage moves as one narrative
 * layer behind every section.
 *
 * Performance contract (the stage was the main startup-jank source):
 *   · Responsive sources — a 1280/1920 generated variant is picked per the
 *     effective viewport width so phones/laptops never decode the 2560px art.
 *   · Sequential loading — layers download + decode one at a time (async,
 *     low fetch priority), back to front, so they never compete with the LCP
 *     panda or block the main thread with three simultaneous webp decodes.
 *   · Per-frame writes go through cached gsap.quickSetter functions (no tween
 *     allocation per scroll tick) and skip when progress hasn't meaningfully
 *     changed. Viewport height is cached and refreshed on resize.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

type BackdropLayer = {
  el: HTMLElement; // OUTER layer — receives parallax transform + opacity
  fill: HTMLElement; // INNER .stage-depth — receives the background image
  path: string;
  rate: number;
  drift: number;
  setX: (value: number) => void;
  setY: (value: number) => void;
  setOpacity: ((value: number) => void) | null;
};

const LAYER_CONFIG = [
  { id: 'stage-atmosphere', name: 'atmosphere', rate: 0.05 },
  { id: 'stage-mid-glass', name: 'mid-glass', rate: 0.15, drift: 32 },
  { id: 'stage-particles', name: 'particles', rate: 0.3 },
] as const;

/** Smallest generated variant that still covers the effective viewport width. */
function layerPath(name: string): string {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const effectiveWidth = window.innerWidth * dpr;

  if (effectiveWidth <= 1280) return `/media/backdrop/generated/${name}-1280.webp`;
  if (effectiveWidth <= 1920) return `/media/backdrop/generated/${name}-1920.webp`;
  return `/media/backdrop/${name}.webp`;
}

/** Download + decode off the critical path, then fade the fill in. */
async function loadLayer(layer: BackdropLayer): Promise<void> {
  const image = new Image();
  image.decoding = 'async';
  image.setAttribute('fetchpriority', 'low');
  image.src = layer.path;

  try {
    await image.decode();
    layer.fill.style.backgroundImage = `url("${layer.path}")`;
    // Fade the image in over the base gradient so it never hard-pops.
    gsap.fromTo(layer.fill, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'sine.out' });
  } catch {
    layer.fill.style.backgroundImage = '';
    gsap.set(layer.fill, { opacity: 1 });
  }
}

function atmosphereOpacity(progress: number): number {
  const distanceFromMidpoint = Math.abs(progress - 0.5) / 0.5;
  return 1 - 0.2 * (1 - Math.min(distanceFromMidpoint, 1));
}

const backdropScene = (_el: Element): Scene => {
  let layers: BackdropLayer[] = [];
  let progressHandler: ((event: Event) => void) | null = null;
  let resizeHandler: (() => void) | null = null;
  let viewportHeight = 0;
  let lastProgress = -1;

  function render(progress: number): void {
    if (Math.abs(progress - lastProgress) < 0.0005) return;
    lastProgress = progress;

    layers.forEach((layer) => {
      layer.setY(-viewportHeight * layer.rate * progress);
      layer.setX(layer.drift * progress);
      layer.setOpacity?.(atmosphereOpacity(progress));
    });
  }

  return {
    init() {
      viewportHeight = window.innerHeight;

      layers = LAYER_CONFIG.flatMap((config) => {
        const el = document.getElementById(config.id);
        const fill = el?.querySelector<HTMLElement>('.stage-depth') ?? null;

        return el instanceof HTMLElement && fill instanceof HTMLElement
          ? [
              {
                el,
                fill,
                path: layerPath(config.name),
                rate: config.rate,
                drift: 'drift' in config ? config.drift : 0,
                setX: gsap.quickSetter(el, 'x', 'px') as (value: number) => void,
                setY: gsap.quickSetter(el, 'y', 'px') as (value: number) => void,
                setOpacity:
                  config.name === 'atmosphere'
                    ? (gsap.quickSetter(el, 'opacity') as (value: number) => void)
                    : null,
              },
            ]
          : [];
      });

      layers.forEach((layer) => {
        // Start the image transparent so it can fade in on decode. The outer
        // layer stays fully opaque.
        gsap.set(layer.fill, { opacity: 0 });
        gsap.set(layer.el, { x: 0, y: 0, opacity: 1 });
      });

      // Back-to-front chain: each layer starts only after the previous one has
      // decoded, so startup never pays for three decodes at once.
      void layers.reduce((chain, layer) => chain.then(() => loadLayer(layer)), Promise.resolve());

      progressHandler = (event: Event) => {
        const progress = (event as CustomEvent<{ progress: number }>).detail?.progress ?? 0;
        render(progress);
      };

      resizeHandler = () => {
        viewportHeight = window.innerHeight;
        lastProgress = -1; // force a re-render with the new metrics
      };

      window.addEventListener('scroll:progress', progressHandler);
      window.addEventListener('resize', resizeHandler);
      render(0);
    },

    enter() {
      lastProgress = -1;
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
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }

      layers.forEach((layer) => {
        gsap.set(layer.el, { clearProps: 'transform,opacity' });
        gsap.set(layer.fill, { clearProps: 'backgroundImage,opacity' });
      });
    },
  };
};

export default backdropScene;
