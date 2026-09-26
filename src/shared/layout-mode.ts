/**
 * One of the two modules allowed to inspect the device (AGENTS.md → Golden Rule 8).
 * Touch = the PRIMARY pointer is coarse, so a touchscreen laptop driven by a mouse stays
 * `desktop` ('ontouchstart' in window is false under Playwright touch emulation anyway).
 */
export type LayoutMode = 'desktop' | 'handheld' | 'landscape-touch';

export interface LayoutInputs {
  coarsePointer: boolean;
  portrait: boolean;
}

export function layoutMode({ coarsePointer, portrait }: LayoutInputs): LayoutMode {
  if (!coarsePointer) return 'desktop';
  return portrait ? 'handheld' : 'landscape-touch';
}

/** Art px of view height the zoom aims for (ARCHITECTURE.md → Rendering contract). */
export function targetViewHeight(mode: LayoutMode): number {
  return mode === 'desktop' ? 360 : 240;
}

const QUERIES = { coarsePointer: '(pointer: coarse)', portrait: '(orientation: portrait)' };

export function readLayoutMode(): LayoutMode {
  return layoutMode({
    coarsePointer: matchMedia(QUERIES.coarsePointer).matches,
    portrait: matchMedia(QUERIES.portrait).matches,
  });
}

/** Calls `fn` with the current mode now and whenever it changes. Returns an unsubscribe. */
export function watchLayoutMode(fn: (mode: LayoutMode) => void): () => void {
  let current = readLayoutMode();
  fn(current);
  const lists = Object.values(QUERIES).map((q) => matchMedia(q));
  const onChange = () => {
    const next = readLayoutMode();
    if (next !== current) fn((current = next));
  };
  for (const l of lists) l.addEventListener('change', onChange);
  return () => {
    for (const l of lists) l.removeEventListener('change', onChange);
  };
}
