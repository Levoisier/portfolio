/**
 * Projects Scene.
 *
 * Desktop (≥1024px, no reduced-motion): the section pins and the card track
 *   translates horizontally on scrub, traversing every card before unpinning.
 *   The horizontal layout is applied via an `.is-horizontal` class (CSS) toggled
 *   only here, so reduced-motion / no-JS keep the safe vertical grid stack.
 *
 * Tablet/mobile (<1024px): the v1 vertical stack reveal (stagger on enter).
 *
 * Reduced motion: static vertical stack, instant reveal.
 *
 * panda-coding accent parallax + border/image hover treatment are preserved.
 */

import gsap from 'gsap';
import type { Scene } from '../types';

type ProjectRecord = {
  card: HTMLElement;
  image: HTMLImageElement | null;
};

const REVEAL_Y = 30;
const ACCENT_QUERY = '(min-width: 1024px)';

function loadAccent(el: HTMLElement | null): void {
  const src = el?.dataset.projectsAccentSrc;
  if (!el || !src || el.style.backgroundImage) return;
  if (!window.matchMedia(ACCENT_QUERY).matches) return;

  const image = new Image();
  image.onload = () => {
    el.style.backgroundImage = `url("${src}")`;
  };
  image.src = src;
}

function loadProjectImage(image: HTMLImageElement | null): void {
  const src = image?.dataset.projectImageSrc;
  if (!image || !src || image.src.endsWith(src)) return;
  image.src = src;
}

const projectsScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const projects: ProjectRecord[] = [];
  const cleanup: Array<() => void> = [];
  let accent: HTMLElement | null = null;
  let mm: gsap.MatchMedia | null = null;

  function setHover(record: ProjectRecord, active: boolean): void {
    gsap.to(record.card, {
      borderColor: active ? 'var(--scarlet)' : 'var(--glass-border)',
      duration: 0.2,
      ease: 'expo.out',
      overwrite: 'auto',
    });

    if (!prefersReducedMotion && record.image) {
      gsap.to(record.image, {
        opacity: active ? 0.7 : 0.4,
        duration: 0.2,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    }
  }

  function bind<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void
  ): void {
    target.addEventListener(type, handler);
    cleanup.push(() => target.removeEventListener(type, handler));
  }

  return {
    init() {
      accent = el.querySelector<HTMLElement>('[data-projects-accent]');
      loadAccent(accent);

      const track = el.querySelector<HTMLElement>('[data-projects-track]');

      el.querySelectorAll<HTMLElement>('[data-project-card]').forEach((card) => {
        projects.push({
          card,
          image: card.querySelector<HTMLImageElement>('[data-project-image]'),
        });
      });

      const cardEls = projects.map((record) => record.card);

      projects.forEach((record) => {
        bind(record.card, 'mouseenter', () => setHover(record, true));
        bind(record.card, 'mouseleave', () => setHover(record, false));
        bind(record.card, 'focusin', () => setHover(record, true));
        bind(record.card, 'focusout', () => setHover(record, false));
      });

      if (prefersReducedMotion) {
        projects.forEach((record) => loadProjectImage(record.image));
        gsap.set(cardEls, { opacity: 1, y: 0 });
        gsap.set(accent, { y: 0 });
        return;
      }

      gsap.set(accent, { y: 0, willChange: 'transform' });

      mm = gsap.matchMedia();

      // ── Desktop: pinned horizontal gallery ───────────────────────────────────
      mm.add('(min-width: 1024px)', () => {
        if (!track) return;
        track.classList.add('is-horizontal');
        gsap.set(cardEls, { opacity: 1, y: 0 });

        const distance = (): number => Math.max(0, track.scrollWidth - track.clientWidth);

        const horizontal = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: () => '+=' + distance(),
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        return () => {
          horizontal.scrollTrigger?.kill();
          horizontal.kill();
          track.classList.remove('is-horizontal');
          gsap.set(track, { clearProps: 'transform' });
        };
      });

      // ── Tablet/mobile: v1 vertical stack reveal ──────────────────────────────
      mm.add('(max-width: 1023px)', () => {
        const reveal = gsap.from(cardEls, {
          opacity: 0,
          y: REVEAL_Y,
          duration: 0.6,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none none' },
        });

        return () => {
          reveal.scrollTrigger?.kill();
          reveal.kill();
        };
      });
    },

    enter() {
      // Load the (deferred) card images as the section approaches.
      projects.forEach((record) => loadProjectImage(record.image));
    },

    leave() {
      projects.forEach((record) => setHover(record, false));
    },

    progress(progress: number) {
      if (prefersReducedMotion || !accent) return;
      gsap.set(accent, { y: -window.innerHeight * 0.2 * progress });
    },

    destroy() {
      cleanup.splice(0).forEach((dispose) => dispose());
      mm?.revert();
      gsap.killTweensOf([
        ...projects.map((record) => record.card),
        ...projects.map((record) => record.image),
      ]);
      projects.forEach((record) => {
        gsap.set([record.card, record.image], { clearProps: 'opacity,transform,borderColor' });
      });
      gsap.set(accent, { clearProps: 'transform,willChange' });
    },
  };
};

export default projectsScene;
