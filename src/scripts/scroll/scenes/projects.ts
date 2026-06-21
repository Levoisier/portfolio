/**
 * Projects Scene.
 *
 * Desktop (≥1024px, no reduced-motion): a pinned experiment-log reveal.
 *   Entries lift in sequence. No horizontal gallery, card-track, or standalone
 *   decorative panda remains.
 *
 * Tablet/mobile (<1024px): lean vertical reveal.
 *
 * Reduced motion: static, instant, fully readable.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

type ProjectRecord = {
  entry: HTMLElement;
  numeral: HTMLElement | null;
  title: HTMLElement | null;
  desc: HTMLElement | null;
  formula: HTMLElement | null;
  rule: HTMLElement | null;
  chips: HTMLElement[];
};

const ENTRY_Y = 36;
const NUMERAL_OPACITY = 0.18;
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Add one entry's staggered reveal (numeral/rule draw-in → title → description →
 * formula chips) to a timeline at position `at`. Shared by the desktop pinned
 * scrub and the mobile triggered reveal so both feel alive, not a single lift.
 *
 * Channel discipline (see LESSONS 2026-06-21): the reveal never touches the
 * properties the hover reaction owns — title x/skewX and individual chip
 * y/opacity. It drives title OPACITY, the formula CONTAINER opacity/y (not the
 * chips), numeral opacity/y, rule scaleY, and entry y. No element/property pair
 * is shared with the hover, so the two systems compose cleanly.
 */
function addEntryReveal(
  tl: gsap.core.Timeline,
  record: ProjectRecord,
  at: number,
  scrub: boolean
): void {
  const ease = scrub ? 'none' : 'expo.out';
  const d = scrub ? 0.5 : 0.6;

  tl.fromTo(record.entry, { y: ENTRY_Y }, { y: 0, duration: d, ease }, at);
  if (record.numeral) {
    tl.fromTo(
      record.numeral,
      { opacity: 0, y: 22 },
      { opacity: NUMERAL_OPACITY, y: 0, duration: d, ease },
      at
    );
  }
  if (record.rule) {
    tl.fromTo(record.rule, { scaleY: 0 }, { scaleY: 1, duration: d, ease }, at + 0.06);
  }
  if (record.title) {
    tl.fromTo(record.title, { opacity: 0 }, { opacity: 1, duration: d * 0.8, ease }, at + 0.1);
  }
  if (record.desc) {
    tl.fromTo(
      record.desc,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: d * 0.9, ease },
      at + 0.2
    );
  }
  if (record.formula) {
    tl.fromTo(
      record.formula,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: d * 0.9, ease },
      at + 0.3
    );
  }
}

const projectsScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const records: ProjectRecord[] = [];
  const cleanup: Array<() => void> = [];
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
    gsap.to(record.title, {
      x: active ? 10 : 0,
      skewX: active ? -4 : 0,
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
  }

  return {
    init() {
      el.querySelectorAll<HTMLElement>('[data-project-entry]').forEach((entry) => {
        const record: ProjectRecord = {
          entry,
          numeral: entry.querySelector<HTMLElement>('[data-project-numeral]'),
          title: entry.querySelector<HTMLElement>('[data-project-title]'),
          desc: entry.querySelector<HTMLElement>('[data-project-desc]'),
          formula: entry.querySelector<HTMLElement>('[data-project-formula]'),
          rule: entry.querySelector<HTMLElement>('[data-project-rule]'),
          chips: Array.from(entry.querySelectorAll<HTMLElement>('[data-project-chip]')),
        };
        records.push(record);

        bind(entry, 'mouseenter', () => reactToEntry(record, true));
        bind(entry, 'mouseleave', () => reactToEntry(record, false));
        bind(entry, 'focusin', () => reactToEntry(record, true));
        bind(entry, 'focusout', () => reactToEntry(record, false));
      });

      const chips = records.flatMap((record) => record.chips);

      if (prefersReducedMotion) {
        records.forEach((record) => {
          gsap.set([record.entry, record.title, record.desc, record.formula], {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
          });
          gsap.set(record.numeral, { opacity: NUMERAL_OPACITY, y: 0 });
          gsap.set(record.rule, { scaleY: 1 });
        });
        gsap.set(chips, { opacity: 1, y: 0 });
        return;
      }

      // Hidden starting state (desktop + mobile non-reduced). Sub-elements own
      // opacity; the entry container only lifts on y. Chips keep the 0.86 hover
      // baseline; the reveal fades their CONTAINER, never the chips themselves.
      records.forEach((record) => {
        gsap.set(record.entry, { y: ENTRY_Y, willChange: 'transform' });
        gsap.set(record.numeral, { opacity: 0, y: 22 });
        gsap.set([record.title, record.desc, record.formula], { opacity: 0 });
        gsap.set(record.rule, { scaleY: 0 });
      });
      gsap.set(chips, { opacity: 0.86 });

      mm = gsap.matchMedia();

      mm.add(DESKTOP_QUERY, () => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: '+=160%',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        records.forEach((record, i) => addEntryReveal(tl, record, i * 0.85, true));
        // Tail pad so the LAST entry finishes well before the pin releases
        // (never clipped at the bottom of the scrub).
        tl.to({}, { duration: 0.7 });

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      mm.add('(max-width: 1023px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top 78%',
            toggleActions: 'play none none none',
          },
        });

        records.forEach((record, i) => addEntryReveal(tl, record, i * 0.4, false));

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
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
      const all = records
        .flatMap((record) => [
          record.entry,
          record.numeral,
          record.title,
          record.desc,
          record.formula,
          record.rule,
          ...record.chips,
        ])
        .filter((node): node is HTMLElement => node !== null);
      gsap.killTweensOf(all);
      gsap.set(all, { clearProps: 'opacity,transform,willChange' });
    },
  };
};

export default projectsScene;
