/**
 * Inlined manifest → the exact list of files BootScene requests. The page must request only
 * files the manifest lists (zero failed requests, even with an empty public/game/).
 */
import type { RuntimeAsset, RuntimeManifest } from '../assets/runtime';
import { loadsOnTier, type Tier } from './quality';

export type LoadItem =
  | { type: 'spritesheet'; key: string; url: string; frameWidth: number; frameHeight: number }
  | { type: 'image'; key: string; url: string }
  | { type: 'atlas'; key: string; url: string; atlasUrl: string };

/** `?v=<hash>` so a new pipeline run is never masked by a cached file of the same name. */
export const versioned = (url: string, hash: string) => `${url}?v=${hash.slice(0, 12)}`;

function item(asset: RuntimeAsset, hash: string): LoadItem | null {
  if (asset.source === 'missing') return null;
  const url = versioned(asset.url, hash);
  switch (asset.kind) {
    case 'strip':
      return {
        type: 'spritesheet',
        key: asset.id,
        url,
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      };
    case 'set':
      return asset.atlasUrl
        ? { type: 'atlas', key: asset.id, url, atlasUrl: versioned(asset.atlasUrl, hash) }
        : { type: 'image', key: asset.id, url };
    default:
      return { type: 'image', key: asset.id, url };
  }
}

export function loadPlan(manifest: RuntimeManifest | null, tier: Tier): LoadItem[] {
  if (!manifest) return [];
  return Object.values(manifest.assets)
    .filter((a) => loadsOnTier(a.tier, tier))
    .map((a) => item(a, manifest.hash))
    .filter((i): i is LoadItem => i !== null);
}

/** Every URL a plan fetches (atlas JSON included) — what the e2e request check expects. */
export function planUrls(plan: LoadItem[]): string[] {
  return plan.flatMap((i) => (i.type === 'atlas' ? [i.url, i.atlasUrl] : [i.url]));
}
