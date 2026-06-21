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
  let entered = false;
  let accent: HTMLElement | null = null;

  function setHover(record: ProjectRecord, active: boolean): void {
    gsap.to(record.card, {
      borderColor: active ? 'var(--scarlet)' : 'var(--glass-border)',
      duration: 0.2,
      ease: 'expo.out',
      overwrite: true,
    });

    if (!prefersReducedMotion && record.image) {
      gsap.to(record.image, {
        opacity: active ? 0.7 : 0.4,
        duration: 0.2,
        ease: 'expo.out',
        overwrite: true,
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

      el.querySelectorAll<HTMLElement>('[data-project-card]').forEach((card) => {
        projects.push({
          card,
          image: card.querySelector<HTMLImageElement>('[data-project-image]'),
        });
      });

      if (prefersReducedMotion) {
        projects.forEach((record) => loadProjectImage(record.image));
      }

      if (prefersReducedMotion) {
        gsap.set(
          projects.map((record) => record.card),
          { opacity: 1, y: 0 }
        );
        gsap.set(accent, { y: 0 });
      } else {
        gsap.set(
          projects.map((record) => record.card),
          { opacity: 0, y: REVEAL_Y }
        );
        gsap.set(accent, { y: 0, willChange: 'transform' });
      }

      projects.forEach((record) => {
        bind(record.card, 'mouseenter', () => setHover(record, true));
        bind(record.card, 'mouseleave', () => setHover(record, false));
        bind(record.card, 'focusin', () => setHover(record, true));
        bind(record.card, 'focusout', () => setHover(record, false));
      });
    },

    enter() {
      if (entered) return;
      entered = true;
      projects.forEach((record) => loadProjectImage(record.image));

      if (prefersReducedMotion) {
        gsap.set(
          projects.map((record) => record.card),
          { opacity: 1, y: 0 }
        );
        return;
      }

      gsap.to(
        projects.map((record) => record.card),
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'expo.out',
          stagger: 0.1,
        }
      );
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
