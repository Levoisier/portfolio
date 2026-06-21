import gsap from 'gsap';
import type { Scene } from '../types';

type TileRecord = {
  tile: HTMLElement;
  card: HTMLElement;
  badge: HTMLElement | null;
  bar: HTMLElement | null;
  proficiency: number;
};

const REVEAL_Y = 20;
const ACTIVE_SCALE = 1.08;
const DIMMED_OPACITY = 0.7;

const skillsScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiles: TileRecord[] = [];
  const cleanup: Array<() => void> = [];
  let entered = false;
  let activeTile: HTMLElement | null = null;

  function setActive(tile: HTMLElement | null): void {
    activeTile = tile;

    if (prefersReducedMotion) return;

    tiles.forEach((record) => {
      const isActive = record.tile === activeTile;
      const hasActive = activeTile !== null;

      gsap.to(record.card, {
        scale: isActive ? ACTIVE_SCALE : 1,
        duration: 0.2,
        ease: 'expo.out',
        overwrite: true,
      });

      gsap.to(record.tile, {
        opacity: hasActive && !isActive ? DIMMED_OPACITY : 1,
        duration: 0.2,
        ease: 'expo.out',
        overwrite: true,
      });

      if (record.badge) {
        gsap.to(record.badge, {
          opacity: isActive ? 1 : 0,
          duration: 0.2,
          ease: 'expo.out',
          overwrite: true,
        });
      }

      if (record.bar) {
        gsap.to(record.bar, {
          scaleX: isActive ? record.proficiency / 100 : 0,
          duration: 0.25,
          ease: 'expo.out',
          overwrite: true,
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

      if (prefersReducedMotion) {
        gsap.set(
          tiles.map((record) => record.tile),
          { opacity: 1, y: 0 }
        );
      } else {
        gsap.set(
          tiles.map((record) => record.tile),
          { opacity: 0, y: REVEAL_Y }
        );
        gsap.set(
          tiles.map((record) => record.card),
          { scale: 1, transformOrigin: '50% 50%' }
        );
        gsap.set(
          tiles.flatMap((record) => (record.badge ? [record.badge] : [])),
          { opacity: 0 }
        );
        gsap.set(
          tiles.flatMap((record) => (record.bar ? [record.bar] : [])),
          { scaleX: 0, transformOrigin: '0% 50%' }
        );
      }

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
    },

    enter() {
      if (entered) return;
      entered = true;

      if (prefersReducedMotion) {
        gsap.set(
          tiles.map((record) => record.tile),
          { opacity: 1, y: 0 }
        );
        return;
      }

      gsap.to(
        tiles.map((record) => record.tile),
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'expo.out',
          stagger: 0.03,
        }
      );
    },

    leave() {
      setActive(null);
    },

    progress() {
      // Skills interactions are event-driven after the entrance reveal.
    },

    destroy() {
      cleanup.splice(0).forEach((dispose) => dispose());
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
