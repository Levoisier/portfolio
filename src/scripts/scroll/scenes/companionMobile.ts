/**
 * Mobile panda companion scene.
 *
 * The desktop companion (scenes/companion.ts) is a fixed cursor-aware buddy that
 * journeys across a wide viewport. It is hidden < 1024px, so phones lose the
 * signature panda entirely. This is the touch-native counterpart: a compact
 * corner buddy that
 *   · swaps pose per section via per-section ScrollTriggers (work on native
 *     touch scroll — no ScrollSmoother needed),
 *   · bobs gently while idle,
 *   · follows device tilt instead of the cursor (touch-tilt.ts → `tilt:change`),
 *   · reacts to a tap with a wave, and grants iOS motion access on that tap.
 *
 * Transform/opacity only; lazy imgs; scoped to (max-width: 1023px) via
 * matchMedia so it never touches desktop. Reduced motion: a single static pose,
 * no route, no bob, no tilt, no tap reaction — same contract as the desktop
 * companion (companion.ts) and Golden Rule 4.
 *
 * Channel discipline (so drivers never fight on the same property):
 *   · stage : opacity + y (section peek in/out) + scale (tap bounce)
 *   · look  : x + rotation (device tilt) and y (idle bob)
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../types';
import { requestTilt, TILT_EVENT, type TiltDetail } from '../../touch-tilt';
import { getCurrentLang } from '../../i18n';
import { translations } from '../../../i18n/translations';

function hintText(): string {
  return translations[getCurrentLang()]['companion.hint'] ?? 'tap me · tilt to play';
}

type PoseName = 'hero' | 'master' | 'coding' | 'wave' | 'head';

const MOBILE_QUERY = '(max-width: 1023px)';
const VISIBLE_OPACITY = 0.95;

// Pose shown while each section is the active one. Hero greets + Contact says
// goodbye with the wave; Confidential uses the redacted head silhouette guard.
const SECTION_POSE: Record<string, PoseName> = {
  hero: 'wave',
  projects: 'coding',
  confidential: 'head',
  skills: 'master',
  contact: 'wave',
};

const companionMobileScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = el as HTMLElement;
  const stage = container.querySelector<HTMLElement>('[data-companion-stage]');
  const look = container.querySelector<HTMLElement>('[data-companion-look]');
  const tapTarget = container.querySelector<HTMLElement>('[data-companion-tap]');
  let mm: gsap.MatchMedia | null = null;
  let activePose: PoseName | null = null;

  function poseEl(name: PoseName): HTMLElement | null {
    return container.querySelector<HTMLElement>(`[data-companion-pose="${name}"]`);
  }

  // Gentle turn cross-fade: opacity + a slight scale/slide on the incoming pose
  // so a swap reads as the panda turning rather than popping (mirrors desktop).
  function setPose(name: PoseName): void {
    if (activePose === name) return;
    activePose = name;
    const incoming = poseEl(name);
    const outgoing = Array.from(
      container.querySelectorAll<HTMLElement>('[data-companion-pose]')
    ).filter((node) => node !== incoming);

    gsap.to(outgoing, { opacity: 0, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
    if (incoming) {
      gsap.fromTo(
        incoming,
        { opacity: 0, scale: 0.92, xPercent: -6 },
        { opacity: 1, scale: 1, xPercent: 0, duration: 0.7, ease: 'expo.out', overwrite: 'auto' }
      );
    }
  }

  return {
    init() {
      const allPoses = Array.from(container.querySelectorAll<HTMLElement>('[data-companion-pose]'));
      gsap.set(stage, { opacity: 0, y: 0, scale: 1 });
      gsap.set(look, { x: 0, y: 0, rotation: 0 });
      gsap.set(allPoses, { opacity: 0 });

      if (prefersReducedMotion) {
        // Single static pose, parked in the corner. No route / bob / tilt / tap.
        gsap.set(stage, { opacity: 0.85 });
        gsap.set(poseEl('master'), { opacity: 1 });
        activePose = 'master';
        return;
      }

      mm = gsap.matchMedia();

      mm.add(MOBILE_QUERY, () => {
        if (!stage) return;
        let sectionPose: PoseName = 'wave';

        // ── Section peek: show the stage at an authored pose ─────────────────
        function showPose(pose: PoseName): void {
          sectionPose = pose;
          setPose(pose);
          gsap.to(stage, {
            opacity: VISIBLE_OPACITY,
            y: 0,
            duration: 0.6,
            ease: 'expo.out',
            overwrite: 'auto',
          });
        }

        // ── Idle bob (look-y channel; tilt only writes x + rotation) ─────────
        const bob = gsap.to(look, {
          y: -6,
          duration: 1.6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });

        // ── Device tilt → gaze (replaces desktop cursor look-toward) ─────────
        const lookX = look ? gsap.quickTo(look, 'x', { duration: 0.4, ease: 'expo.out' }) : null;
        const lookR = look
          ? gsap.quickTo(look, 'rotation', { duration: 0.4, ease: 'expo.out' })
          : null;
        const onTilt = (event: Event): void => {
          const { x } = (event as CustomEvent<TiltDetail>).detail;
          lookX?.(x * 12);
          lookR?.(x * 6);
        };
        window.addEventListener(TILT_EVENT, onTilt, { passive: true });

        // ── One-time tilt hint (only if the sensor exists) ───────────────────
        let hint: HTMLElement | null = null;
        const onLangChange = (): void => {
          if (hint) hint.textContent = hintText();
        };
        if ('DeviceOrientationEvent' in window) {
          hint = document.createElement('span');
          hint.className = 'panda-tilt-hint';
          hint.textContent = hintText();
          stage.appendChild(hint);
          window.addEventListener('lang:change', onLangChange);
        }

        // ── Tap: wave reaction + grant iOS motion access (first tap) ─────────
        const onTap = (): void => {
          void requestTilt();
          if (hint) {
            gsap.to(hint, {
              opacity: 0,
              duration: 0.3,
              onComplete: () => hint?.remove(),
            });
            hint = null;
          }
          setPose('wave');
          gsap.fromTo(
            stage,
            { scale: 0.9 },
            { scale: 1, duration: 0.7, ease: 'back.out(2.2)', overwrite: 'auto' }
          );
          // Settle back to the section's pose after the wave beat.
          gsap.delayedCall(1.1, () => setPose(sectionPose));
        };
        tapTarget?.addEventListener('click', onTap);

        // ── Per-section pose route ───────────────────────────────────────────
        const triggers: ScrollTrigger[] = [];
        for (const [id, pose] of Object.entries(SECTION_POSE)) {
          const section = document.getElementById(id);
          if (!section) continue;
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: 'top 70%',
              end: 'bottom 30%',
              onEnter: () => showPose(pose),
              onEnterBack: () => showPose(pose),
            })
          );
        }

        // Contact handoff: as Contact scrolls past halfway, drop + fade the
        // corner buddy so it hands off to the in-section panda-wave watermark
        // (no double panda), then restore if scrolled back up.
        const contact = document.getElementById('contact');
        if (contact) {
          triggers.push(
            ScrollTrigger.create({
              trigger: contact,
              start: 'top 70%',
              end: 'bottom bottom',
              onUpdate: (self) => {
                if (self.progress > 0.5) {
                  const k = gsap.utils.clamp(0, 1, (self.progress - 0.5) / 0.4);
                  gsap.to(stage, {
                    opacity: VISIBLE_OPACITY * (1 - k),
                    y: 24 * k,
                    duration: 0.3,
                    ease: 'none',
                    overwrite: 'auto',
                  });
                }
              },
            })
          );
        }

        ScrollTrigger.refresh();

        return () => {
          triggers.forEach((t) => t.kill());
          window.removeEventListener(TILT_EVENT, onTilt);
          window.removeEventListener('lang:change', onLangChange);
          tapTarget?.removeEventListener('click', onTap);
          bob.kill();
          lookX?.tween.kill();
          lookR?.tween.kill();
          hint?.remove();
        };
      });
    },

    enter() {
      // Route is driven by the scene's own per-section ScrollTriggers.
    },

    leave() {
      // Persistent fixed companion; pose route owns the choreography.
    },

    progress() {
      // No global-progress driving — per-section triggers handle the route.
    },

    destroy() {
      mm?.revert();
      const poses = Array.from(container.querySelectorAll('[data-companion-pose]'));
      gsap.killTweensOf([stage, look, ...poses]);
      gsap.set([stage, look, ...poses], { clearProps: 'opacity,transform,willChange' });
    },
  };
};

export default companionMobileScene;
