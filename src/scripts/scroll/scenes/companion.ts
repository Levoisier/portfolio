/**
 * Panda companion scene (v4 route engine).
 *
 * Desktop-only fixed companion outside ScrollSmoother. It travels a deliberate
 * zig-zag route across the page, driven by PER-SECTION ScrollTriggers (never raw
 * page progress — that misaligned the panda while sections were pinned). Each
 * section authors a waypoint; the companion eases toward it with gsap.quickTo so
 * motion glides instead of snapping, and the pose cross-fade is a gentle turn
 * (opacity + a slight scale/slide on the incoming pose).
 *
 * Route: hero handoff → fade in LEFT (waving) · projects → RIGHT margin, builder
 * pose, walking DOWN per entry · confidential → per-CARD: hop to the side opposite
 * each card and read as a redacted brightness-0 head silhouette (stealth guard) ·
 * skills → LEFT · contact → CENTER waving, then drift to the bottom-right corner
 * while fading so it hands off to the in-section panda-wave watermark (no overlap).
 *
 * The companion stays ABOVE content (z-overlay): Confidential (navy) and Contact
 * (paper) have OPAQUE section backgrounds, so a literal "behind content" layer
 * would hide it there. It is kept non-interactive (pointer-events:none,
 * aria-hidden) and routed through the side margins so it never covers copy.
 *
 * Reduced motion: a single static pose, no route, no cursor tracking, no
 * cross-fade. Mobile: hidden by CSS (#panda-companion display:none < 1024px).
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Scene } from '../types';

type PoseName = 'hero' | 'master' | 'coding' | 'wave' | 'head';

type Waypoint = {
  x: number; // fraction of viewport width for the panda's center
  y: number; // fraction of viewport height for the panda's center
  scale: number;
  rotation: number;
  opacity: number;
  pose: PoseName;
};

const DESKTOP_QUERY = '(min-width: 1024px)';

// Hero handoff: position is fixed (left margin, waving) but opacity is SCRUBBED
// in as the hero scrolls up, so the fixed companion grows out of the hero panda.
const HERO_STOP: Omit<Waypoint, 'opacity'> = {
  x: 0.16,
  y: 0.52,
  scale: 1.0,
  rotation: 5,
  pose: 'wave',
};
const HERO_MAX_OPACITY = 0.92;

// Section-level waypoints (the zig-zag). Side-margin x values keep the panda off
// the copy. Projects & Confidential are NOT here — they get per-ITEM tracking
// (Phase 29) so the panda walks the list where the items are many.
const SECTION_STOPS: Record<string, Waypoint> = {
  skills: { x: 0.15, y: 0.5, scale: 0.96, rotation: -5, opacity: 0.95, pose: 'hero' },
};

// Projects (pinned reveal): sit in the RIGHT margin opposite the left-aligned
// entries; walk DOWN as the pinned reveal scrubs through the three entries.
const PROJECTS_STOP: Omit<Waypoint, 'opacity' | 'y'> = {
  x: 0.85,
  scale: 0.95,
  rotation: -4,
  pose: 'coding',
};
const PROJECTS_OPACITY = 0.95;
const PROJECTS_Y_TOP = 0.32;
const PROJECTS_Y_BOTTOM = 0.72;
const CONTACT_STOP: Waypoint = {
  x: 0.5,
  y: 0.66,
  scale: 1.04,
  rotation: 0,
  opacity: 0.95,
  pose: 'wave',
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const companionScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = el as HTMLElement;
  const stage = container.querySelector<HTMLElement>('[data-companion-stage]');
  const look = container.querySelector<HTMLElement>('[data-companion-look]');
  let mm: gsap.MatchMedia | null = null;
  let activePose: PoseName | null = null;

  function poseEl(name: PoseName): HTMLElement | null {
    return container.querySelector<HTMLElement>(`[data-companion-pose="${name}"]`);
  }

  // Gentle turn: cross-fade with a slight scale/slide on the incoming pose so a
  // swap reads as the panda turning rather than popping.
  function setPose(name: PoseName): void {
    if (activePose === name) return;
    activePose = name;

    const incoming = poseEl(name);
    const outgoing = Array.from(
      container.querySelectorAll<HTMLElement>('[data-companion-pose]')
    ).filter((node) => node !== incoming);

    gsap.to(outgoing, { opacity: 0, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    if (incoming) {
      gsap.fromTo(
        incoming,
        { opacity: 0, scale: 0.92, xPercent: -6 },
        { opacity: 1, scale: 1, xPercent: 0, duration: 0.95, ease: 'expo.out', overwrite: 'auto' }
      );
    }
  }

  return {
    init() {
      const allPoses = Array.from(container.querySelectorAll<HTMLElement>('[data-companion-pose]'));
      gsap.set(stage, { opacity: 0, x: 0, y: 0, scale: 1, rotation: 0 });
      gsap.set(look, { x: 0, y: 0, rotation: 0 });
      gsap.set(allPoses, { opacity: 0 });

      if (prefersReducedMotion) {
        // Single static pose, parked off the copy. No route, no tracking.
        gsap.set(stage, {
          opacity: 0.78,
          x: window.innerWidth * 0.82 - container.offsetWidth / 2,
          y: window.innerHeight * 0.3 - container.offsetHeight / 2,
        });
        gsap.set(poseEl('master'), { opacity: 1 });
        return;
      }

      mm = gsap.matchMedia();

      mm.add(DESKTOP_QUERY, () => {
        if (!stage) return;

        // Eased position channels — quickTo lets each waypoint glide in.
        const xTo = gsap.quickTo(stage, 'x', { duration: 1.1, ease: 'power2.out' });
        const yTo = gsap.quickTo(stage, 'y', { duration: 1.1, ease: 'power2.out' });
        const scaleTo = gsap.quickTo(stage, 'scale', { duration: 1.1, ease: 'power2.out' });
        const rotTo = gsap.quickTo(stage, 'rotation', { duration: 1.1, ease: 'power2.out' });
        const opacityTo = gsap.quickTo(stage, 'opacity', { duration: 0.7, ease: 'power2.out' });

        const targetX = (fx: number): number => window.innerWidth * fx - container.offsetWidth / 2;
        const targetY = (fy: number): number =>
          window.innerHeight * fy - container.offsetHeight / 2;

        function moveTo(stop: Omit<Waypoint, 'opacity'>): void {
          xTo(targetX(stop.x));
          yTo(targetY(stop.y));
          scaleTo(stop.scale);
          rotTo(stop.rotation);
          setPose(stop.pose);
        }

        function applyStop(stop: Waypoint): void {
          moveTo(stop);
          opacityTo(stop.opacity);
        }

        // ── Cursor look-toward (preserved) ───────────────────────────────────
        const lookX = look ? gsap.quickTo(look, 'x', { duration: 0.35, ease: 'expo.out' }) : null;
        const lookY = look ? gsap.quickTo(look, 'y', { duration: 0.35, ease: 'expo.out' }) : null;
        const lookR = look
          ? gsap.quickTo(look, 'rotation', { duration: 0.35, ease: 'expo.out' })
          : null;

        const onMove = (event: MouseEvent): void => {
          const rect = container.getBoundingClientRect();
          const dx = Math.max(
            -1,
            Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth)
          );
          const dy = Math.max(
            -1,
            Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight)
          );
          lookX?.(dx * 14);
          lookY?.(dy * 10);
          lookR?.(dx * 6);
        };
        window.addEventListener('mousemove', onMove, { passive: true });

        // ── Per-section route triggers ───────────────────────────────────────
        const triggers: ScrollTrigger[] = [];

        // Hero handoff: hold the left waving pose, scrub opacity in as hero leaves.
        triggers.push(
          ScrollTrigger.create({
            trigger: '#hero',
            start: 'center top',
            end: 'bottom top',
            onEnter: () => moveTo(HERO_STOP),
            onEnterBack: () => moveTo(HERO_STOP),
            onUpdate: (self) => opacityTo(self.progress * HERO_MAX_OPACITY),
            onLeaveBack: () => opacityTo(0),
          })
        );

        // Projects (per-item walk): hold the right margin, builder pose, and ease
        // y down across the pinned reveal so the panda walks past each entry.
        triggers.push(
          ScrollTrigger.create({
            trigger: '#projects',
            start: 'top 70%',
            end: 'bottom 30%',
            onEnter: () => {
              moveTo({ ...PROJECTS_STOP, y: PROJECTS_Y_TOP });
              opacityTo(PROJECTS_OPACITY);
            },
            onEnterBack: () => {
              moveTo({ ...PROJECTS_STOP, y: PROJECTS_Y_TOP });
              opacityTo(PROJECTS_OPACITY);
            },
            onUpdate: (self) => {
              yTo(targetY(PROJECTS_Y_TOP + self.progress * (PROJECTS_Y_BOTTOM - PROJECTS_Y_TOP)));
            },
          })
        );

        // Confidential (per-card): as each card becomes active, hop to the side
        // OPPOSITE its layout offset (even cards sit left → panda right; odd cards
        // sit right → panda left), track its vertical center, and swap to the
        // redacted brightness-0 head silhouette — a stealth guard on the files.
        const cards = Array.from(
          document.querySelectorAll<HTMLElement>('#confidential [data-confidential-card]')
        );
        cards.forEach((card, i) => {
          const onLeftMargin = i % 2 === 1; // odd card is right-shifted → panda left
          const arrive = (): void => {
            xTo(targetX(onLeftMargin ? 0.15 : 0.85));
            scaleTo(0.88);
            rotTo(onLeftMargin ? -5 : 5);
            opacityTo(0.96);
            setPose('head');
          };
          triggers.push(
            ScrollTrigger.create({
              trigger: card,
              start: 'top 78%',
              end: 'bottom 22%',
              onEnter: arrive,
              onEnterBack: arrive,
              onUpdate: () => {
                const rect = card.getBoundingClientRect();
                const cy = (rect.top + rect.height / 2) / window.innerHeight;
                yTo(targetY(clamp01(cy)));
              },
            })
          );
        });

        for (const [id, stop] of Object.entries(SECTION_STOPS)) {
          triggers.push(
            ScrollTrigger.create({
              trigger: `#${id}`,
              start: 'top 65%',
              end: 'bottom 35%',
              onEnter: () => applyStop(stop),
              onEnterBack: () => applyStop(stop),
            })
          );
        }

        // Contact: arrive center waving, then drift toward the bottom-right corner
        // while fading — handing off to the in-section panda-wave watermark that
        // sits there, so there is never a double panda or overlap.
        triggers.push(
          ScrollTrigger.create({
            trigger: '#contact',
            start: 'top 65%',
            end: 'bottom bottom',
            onEnter: () => applyStop(CONTACT_STOP),
            onEnterBack: () => applyStop(CONTACT_STOP),
            onUpdate: (self) => {
              if (self.progress > 0.5) {
                const k = clamp01((self.progress - 0.5) / 0.45);
                xTo(targetX(CONTACT_STOP.x + k * 0.3));
                yTo(targetY(CONTACT_STOP.y + k * 0.16));
                opacityTo(CONTACT_STOP.opacity * (1 - k));
              }
            },
          })
        );

        ScrollTrigger.refresh();

        return () => {
          triggers.forEach((t) => t.kill());
          window.removeEventListener('mousemove', onMove);
          xTo.tween.kill();
          yTo.tween.kill();
          scaleTo.tween.kill();
          rotTo.tween.kill();
          opacityTo.tween.kill();
          lookX?.tween.kill();
          lookY?.tween.kill();
          lookR?.tween.kill();
        };
      });
    },

    enter() {
      // Route is driven by the scene's own per-section ScrollTriggers.
    },

    leave() {
      // Persistent fixed companion; waypoints are owned by the route triggers.
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

export default companionScene;
