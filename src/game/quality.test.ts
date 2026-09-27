import { describe, expect, it } from 'vitest';
import { FpsGuard, decideTier, loadsOnTier, tierFlags } from './quality';

const desktop = { finePointer: true, viewportWidth: 1440, saveData: false, pinned: null };

describe('decideTier', () => {
  it('is high on a wide fine-pointer screen', () => {
    expect(decideTier(desktop)).toEqual({ tier: 'high', pinned: false });
  });

  it.each([{ finePointer: false }, { viewportWidth: 1023 }, { saveData: true }])(
    'is low when %o',
    (override) => {
      expect(decideTier({ ...desktop, ...override }).tier).toBe('low');
    }
  );

  it('?tier= pins either tier and ignores junk', () => {
    expect(decideTier({ ...desktop, pinned: 'low' })).toEqual({ tier: 'low', pinned: true });
    expect(decideTier({ ...desktop, finePointer: false, pinned: 'high' })).toEqual({
      tier: 'high',
      pinned: true,
    });
    expect(decideTier({ ...desktop, pinned: 'ultra' })).toEqual({ tier: 'high', pinned: false });
  });
});

describe('tier flags and assets', () => {
  it('low draws fewer layers and no filters', () => {
    expect(tierFlags('low').parallaxLayers).toBeLessThan(tierFlags('high').parallaxLayers);
    expect(tierFlags('low').filters).toBe(false);
  });

  it('high-tier assets load only on high', () => {
    expect(loadsOnTier('high', 'low')).toBe(false);
    expect(loadsOnTier('high', 'high')).toBe(true);
    expect(loadsOnTier('all', 'low')).toBe(true);
  });
});

describe('FpsGuard', () => {
  const run = (guard: FpsGuard, fps: number, ms: number) => {
    let tripped = false;
    for (let t = 0; t < ms; t += 1000 / fps) tripped = guard.feed(1000 / fps) || tripped;
    return tripped;
  };

  it('downgrades after 3 s below 50 fps, once', () => {
    const guard = new FpsGuard();
    expect(run(guard, 40, 3100)).toBe(true);
    expect(run(guard, 40, 3100)).toBe(false);
  });

  it('keeps high at 60 fps', () => {
    expect(run(new FpsGuard(), 60, 10_000)).toBe(false);
  });

  it('ignores a single huge delta (hidden tab)', () => {
    const guard = new FpsGuard();
    run(guard, 60, 2000);
    expect(guard.feed(5000)).toBe(false);
    expect(run(guard, 60, 3100)).toBe(false);
  });
});
