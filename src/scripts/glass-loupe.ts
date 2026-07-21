/**
 * Liquid-glass magnifier loupe (v4 polish).
 *
 * Adds a cursor-following circular lens to every `.liquid-glass` surface that
 * magnifies the panel content beneath it — a "pass it around to zoom" feel,
 * framed by scope-style corner brackets (drawn in CSS).
 *
 * Desktop + fine-pointer only; skipped entirely on coarse pointers and below the
 * desktop breakpoint, so mobile/LCP is untouched. The
 * lens position and the magnified clone are driven from a SINGLE rAF lerp so they
 * never drift out of sync; only transforms are written (compositor-friendly).
 */

const ZOOM = 1.4; // magnification — "a little" zoom
const EASE = 0.22; // lerp factor for the smooth glassy follow

function setupLoupe(surface: HTMLElement): void {
  const loupe = document.createElement('div');
  loupe.className = 'glass-loupe';
  loupe.setAttribute('aria-hidden', 'true');
  loupe.setAttribute('inert', ''); // cloned links/headings stay out of tab order + AT
  const lens = document.createElement('div');
  lens.className = 'glass-lens';
  const inner = document.createElement('div');
  inner.className = 'glass-lens-inner';
  lens.appendChild(inner);
  loupe.appendChild(lens);
  surface.appendChild(loupe);

  let radius = 0;
  let clientX = 0;
  let clientY = 0;
  let curX = 0;
  let curY = 0;
  let active = false;
  let rafId = 0;

  // Clone the live panel content (current language/state) into the lens. Ids are
  // KEPT so id-based CSS (e.g. #hero-name's font-size + white-space) still styles
  // the clone identically; the duplicate ids are harmless here — the loupe is
  // inert + aria-hidden, and the scene reads the originals once at init (before
  // any clone exists), so getElementById always resolves to the real element.
  function buildContent(): void {
    const cs = getComputedStyle(surface);
    inner.style.width = `${surface.offsetWidth}px`;
    inner.style.padding = cs.padding;

    const frag = document.createDocumentFragment();
    for (const child of Array.from(surface.children)) {
      if (child === loupe) continue;
      frag.appendChild(child.cloneNode(true));
    }
    inner.replaceChildren(frag);
  }

  function frame(): void {
    rafId = 0;
    // One layout read (handles scroll while hovering), then transform writes only.
    const rect = surface.getBoundingClientRect();
    const targetX = clientX - rect.left;
    const targetY = clientY - rect.top;
    curX += (targetX - curX) * EASE;
    curY += (targetY - curY) * EASE;

    loupe.style.transform = `translate(${curX - radius}px, ${curY - radius}px)`;
    // Loupe math: the surface point under the cursor lands at the lens center.
    inner.style.transform = `translate(${radius - ZOOM * curX}px, ${radius - ZOOM * curY}px) scale(${ZOOM})`;

    if (active) rafId = requestAnimationFrame(frame);
  }

  surface.addEventListener('mouseenter', (event: MouseEvent) => {
    buildContent();
    radius = loupe.offsetWidth / 2;
    clientX = event.clientX;
    clientY = event.clientY;
    const rect = surface.getBoundingClientRect();
    curX = clientX - rect.left; // start at the cursor (no slide-in from the corner)
    curY = clientY - rect.top;
    active = true;
    loupe.classList.add('is-active');
    if (!rafId) rafId = requestAnimationFrame(frame);
  });

  surface.addEventListener('mousemove', (event: MouseEvent) => {
    clientX = event.clientX;
    clientY = event.clientY;
  });

  surface.addEventListener('mouseleave', () => {
    active = false;
    loupe.classList.remove('is-active');
  });
}

export function initGlassLoupe(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (!window.matchMedia('(min-width: 1024px)').matches) return;
  document.querySelectorAll<HTMLElement>('.liquid-glass').forEach(setupLoupe);
}
