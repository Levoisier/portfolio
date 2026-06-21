import gsap from 'gsap';
import type { Scene } from '../types';

type ConfidentialRecord = {
  card: HTMLElement;
  content: HTMLElement | null;
  scanLine: HTMLElement | null;
  corners: HTMLElement[];
};

const confidentialScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards: ConfidentialRecord[] = [];
  let entered = false;
  let gridPulse: gsap.core.Tween | null = null;
  let shimmer: gsap.core.Tween | null = null;

  return {
    init() {
      const grid = el.querySelector<HTMLElement>('[data-blueprint-grid-pulse]');
      const sheens = el.querySelectorAll<HTMLElement>('[data-redaction-sheen]');

      el.querySelectorAll<HTMLElement>('[data-confidential-card]').forEach((card) => {
        cards.push({
          card,
          content: card.querySelector<HTMLElement>('[data-confidential-content]'),
          scanLine: card.querySelector<HTMLElement>('[data-scan-line]'),
          corners: Array.from(card.querySelectorAll<HTMLElement>('[data-corner-accent]')),
        });
      });

      if (prefersReducedMotion) {
        gsap.set(
          cards.map((record) => record.card),
          { opacity: 1, y: 0 }
        );
        gsap.set(
          cards.flatMap((record) => [record.content, ...record.corners]),
          { opacity: 1, scaleX: 1, scaleY: 1, y: 0 }
        );
        gsap.set(
          cards.map((record) => record.scanLine),
          { opacity: 0, y: 0 }
        );
        gsap.set(sheens, { opacity: 0, x: 0, xPercent: 0 });
        gsap.set(grid, { opacity: 0.6 });
        return;
      }

      gsap.set(
        cards.map((record) => record.card),
        { opacity: 1 }
      );
      gsap.set(
        cards.map((record) => record.content),
        { opacity: 0 }
      );
      gsap.set(
        cards.map((record) => record.scanLine),
        { opacity: 0, y: 0 }
      );
      gsap.set(
        cards.flatMap((record) => record.corners),
        { opacity: 0, scaleX: 0, scaleY: 0, transformOrigin: '50% 50%' }
      );

      gridPulse = gsap.to(grid, {
        opacity: 1,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      shimmer = gsap.to(sheens, {
        xPercent: 260,
        duration: 3,
        ease: 'none',
        repeat: -1,
        stagger: 0.2,
      });
    },

    enter() {
      if (entered) return;
      entered = true;

      if (prefersReducedMotion) {
        gsap.set(
          cards.flatMap((record) => [record.card, record.content]),
          { opacity: 1, y: 0 }
        );
        return;
      }

      cards.forEach((record, index) => {
        const cardHeight = record.card.getBoundingClientRect().height;
        const tl = gsap.timeline({ delay: index * 0.12, defaults: { ease: 'expo.out' } });

        tl.set(record.scanLine, { opacity: 1, y: 0 })
          .to(record.scanLine, { y: cardHeight, duration: 0.6, ease: 'none' })
          .set(record.scanLine, { opacity: 0 })
          .to(record.content, { opacity: 1, duration: 0.35 }, '-=0.1')
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
      // Cards remain visible once revealed.
    },

    progress() {
      // Looping and scan-line timelines own this scene's motion.
    },

    destroy() {
      gridPulse?.kill();
      shimmer?.kill();
      cards.forEach((record) => {
        gsap.set([record.card, record.content, record.scanLine, ...record.corners], {
          clearProps: 'opacity,transform,visibility',
        });
      });
    },
  };
};

export default confidentialScene;
