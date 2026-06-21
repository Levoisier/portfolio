/**
 * Projects Scene.
 *
 * Desktop (≥1024px, no reduced-motion): a pinned experiment-log reveal.
 *   Entries lift in sequence while the panda-coding builder accent parallax/tilts
 *   behind the content. No horizontal gallery or card-track remains.
 *
 * Tablet/mobile (<1024px): lean vertical reveal.
 *
 * Reduced motion: static, instant, fully readable.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

type ProjectRecord = {
  entry: HTMLElement;
  number: HTMLElement | null;
  chips: HTMLElement[];
};

const ENTRY_Y = 36;
const DESKTOP_QUERY = '(min-width: 1024px)';

const projectsScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const records: ProjectRecord[] = [];
  const cleanup: Array<() => void> = [];
  let builder: HTMLImageElement | null = null;
  let mm: gsap.MatchMedia | null = null;

  function bind<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void
  ): void {
    target.addEventListener(type, handler);
    cleanup.push(() => target.removeEventListener(type, handler));
  }

  function reactToEntry(record: ProjectRecord, active: boolean): void {
    gsap.to(record.number, {
      x: active ? 8 : 0,
      duration: 0.24,
      ease: 'expo.out',
      overwrite: 'auto',
    });

    gsap.to(record.chips, {
      y: active ? -3 : 0,
      opacity: active ? 1 : 0.86,
      duration: 0.24,
      stagger: 0.025,
      ease: 'expo.out',
      overwrite: 'auto',
    });

    if (!prefersReducedMotion && builder && window.matchMedia(DESKTOP_QUERY).matches) {
      gsap.to(builder, {
        x: active ? -10 : 0,
        rotation: active ? -3 : 0,
        duration: 0.35,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    }
  }

  return {
    init() {
      builder = el.querySelector<HTMLImageElement>('[data-projects-builder]');

      el.querySelectorAll<HTMLElement>('[data-project-entry]').forEach((entry) => {
        const record: ProjectRecord = {
          entry,
          number: entry.querySelector<HTMLElement>('[data-project-number]'),
          chips: Array.from(entry.querySelectorAll<HTMLElement>('[data-project-chip]')),
        };
        records.push(record);

        bind(entry, 'mouseenter', () => reactToEntry(record, true));
        bind(entry, 'mouseleave', () => reactToEntry(record, false));
        bind(entry, 'focusin', () => reactToEntry(record, true));
        bind(entry, 'focusout', () => reactToEntry(record, false));
      });

      const entries = records.map((record) => record.entry);
      const chips = records.flatMap((record) => record.chips);

      if (prefersReducedMotion) {
        gsap.set([entries, chips, builder], { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 });
        return;
      }

      gsap.set(entries, { opacity: 0.22, y: ENTRY_Y, willChange: 'transform,opacity' });
      gsap.set(chips, { opacity: 0.86 });
      gsap.set(builder, { opacity: 0, x: 24, y: 0, rotation: 4, willChange: 'transform,opacity' });

      mm = gsap.matchMedia();

      mm.add(DESKTOP_QUERY, () => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: '+=130%',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        tl.to(builder, { opacity: 0.26, x: 0, rotation: 0, duration: 0.18 }, 0)
          .to(entries, { opacity: 1, y: 0, stagger: 0.18, duration: 0.54 }, 0.04)
          .to(builder, { y: -window.innerHeight * 0.16, duration: 0.72 }, 0.2);

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      mm.add('(max-width: 1023px)', () => {
        const reveal = gsap.to(entries, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: {
            trigger: el,
            start: 'top 78%',
            toggleActions: 'play none none none',
          },
        });

        return () => {
          reveal.scrollTrigger?.kill();
          reveal.kill();
        };
      });
    },

    enter() {
      // ScrollTrigger timelines handle reveal. Hook kept for Scene interface symmetry.
    },

    leave() {
      records.forEach((record) => reactToEntry(record, false));
    },

    progress(_progress: number) {
      // Desktop scroll motion is owned by the pinned timeline. Hover uses x/rotation.
    },

    destroy() {
      cleanup.splice(0).forEach((dispose) => dispose());
      mm?.revert();
      gsap.killTweensOf([builder, ...records.map((record) => record.entry)]);
      gsap.killTweensOf(records.flatMap((record) => [record.number, ...record.chips]));
      gsap.set([builder, ...records.map((record) => record.entry)], {
        clearProps: 'opacity,transform,willChange',
      });
      gsap.set(
        records.flatMap((record) => [record.number, ...record.chips]),
        {
          clearProps: 'opacity,transform',
        }
      );
    },
  };
};

export default projectsScene;
