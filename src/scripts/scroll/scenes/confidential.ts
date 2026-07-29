import gsap from 'gsap';
import type { Scene } from '../types';
import { initAutoCarousel } from '../../autoCarousel';

type ConfidentialRecord = {
  card: HTMLElement;
  content: HTMLElement | null;
  scanLine: HTMLElement | null;
  corners: HTMLElement[];
  sheens: HTMLElement[];
};

const confidentialScene = (el: Element): Scene => {
  const cards: ConfidentialRecord[] = [];
  const cleanup: Array<() => void> = [];
  let entered = false;
  let gridPulse: gsap.core.Tween | null = null;
  let shimmer: gsap.core.Tween | null = null;
  let mm: gsap.MatchMedia | null = null;

  function bind<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void
  ): void {
    target.addEventListener(type, handler);
    cleanup.push(() => target.removeEventListener(type, handler));
  }

  function reactToFile(record: ConfidentialRecord, active: boolean): void {
    gsap.to(record.card, {
      borderColor: active ? 'var(--scarlet)' : 'var(--glass-border)',
      duration: 0.22,
      ease: 'expo.out',
      overwrite: 'auto',
    });

    gsap.to(record.corners, {
      opacity: active ? 1 : 0.75,
      scaleX: 1,
      scaleY: 1,
      duration: 0.2,
      ease: 'expo.out',
      overwrite: 'auto',
    });

    if (active && record.scanLine) {
      const cardHeight = record.card.getBoundingClientRect().height;
      gsap.fromTo(
        record.scanLine,
        { opacity: 1, y: 0 },
        {
          opacity: 0,
          y: cardHeight,
          duration: 0.42,
          ease: 'none',
          overwrite: 'auto',
        }
      );
    }

    if (active) {
      gsap.fromTo(
        record.sheens,
        { xPercent: -120, opacity: 0.35 },
        {
          xPercent: 260,
          duration: 0.62,
          ease: 'none',
          stagger: 0.06,
          overwrite: 'auto',
        }
      );
    }
  }

  return {
    init() {
      const grid = el.querySelector<HTMLElement>('[data-blueprint-grid-pulse]');
      const sheens = el.querySelectorAll<HTMLElement>('[data-redaction-sheen]');

      el.querySelectorAll<HTMLElement>('[data-confidential-card]').forEach((card) => {
        const record: ConfidentialRecord = {
          card,
          content: card.querySelector<HTMLElement>('[data-confidential-content]'),
          scanLine: card.querySelector<HTMLElement>('[data-scan-line]'),
          corners: Array.from(card.querySelectorAll<HTMLElement>('[data-corner-accent]')),
          sheens: Array.from(card.querySelectorAll<HTMLElement>('[data-redaction-sheen]')),
        };
        cards.push(record);

        bind(card, 'mouseenter', () => reactToFile(record, true));
        bind(card, 'mouseleave', () => reactToFile(record, false));
        bind(card, 'focusin', () => reactToFile(record, true));
        bind(card, 'focusout', () => reactToFile(record, false));
      });

      gsap.set(
        cards.map((record) => record.card),
        { opacity: 1 }
      );
      gsap.set(
        cards.map((record) => record.content),
        { opacity: 1 }
      );
      gsap.set(
        cards.map((record) => record.scanLine),
        { opacity: 0, y: 0 }
      );
      gsap.set(
        cards.flatMap((record) => record.corners),
        { opacity: 0, scaleX: 0, scaleY: 0, transformOrigin: '50% 50%' }
      );

      // Both ambient loops start PAUSED and are played/paused by enter()/leave().
      // init() runs for every scene the moment the controller mounts, so leaving
      // these running would animate an off-screen section from first paint until
      // the visitor happened to scroll past it — which, for a section this far
      // down, is most of the session.
      gridPulse = gsap.to(grid, {
        opacity: 1,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        paused: true,
      });

      shimmer = gsap.to(sheens, {
        xPercent: 260,
        duration: 3,
        ease: 'none',
        repeat: -1,
        stagger: 0.2,
        paused: true,
      });

      // Mobile only: auto-drift the horizontal blueprint carousel until touched.
      mm = gsap.matchMedia();
      mm.add('(max-width: 767px)', () => {
        const track = el.querySelector<HTMLElement>('[data-confidential-log]');
        const dispose = track ? initAutoCarousel(track) : () => {};
        return () => dispose();
      });
    },

    enter() {
      // Ambient loops only run while the section is in view — see leave().
      gridPulse?.play();
      shimmer?.play();

      if (entered) return;
      entered = true;

      cards.forEach((record, index) => {
        const cardHeight = record.card.getBoundingClientRect().height;
        const tl = gsap.timeline({ delay: index * 0.12, defaults: { ease: 'expo.out' } });

        tl.set(record.scanLine, { opacity: 1, y: 0 })
          .to(record.scanLine, { y: cardHeight, duration: 0.6, ease: 'none' })
          .set(record.scanLine, { opacity: 0 })
          .fromTo(record.content, { opacity: 0.72 }, { opacity: 1, duration: 0.35 }, '-=0.1')
          .to(
            record.corners,
            {
              opacity: 1,
              scaleX: 1,
              scaleY: 1,
              duration: 0.35,
              stagger: 0.04,
            },
            '<'
          );
      });
    },

    leave() {
      // Cards remain visible once revealed — the reveal is not replayed.
      // But the two ambient loops (grid pulse + card shimmer) are `repeat: -1`
      // and used to keep ticking for the whole session, compositing off-screen
      // work several viewports away and stealing frames from whatever IS on
      // screen. Pause them here; enter() resumes mid-cycle, so the section
      // looks identical whenever it's actually visible.
      gridPulse?.pause();
      shimmer?.pause();
    },

    progress() {
      // Looping and scan-line timelines own this scene's motion.
    },

    destroy() {
      cleanup.splice(0).forEach((dispose) => dispose());
      gridPulse?.kill();
      shimmer?.kill();
      mm?.revert();
      cards.forEach((record) => {
        gsap.set(
          [record.card, record.content, record.scanLine, ...record.corners, ...record.sheens],
          {
            clearProps: 'opacity,transform,visibility',
          }
        );
      });
    },
  };
};

export default confidentialScene;
