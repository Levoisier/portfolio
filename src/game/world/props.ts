/**
 * Phaser adapter for decorative props (`world/layout.ts`'s `props[]` — ARCHITECTURE.md → World
 * model): one bottom-anchored image per prop, built from a named item of a `set` asset (the
 * pipeline's Phaser JSON-hash atlas), or the documented placeholder box when the pipeline hasn't
 * resolved one yet (ARCHITECTURE.md → Asset pipeline → Placeholders). First used for the
 * classified wing's fence panels and beacon (BACKLOG.md Phase 8, `props-zones`); the mechanism
 * is generic (AGENTS.md Golden Rule 5), so a later phase's own props (`props-misc`, the lab's
 * fume hood/shelf) reuse it unchanged. Like `fx/sky.ts`/`fx/parallax.ts`, this only ever calls
 * methods on the `Phaser.Scene`/objects it is handed, never a runtime `import 'phaser'`.
 */
import type Phaser from 'phaser';
import { getAsset } from '../../assets/registry';
import type { RuntimeManifest } from '../../assets/runtime';
import { num } from '../../design/palette';
import type { Prop } from './layout';

function designItem(assetId: string, itemName: string): { w: number; h: number } {
  const asset = getAsset(assetId);
  if (asset.kind !== 'set') throw new Error(`world/props: "${assetId}" is not a set asset`);
  const item = asset.items.find((i) => i.name === itemName);
  if (!item) throw new Error(`world/props: "${assetId}" has no item "${itemName}"`);
  return { w: item.size[0], h: item.size[1] };
}

/** The documented `set`-item placeholder: its `size` box in `navy-700` with a `navy-400`
 * outline (ARCHITECTURE.md → Asset pipeline → Placeholders), generated on demand so a prop
 * renders identically whether or not `pnpm assets` has run. */
function resolveItem(
  scene: Phaser.Scene,
  manifest: RuntimeManifest | null,
  assetId: string,
  itemName: string
): { key: string; frame?: string } {
  const asset = manifest?.assets[assetId];
  if (
    asset &&
    asset.source !== 'missing' &&
    asset.kind === 'set' &&
    scene.textures.exists(assetId)
  ) {
    if (asset.items[itemName]) return { key: assetId, frame: itemName };
  }
  const { w, h } = designItem(assetId, itemName);
  const key = `${assetId}-${itemName}-placeholder`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(num('navy-700')).fillRect(0, 0, w, h);
    g.lineStyle(1, num('navy-400')).strokeRect(0.5, 0.5, w - 1, h - 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return { key };
}

/** Builds one bottom-anchored image per prop (`prop.y` is the surface it rests on — the ground
 * or a platform's top, `world/validate.ts` already checks it), keyed by the prop's own id so a
 * caller can attach extra behavior by id (e.g. `fx/classified.ts` tweens the beacons' alpha). A
 * prop with no `item` (a future standalone-sprite prop, not used yet) is skipped. */
export function buildProps(
  scene: Phaser.Scene,
  manifest: RuntimeManifest | null,
  props: readonly Prop[]
): Map<string, Phaser.GameObjects.Image> {
  const images = new Map<string, Phaser.GameObjects.Image>();
  for (const prop of props) {
    if (!prop.item) continue;
    const { key, frame } = resolveItem(scene, manifest, prop.asset, prop.item);
    const image = scene.add.image(Math.round(prop.x), prop.y, key, frame).setOrigin(0.5, 1);
    images.set(prop.id, image);
  }
  return images;
}
