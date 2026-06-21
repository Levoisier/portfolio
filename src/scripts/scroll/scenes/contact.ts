import gsap from 'gsap';
import type { Scene } from '../types';

function splitWords(el: HTMLElement): HTMLElement[] {
  const text = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';
  el.textContent = '';
  el.setAttribute('aria-label', text);

  return text.split(' ').map((word, index, words) => {
    const span = document.createElement('span');
    span.textContent = word;
    span.style.display = 'inline-block';
    if (index < words.length - 1) {
      span.style.marginRight = '0.28em';
    }
    span.setAttribute('aria-hidden', 'true');
    el.appendChild(span);
    return span;
  });
}

function loadTexture(el: HTMLElement | null): void {
  const src = el?.dataset.contactTextureSrc;
  if (!el || !src || el.style.backgroundImage) return;

  const image = new Image();
  image.onload = () => {
    el.style.backgroundImage = `url("${src}")`;
  };
  image.src = src;
}

const contactScene = (el: Element): Scene => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let entered = false;
  let headingWords: HTMLElement[] = [];
  let tl: gsap.core.Timeline | null = null;

  return {
    init() {
      const heading = el.querySelector<HTMLElement>('[data-contact-heading]');
      const kicker = el.querySelector<HTMLElement>('[data-contact-kicker]');
      const links = Array.from(el.querySelectorAll<HTMLElement>('[data-contact-link]'));
      const panda = el.querySelector<HTMLElement>('[data-contact-panda]');
      const texture = el.querySelector<HTMLElement>('[data-contact-texture]');
      const closing = el.querySelector<HTMLElement>('[data-contact-closing]');

      if (heading) headingWords = splitWords(heading);
      if (prefersReducedMotion) loadTexture(texture);

      if (prefersReducedMotion) {
        gsap.set([kicker, ...headingWords, ...links, panda, texture, closing], {
          opacity: 1,
          x: 0,
          y: 0,
        });
        gsap.set(texture, { opacity: 1 });
        return;
      }

      gsap.set(kicker, { opacity: 0, y: 12 });
      gsap.set(headingWords, { opacity: 0, y: 24 });
      gsap.set(links, { opacity: 0, y: 24 });
      gsap.set(panda, { opacity: 0, scale: 1.04, willChange: 'transform,opacity' });
      gsap.set(texture, { opacity: 0 });
      gsap.set(closing, { opacity: 0, y: 16 });
    },

    enter() {
      if (entered) return;
      entered = true;

      const kicker = el.querySelector<HTMLElement>('[data-contact-kicker]');
      const links = Array.from(el.querySelectorAll<HTMLElement>('[data-contact-link]'));
      const panda = el.querySelector<HTMLElement>('[data-contact-panda]');
      const texture = el.querySelector<HTMLElement>('[data-contact-texture]');
      const closing = el.querySelector<HTMLElement>('[data-contact-closing]');
      loadTexture(texture);

      if (prefersReducedMotion) {
        gsap.set([kicker, ...headingWords, ...links, panda, texture, closing], {
          opacity: 1,
          x: 0,
          y: 0,
        });
        gsap.set(texture, { opacity: 1 });
        return;
      }

      tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(kicker, { opacity: 1, y: 0, duration: 0.35 })
        .to(headingWords, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.1')
        .to(links, { opacity: 1, y: 0, duration: 0.45, stagger: 0.12 })
        .to(panda, { opacity: 1, scale: 1, duration: 0.9 }, '<')
        .to(texture, { opacity: 1, duration: 0.7 }, '<0.1')
        .to(closing, { opacity: 1, y: 0, duration: 0.4 }, '-=0.1');
    },

    leave() {
      // Contact remains visible once revealed.
    },

    progress(_progress: number) {
      // Watermark stays static inside the panel.
    },

    destroy() {
      tl?.kill();
      gsap.set(
        [
          el.querySelector<HTMLElement>('[data-contact-kicker]'),
          ...headingWords,
          ...Array.from(el.querySelectorAll<HTMLElement>('[data-contact-link]')),
          el.querySelector<HTMLElement>('[data-contact-panda]'),
          el.querySelector<HTMLElement>('[data-contact-texture]'),
          el.querySelector<HTMLElement>('[data-contact-closing]'),
        ],
        { clearProps: 'opacity,transform,willChange' }
      );
    },
  };
};

export default contactScene;
