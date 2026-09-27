/** `prefers-reduced-motion` — read by fx, camera and UI (ARCHITECTURE.md → Motion preference). */
const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(QUERY).matches;
}

export function onReducedMotionChange(fn: (reduce: boolean) => void): () => void {
  const list = matchMedia(QUERY);
  const handler = (e: MediaQueryListEvent) => fn(e.matches);
  list.addEventListener('change', handler);
  return () => list.removeEventListener('change', handler);
}
