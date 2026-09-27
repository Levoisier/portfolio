import { describe, expect, it } from 'vitest';
import { layoutMode, targetViewHeight } from './layout-mode';

describe('layoutMode', () => {
  it.each([
    [{ coarsePointer: false, portrait: false }, 'desktop'],
    [{ coarsePointer: false, portrait: true }, 'desktop'],
    [{ coarsePointer: true, portrait: true }, 'handheld'],
    [{ coarsePointer: true, portrait: false }, 'landscape-touch'],
  ] as const)('%o → %s', (inputs, mode) => {
    expect(layoutMode(inputs)).toBe(mode);
  });

  it('targets 360 art px on desktop and 240 on touch', () => {
    expect(targetViewHeight('desktop')).toBe(360);
    expect(targetViewHeight('handheld')).toBe(240);
    expect(targetViewHeight('landscape-touch')).toBe(240);
  });
});
