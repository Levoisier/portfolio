import { describe, expect, it } from 'vitest';
import type { RuntimeManifest } from '../assets/runtime';
import { loadPlan, planUrls } from './load-plan';

const manifest: RuntimeManifest = {
  version: 1,
  hash: 'abcdef0123456789',
  assets: {
    'panda-idle': {
      id: 'panda-idle',
      kind: 'strip',
      tier: 'all',
      required: true,
      source: 'reference',
      url: '/game/panda-idle.png',
      warnings: [],
      frameWidth: 64,
      frameHeight: 64,
      frames: 4,
      baseline: 60,
      fps: 6,
      loop: true,
    },
    platforms: {
      id: 'platforms',
      kind: 'set',
      tier: 'all',
      required: true,
      source: 'placeholder',
      url: '/game/platforms.png',
      atlasUrl: '/game/platforms.json',
      warnings: [],
      items: { 'platform-s': { w: 48, h: 16 } },
    },
    'bg-fore': {
      id: 'bg-fore',
      kind: 'layer',
      tier: 'high',
      required: false,
      source: 'placeholder',
      url: '/game/bg-fore.png',
      warnings: [],
      width: 640,
      height: 64,
    },
    'flare-flame': {
      id: 'flare-flame',
      kind: 'strip',
      tier: 'high',
      required: false,
      source: 'missing',
      warnings: [],
    },
  },
};

describe('loadPlan', () => {
  it('requests nothing without a manifest', () => {
    expect(loadPlan(null, 'high')).toEqual([]);
  });

  it('maps kinds to loader calls, versioned by the manifest hash', () => {
    expect(loadPlan(manifest, 'high')).toEqual([
      {
        type: 'spritesheet',
        key: 'panda-idle',
        url: '/game/panda-idle.png?v=abcdef012345',
        frameWidth: 64,
        frameHeight: 64,
      },
      {
        type: 'atlas',
        key: 'platforms',
        url: '/game/platforms.png?v=abcdef012345',
        atlasUrl: '/game/platforms.json?v=abcdef012345',
      },
      { type: 'image', key: 'bg-fore', url: '/game/bg-fore.png?v=abcdef012345' },
    ]);
  });

  it('skips high-tier assets on low and never requests missing ones', () => {
    const urls = planUrls(loadPlan(manifest, 'low'));
    expect(urls).toEqual([
      '/game/panda-idle.png?v=abcdef012345',
      '/game/platforms.png?v=abcdef012345',
      '/game/platforms.json?v=abcdef012345',
    ]);
    expect(planUrls(loadPlan(manifest, 'high')).some((u) => u.includes('flare-flame'))).toBe(false);
  });
});
