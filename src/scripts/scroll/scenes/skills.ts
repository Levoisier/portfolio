import gsap from 'gsap';
import type { Scene } from '../types';

type TileRecord = {
  tile: HTMLElement;
  card: HTMLElement;
  badge: HTMLElement | null;
  bar: HTMLElement | null;
  proficiency: number;
};

const ACTIVE_SCALE = 1.08;
const DIMMED_OPACITY = 0.7;

const skillsScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiles: TileRecord[] = [];
  const cleanup: Array<() => void> = [];
  let activeTile: HTMLElement | null = null;
  let mm: gsap.MatchMedia | null = null;

  function setActive(tile: HTMLElement | null): void {
    activeTile = tile;

    if (prefersReducedMotion) return;

    tiles.forEach((record) => {
      const isActive = record.tile === activeTile;
      const hasActive = activeTile !== null;

      // overwrite: 'auto' (not true) so a hover only overrides the conflicting
      // property and never kills the scrubbed assemble tween on the same target.
      gsap.to(record.card, {
        scale: isActive ? ACTIVE_SCALE : 1,
        duration: 0.2,
        ease: 'expo.out',
        overwrite: 'auto',
      });

      gsap.to(record.tile, {
        opacity: hasActive && !isActive ? DIMMED_OPACITY : 1,
        duration: 0.2,
        ease: 'expo.out',
        overwrite: 'auto',
      });

      if (record.badge) {
        gsap.to(record.badge, {
          opacity: isActive ? 1 : 0,
          duration: 0.2,
          ease: 'expo.out',
          overwrite: 'auto',
        });
      }

      if (record.bar) {
        gsap.to(record.bar, {
          scaleX: isActive ? record.proficiency / 100 : 0,
          duration: 0.25,
          ease: 'expo.out',
          overwrite: 'auto',
        });
      }
    });
  }

  function bind<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void
  ): void {
    target.addEventListener(type, handler);
    cleanup.push(() => target.removeEventListener(type, handler));
  }

  function bindDocument<K extends keyof DocumentEventMap>(
    type: K,
    handler: (event: DocumentEventMap[K]) => void
  ): void {
    document.addEventListener(type, handler);
    cleanup.push(() => document.removeEventListener(type, handler));
  }

  return {
    init() {
      el.querySelectorAll<HTMLElement>('[data-skill-tile]').forEach((tile) => {
        const card = tile.querySelector<HTMLElement>('[data-skill-card]');
        if (!card) return;

        const proficiency = Number(tile.dataset['proficiency'] ?? 0);
        const badge = tile.querySelector<HTMLElement>('[data-category-badge]');
        const bar = tile.querySelector<HTMLElement>('[data-proficiency-bar]');

        tiles.push({ tile, card, badge, bar, proficiency });
      });

      const tileEls = tiles.map((record) => record.tile);
      const cardEls = tiles.map((record) => record.card);

      // Hover/tap interaction (preserved unchanged) is bound in every mode.
      tiles.forEach((record) => {
        bind(record.tile, 'mouseenter', () => setActive(record.tile));
        bind(record.tile, 'mouseleave', () => setActive(null));
        bind(record.tile, 'focus', () => setActive(record.tile));
        bind(record.tile, 'blur', () => setActive(null));
        bind(record.tile, 'pointerup', (event) => {
          if (event.pointerType === 'mouse') return;
          setActive(activeTile === record.tile ? null : record.tile);
        });
      });

      bindDocument('pointerdown', (event) => {
        if (!activeTile || event.target instanceof Node === false) return;
        if (!activeTile.contains(event.target)) setActive(null);
      });

      if (prefersReducedMotion) {
        // Instant full-opacity grid, no assemble motion (badge stays CSS-only).
        gsap.set(tileEls, { opacity: 1, y: 0 });
        return;
      }

      // Hover hooks start hidden/at-rest; the assemble reveal fades the cards in.
      gsap.set(cardEls, { transformOrigin: '50% 50%' });
      gsap.set(
        tiles.flatMap((record) => (record.badge ? [record.badge] : [])),
        { opacity: 0 }
      );
      gsap.set(
        tiles.flatMap((record) => (record.bar ? [record.bar] : [])),
        { scaleX: 0, transformOrigin: '0% 50%' }
      );

      // ── Scrubbed assemble reveal ─────────────────────────────────────────────
      // Tiles assemble into formation on scroll. The assemble drives the TILE
      // transform + the CARD opacity; hover drives the CARD scale + TILE opacity.
      // Separate property/element channels (+ overwrite:'auto' on hover) keep the
      // two from killing each other. matchMedia: desktop scatters; mobile is lean.
      mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        const assemble = gsap.timeline({
          scrollTrigger: { trigger: el, start: 'top 80%', end: 'top 35%', scrub: 1 },
        });
        assemble
          .from(
            tileEls,
            {
              y: 44,
              scale: 0.6,
              rotate: () => gsap.utils.random(-12, 12),
              transformOrigin: '50% 50%',
              ease: 'none',
              stagger: { each: 0.04, from: 'start' },
            },
            0
          )
          .from(cardEls, { opacity: 0, ease: 'none', stagger: { each: 0.04, from: 'start' } }, 0);

        return () => {
          assemble.scrollTrigger?.kill();
          assemble.kill();
        };
      });

      mm.add('(max-width: 767px)', () => {
        const assemble = gsap.timeline({
          scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 55%', scrub: 1 },
        });
        assemble
          .from(tileEls, { y: 24, ease: 'none', stagger: { each: 0.02, from: 'start' } }, 0)
          .from(cardEls, { opacity: 0, ease: 'none', stagger: { each: 0.02, from: 'start' } }, 0);

        return () => {
          assemble.scrollTrigger?.kill();
          assemble.kill();
        };
      });
    },

    enter() {
      // Reveal is scrub-driven (or instant under reduced motion via init).
    },

    leave() {
      setActive(null);
    },

    progress() {
      // Skills interactions are event-driven; the assemble is scrub-driven.
    },

    destroy() {
      cleanup.splice(0).forEach((dispose) => dispose());
      mm?.revert();
      gsap.killTweensOf(
        tiles.map((record) => [record.tile, record.card, record.badge, record.bar]).flat()
      );
      tiles.forEach((record) => {
        gsap.set([record.tile, record.card, record.badge, record.bar], {
          clearProps: 'opacity,transform,visibility',
        });
      });
    },
  };
};

export default skillsScene;
