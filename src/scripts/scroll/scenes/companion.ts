/**
 * Panda companion scene.
 *
 * Desktop-only fixed companion outside ScrollSmoother. It follows a viewport
 * path driven by the controller's global scroll progress and softly cross-fades
 * between full-body poses. The first/last waypoints fade out so it visually
 * merges with the static hero and footer pandas instead of overlapping them.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

type PoseName = 'hero' | 'master' | 'coding' | 'wave';

type PathPoint = {
  p: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  pose: PoseName;
};

const DESKTOP_QUERY = '(min-width: 1024px)';

const PATH: PathPoint[] = [
  { p: 0, x: 0.5, y: 0.44, scale: 1.15, rotation: 0, opacity: 0, pose: 'hero' },
  { p: 0.14, x: 0.5, y: 0.44, scale: 1.05, rotation: 0, opacity: 0, pose: 'hero' },
  { p: 0.24, x: 0.78, y: 0.2, scale: 0.86, rotation: -7, opacity: 0.86, pose: 'master' },
  { p: 0.42, x: 0.12, y: 0.54, scale: 0.92, rotation: 8, opacity: 0.88, pose: 'coding' },
  { p: 0.58, x: 0.74, y: 0.5, scale: 0.9, rotation: -5, opacity: 0.86, pose: 'hero' },
  { p: 0.74, x: 0.18, y: 0.24, scale: 0.82, rotation: 7, opacity: 0.82, pose: 'master' },
  { p: 0.88, x: 0.74, y: 0.56, scale: 0.9, rotation: -3, opacity: 0.84, pose: 'wave' },
  { p: 0.96, x: 0.82, y: 0.62, scale: 0.98, rotation: 0, opacity: 0, pose: 'wave' },
  { p: 1, x: 0.82, y: 0.62, scale: 0.98, rotation: 0, opacity: 0, pose: 'wave' },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pointForProgress(progress: number): PathPoint {
  const p = clamp01(progress);
  const fallback = PATH[PATH.length - 1] as PathPoint;

  for (let i = 0; i < PATH.length - 1; i += 1) {
    const from = PATH[i] as PathPoint;
    const to = PATH[i + 1] ?? fallback;
    if (p < from.p || p > to.p) continue;

    const local = to.p === from.p ? 0 : (p - from.p) / (to.p - from.p);
    const eased = gsap.parseEase('sine.inOut')(clamp01(local));

    return {
      p,
      x: interpolate(from.x, to.x, eased),
      y: interpolate(from.y, to.y, eased),
      scale: interpolate(from.scale, to.scale, eased),
      rotation: interpolate(from.rotation, to.rotation, eased),
      opacity: interpolate(from.opacity, to.opacity, eased),
      pose: local < 0.5 ? from.pose : to.pose,
    };
  }

  return fallback;
}

const companionScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = el as HTMLElement;
  const stage = container.querySelector<HTMLElement>('[data-companion-stage]');
  const look = container.querySelector<HTMLElement>('[data-companion-look]');
  let mm: gsap.MatchMedia | null = null;
  let progressHandler: ((event: Event) => void) | null = null;
  let cleanupMouse: (() => void) | null = null;
  let activePose: PoseName | null = null;

  function poseEl(name: PoseName): HTMLElement | null {
    return container.querySelector<HTMLElement>(`[data-companion-pose="${name}"]`);
  }

  function setPose(name: PoseName): void {
    if (activePose === name) return;
    activePose = name;

    const allPoses = Array.from(container.querySelectorAll<HTMLElement>('[data-companion-pose]'));
    gsap.to(allPoses, {
      opacity: 0,
      duration: 0.38,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    gsap.to(poseEl(name), {
      opacity: 1,
      duration: 0.5,
      ease: 'expo.out',
      overwrite: 'auto',
    });
  }

  function render(progress: number): void {
    if (!stage) return;

    const point = pointForProgress(progress);
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const bob = point.opacity > 0 ? Math.sin(progress * Math.PI * 10) * 10 : 0;
    const driftRotation = point.opacity > 0 ? Math.sin(progress * Math.PI * 8) * 3 : 0;

    setPose(point.pose);
    gsap.set(stage, {
      opacity: point.opacity,
      x: window.innerWidth * point.x - width / 2,
      y: window.innerHeight * point.y - height / 2 + bob,
      scale: point.scale,
      rotation: point.rotation + driftRotation,
    });
  }

  function setupCursorTracking(): void {
    if (!look) return;

    const xTo = gsap.quickTo(look, 'x', { duration: 0.35, ease: 'expo.out' });
    const yTo = gsap.quickTo(look, 'y', { duration: 0.35, ease: 'expo.out' });
    const rotateTo = gsap.quickTo(look, 'rotation', { duration: 0.35, ease: 'expo.out' });

    const onMove = (event: MouseEvent): void => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (event.clientX - centerX) / window.innerWidth));
      const dy = Math.max(-1, Math.min(1, (event.clientY - centerY) / window.innerHeight));

      xTo(dx * 14);
      yTo(dy * 10);
      rotateTo(dx * 6);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    cleanupMouse = () => {
      window.removeEventListener('mousemove', onMove);
      xTo.tween.kill();
      yTo.tween.kill();
      rotateTo.tween.kill();
    };
  }

  return {
    init() {
      const allPoses = Array.from(container.querySelectorAll<HTMLElement>('[data-companion-pose]'));
      gsap.set(stage, { opacity: 0, x: 0, y: 0, scale: 1, rotation: 0 });
      gsap.set(look, { x: 0, y: 0, rotation: 0 });
      gsap.set(allPoses, { opacity: 0 });

      if (prefersReducedMotion) {
        gsap.set(stage, {
          opacity: 0.78,
          x: window.innerWidth * 0.78,
          y: window.innerHeight * 0.28,
        });
        gsap.set(poseEl('master'), { opacity: 1 });
        return;
      }

      mm = gsap.matchMedia();

      mm.add(DESKTOP_QUERY, () => {
        setupCursorTracking();
        render(0);

        progressHandler = (event: Event) => {
          const progress = (event as CustomEvent<{ progress: number }>).detail?.progress ?? 0;
          render(progress);
        };

        window.addEventListener('scroll:progress', progressHandler);

        return () => {
          if (progressHandler) window.removeEventListener('scroll:progress', progressHandler);
          progressHandler = null;
          cleanupMouse?.();
          cleanupMouse = null;
        };
      });
    },

    enter() {
      // Global scroll progress drives this fixed companion path.
    },

    leave() {
      // Persistent fixed companion; merge zones are encoded in the path opacity.
    },

    progress() {
      // Global `scroll:progress` drives this scene.
    },

    destroy() {
      if (progressHandler) window.removeEventListener('scroll:progress', progressHandler);
      cleanupMouse?.();
      mm?.revert();
      gsap.killTweensOf([
        stage,
        look,
        ...Array.from(container.querySelectorAll('[data-companion-pose]')),
      ]);
      gsap.set([stage, look, ...Array.from(container.querySelectorAll('[data-companion-pose]'))], {
        clearProps: 'opacity,transform,willChange',
      });
    },
  };
};

export default companionScene;
