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

const contactScene = (el: Element): Scene => {
  let entered = false;
  let headingWords: HTMLElement[] = [];
  let tl: gsap.core.Timeline | null = null;

  function collect() {
    return {
      links: Array.from(el.querySelectorAll<HTMLElement>('[data-contact-link]')),
      glow: el.querySelector<HTMLElement>('[data-contact-glow]'),
      partyItems: Array.from(el.querySelectorAll<HTMLElement>('[data-panda-party-item]')),
    };
  }

  return {
    init() {
      const heading = el.querySelector<HTMLElement>('[data-contact-heading]');
      const { links, glow, partyItems } = collect();

      if (heading) headingWords = splitWords(heading);

      gsap.set(headingWords, { opacity: 0, y: 24 });
      gsap.set(links, { opacity: 0, y: 20 });
      gsap.set(glow, { opacity: 0 });
      // The idle bob/wiggle/fade loop lives on the <img> (CSS @keyframes); this
      // entrance only owns the wrapper's opacity/y/scale — no shared channel.
      gsap.set(partyItems, { opacity: 0, y: 26, scale: 0.7, willChange: 'transform,opacity' });
    },

    enter() {
      if (entered) return;
      entered = true;

      const { links, glow, partyItems } = collect();

      tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(headingWords, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 })
        .to(links, { opacity: 1, y: 0, duration: 0.45, stagger: 0.1 }, '-=0.1')
        .to(glow, { opacity: 1, duration: 0.9 }, '<0.1')
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
      // Lava-blob motion is a pure-CSS loop; nothing to drive on scroll.
    },

    destroy() {
      tl?.kill();
      const { links, glow, partyItems } = collect();
      gsap.set([...headingWords, ...links, glow, ...partyItems], {
        clearProps: 'opacity,transform,willChange',
      });
    },
  };
};

export default contactScene;
