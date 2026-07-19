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

  function collect() {
    return {
      links: Array.from(el.querySelectorAll<HTMLElement>('[data-contact-link]')),
      texture: el.querySelector<HTMLElement>('[data-contact-texture]'),
      partyItems: Array.from(el.querySelectorAll<HTMLElement>('[data-panda-party-item]')),
    };
  }

  return {
    init() {
      const heading = el.querySelector<HTMLElement>('[data-contact-heading]');
      const { links, texture, partyItems } = collect();

      if (heading) headingWords = splitWords(heading);

      if (prefersReducedMotion) {
        loadTexture(texture);
        gsap.set([...headingWords, ...links, texture, ...partyItems], {
          opacity: 1,
          x: 0,
          y: 0,
        });
        return;
      }

      gsap.set(headingWords, { opacity: 0, y: 24 });
      gsap.set(links, { opacity: 0, y: 20 });
      gsap.set(texture, { opacity: 0 });
      // The idle bob/wiggle/fade loop lives on the <img> (CSS @keyframes); this
      // entrance only owns the wrapper's opacity/y/scale — no shared channel.
      gsap.set(partyItems, { opacity: 0, y: 26, scale: 0.7, willChange: 'transform,opacity' });
    },

    enter() {
      if (entered) return;
      entered = true;

      const { links, texture, partyItems } = collect();
      loadTexture(texture);

      if (prefersReducedMotion) {
        gsap.set([...headingWords, ...links, texture, ...partyItems], {
          opacity: 1,
          x: 0,
          y: 0,
        });
        return;
      }

      tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(headingWords, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 })
        .to(links, { opacity: 1, y: 0, duration: 0.45, stagger: 0.1 }, '-=0.1')
        .to(texture, { opacity: 1, duration: 0.7 }, '<0.1')
        .to(
          partyItems,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            stagger: 0.09,
            ease: 'back.out(1.7)', // matches --ease-spring's overshoot feel
          },
          '-=0.1'
        );
    },

    leave() {
      // Contact remains visible once revealed.
    },

    progress(_progress: number) {
      // Idle panda motion is a pure-CSS loop; nothing to drive on scroll.
    },

    destroy() {
      tl?.kill();
      const { links, texture, partyItems } = collect();
      gsap.set([...headingWords, ...links, texture, ...partyItems], {
        clearProps: 'opacity,transform,willChange',
      });
    },
  };
};

export default contactScene;
