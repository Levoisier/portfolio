import gsap from 'gsap';
import type { Scene } from '../types';

type TileRecord = {
  tile: HTMLElement;
  card: HTMLElement;
  badge: HTMLElement | null;
  liquid: HTMLElement | null;
  slosh: gsap.core.Tween | null;
  proficiency: number;
};

const ACTIVE_SCALE = 1.08;
const DIMMED_OPACITY = 0.7;

const skillsScene = (el: Element): Scene => {
  const tiles: TileRecord[] = [];
  const cleanup: Array<() => void> = [];
  let activeTile: HTMLElement | null = null;

  function setActive(tile: HTMLElement | null): void {
    activeTile = tile;

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

      if (record.liquid) {
        // The fill's height IS the proficiency level (set in markup), so the
        // pour is just a slide: below the card (yPercent 100) → in place (0).
        // While filled, a gentle rotation slosh tilts the rounded surface so
        // it reads as liquid settling in a vessel. Separate transform channels
        // (y vs rotation) with overwrite:'auto' so they never kill each other.
        gsap.to(record.liquid, {
          yPercent: isActive ? 0 : 102,
          duration: isActive ? 0.7 : 0.45,
          ease: isActive ? 'power3.out' : 'power2.in',
          overwrite: 'auto',
        });

        if (isActive && !record.slosh) {
          record.slosh = gsap.fromTo(
            record.liquid,
            { rotation: -2.2 },
            { rotation: 2.2, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }
          );
        } else if (!isActive && record.slosh) {
          record.slosh.kill();
          record.slosh = null;
          gsap.to(record.liquid, { rotation: 0, duration: 0.4, ease: 'sine.out' });
        }
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
        const liquid = tile.querySelector<HTMLElement>('[data-skill-liquid]');

        tiles.push({ tile, card, badge, liquid, slosh: null, proficiency });
      });

      const cardEls = tiles.map((record) => record.card);

      // Hover/tap interaction (badge + proficiency bar + scale) is bound in every
      // mode. Tiles are visible by default now — the infinite marquee (pure CSS in
      // Skills.astro) owns motion, so there is no scroll-scrubbed assemble here.
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

      // Hover reaction targets start at rest; the interaction animates them.
      gsap.set(cardEls, { transformOrigin: '50% 50%' });
      gsap.set(
        tiles.flatMap((record) => (record.badge ? [record.badge] : [])),
        { opacity: 0 }
      );
      gsap.set(
        tiles.flatMap((record) => (record.liquid ? [record.liquid] : [])),
        { y: 0, yPercent: 102, rotation: 0 }
      );
    },

    enter() {
      // Tiles are visible by default; the marquee (CSS) owns motion.
    },

    leave() {
      setActive(null);
    },

    progress() {
      // Skills interactions are event-driven; the assemble is scrub-driven.
    },

    destroy() {
      cleanup.splice(0).forEach((dispose) => dispose());
      tiles.forEach((record) => record.slosh?.kill());
      gsap.killTweensOf(
        tiles.map((record) => [record.tile, record.card, record.badge, record.liquid]).flat()
      );
      tiles.forEach((record) => {
        gsap.set([record.tile, record.card, record.badge, record.liquid], {
          clearProps: 'opacity,transform,visibility',
        });
      });
    },
  };
};

export default skillsScene;
