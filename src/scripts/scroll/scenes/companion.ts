/**
 * Panda companion scene.
 *
 * Fixed desktop-only character layer outside ScrollSmoother. Section ScrollTriggers
 * cross-fade between existing panda poses; cursor tracking uses quickTo and only
 * runs when motion is allowed.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../types';

type CompanionSection = 'hero' | 'projects' | 'confidential' | 'skills' | 'contact';
type PoseName = Exclude<CompanionSection, 'hero'>;

const DESKTOP_QUERY = '(min-width: 1024px)';

const SECTION_POSES: Record<PoseName, string> = {
  projects: 'projects',
  confidential: 'confidential',
  skills: 'skills',
  contact: 'contact',
};

const companionScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = el as HTMLElement;
  const stage = container.querySelector<HTMLElement>('[data-companion-stage]');
  let mm: gsap.MatchMedia | null = null;
  let activePose: PoseName | null = null;
  let triggers: ScrollTrigger[] = [];
  let cleanupMouse: (() => void) | null = null;

  function poseEl(name: PoseName): HTMLElement | null {
    return container.querySelector<HTMLElement>(`[data-companion-pose="${SECTION_POSES[name]}"]`);
  }

  function activate(section: CompanionSection): void {
    if (!stage) return;

    if (section === 'hero') {
      activePose = null;
      gsap.to(stage, {
        opacity: 0,
        duration: 0.28,
        ease: 'expo.out',
        overwrite: 'auto',
      });
      return;
    }

    if (activePose === section) return;
    activePose = section;
    container.dataset.activeSection = section;

    const allPoses = Array.from(container.querySelectorAll<HTMLElement>('[data-companion-pose]'));
    const nextPose = poseEl(section);

    gsap.to(stage, {
      opacity: section === 'confidential' ? 0.18 : 0.28,
      duration: 0.3,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    gsap.to(allPoses, {
      opacity: 0,
      duration: 0.22,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    gsap.to(nextPose, {
      opacity: 1,
      duration: 0.32,
      ease: 'expo.out',
      overwrite: 'auto',
    });
  }

  function setupCursorTracking(): void {
    if (!stage) return;

    const xTo = gsap.quickTo(stage, 'x', { duration: 0.35, ease: 'expo.out' });
    const yTo = gsap.quickTo(stage, 'y', { duration: 0.35, ease: 'expo.out' });
    const rotateTo = gsap.quickTo(stage, 'rotation', { duration: 0.35, ease: 'expo.out' });

    const onMove = (event: MouseEvent): void => {
      const rect = stage.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (event.clientX - centerX) / window.innerWidth));
      const dy = Math.max(-1, Math.min(1, (event.clientY - centerY) / window.innerHeight));

      xTo(dx * 18);
      yTo(dy * 14);
      rotateTo(dx * 8);
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
      gsap.set(stage, { opacity: 0, x: 0, y: 0, rotation: 0 });
      gsap.set(allPoses, { opacity: 0 });

      if (prefersReducedMotion) {
        gsap.set(stage, { opacity: 0.18, x: 0, y: 0, rotation: 0 });
        gsap.set(poseEl('projects'), { opacity: 1 });
        return;
      }

      mm = gsap.matchMedia();

      mm.add(DESKTOP_QUERY, () => {
        setupCursorTracking();

        const sectionOrder: CompanionSection[] = [
          'hero',
          'projects',
          'confidential',
          'skills',
          'contact',
        ];

        triggers = sectionOrder.flatMap((section) => {
          const trigger = document.getElementById(section);
          if (!trigger) return [];

          return [
            ScrollTrigger.create({
              trigger,
              start: 'top center',
              end: 'bottom center',
              onEnter: () => activate(section),
              onEnterBack: () => activate(section),
            }),
          ];
        });

        return () => {
          cleanupMouse?.();
          cleanupMouse = null;
          triggers.forEach((trigger) => trigger.kill());
          triggers = [];
        };
      });
    },

    enter() {
      // Section triggers inside this scene choose the active pose.
    },

    leave() {
      // Persistent fixed companion; no section-local leave state.
    },

    progress() {
      // Pose changes are driven by per-section ScrollTriggers, not generic progress.
    },

    destroy() {
      cleanupMouse?.();
      triggers.forEach((trigger) => trigger.kill());
      mm?.revert();
      gsap.killTweensOf([
        stage,
        ...Array.from(container.querySelectorAll('[data-companion-pose]')),
      ]);
      gsap.set([stage, ...Array.from(container.querySelectorAll('[data-companion-pose]'))], {
        clearProps: 'opacity,transform,willChange',
      });
    },
  };
};

export default companionScene;
