/**
 * The vault (BACKLOG.md Phase 8 — GAME_DESIGN.md → Classified wing): the `confidential-vault`
 * set asset's `wall` and `door` items, the door sliding aside over the wall's `doorway` anchor on
 * interact (integer-pixel tween; instant under reduced motion) with a small camera nudge (off
 * under reduced motion). A different shape from every other station — two images, one animated —
 * so it gets its own adapter instead of `stations/Stations.ts`'s generic single-sprite one. Its
 * "interact here" marker is the shared `stations/cue.ts`, placed from `cueAnchor()`.
 *
 * Golden Rule 3 / GAME_DESIGN.md → Canonical ids: the vault opens no DOM panel of its own — the
 * game still emits the usual `station:open` on the bus (a harmless no-op UI-side, same as any
 * other id with no panel), and `open()` here is a purely local, game-side reaction to the same
 * interact, decided entirely inside the game (Golden Rule 7: the UI is never involved).
 */
import type Phaser from 'phaser';
import { getAsset, type Rect } from '../../assets/registry';
import type { RuntimeManifest } from '../../assets/runtime';
import { num } from '../../design/palette';
import { prefersReducedMotion } from '../../shared/motion';
import type { Station } from '../world/layout';
import type { CueAnchor } from './cue';

/** Slide duration and the gap the door clears past the wall's edge once open. */
const DOOR_OPEN_MS = 500;
const DOOR_MARGIN = 12;
/** The "camera nudge" (skipped entirely under reduced motion): Phaser's own small, brief camera
 * shake — orthogonal to `render/follow.ts`'s manual `scrollX`, which it offsets on top of. */
const NUDGE_MS = 160;
const NUDGE_INTENSITY = 0.003;
/** The manifest's declared doorway rect (art/manifest.json), used when no runtime anchor
 * resolved (placeholder or the pipeline hasn't run) — the design-time fallback, same pattern as
 * every other geometry default in this codebase. */
const DEFAULT_DOORWAY: Rect = [32, 48, 96, 96];

interface ResolvedItem {
  key: string;
  frame?: string;
  w: number;
  h: number;
  anchors?: Record<string, Rect>;
}

function designSetItem(
  assetId: string,
  itemName: string
): { w: number; h: number; anchors?: Record<string, Rect> } {
  const asset = getAsset(assetId);
  if (asset.kind !== 'set') throw new Error(`Vault: "${assetId}" is not a set asset`);
  const item = asset.items.find((i) => i.name === itemName);
  if (!item) throw new Error(`Vault: "${assetId}" has no item "${itemName}"`);
  return { w: item.size[0], h: item.size[1], anchors: item.anchors };
}

/** The real item's frame + resolved anchors when the pipeline has one, else the documented
 * placeholder (`navy-700`/`navy-400` box; the doorway anchor additionally punches a `navy-950`
 * rect, ARCHITECTURE.md → Asset pipeline → Placeholders). */
function resolveItem(
  scene: Phaser.Scene,
  manifest: RuntimeManifest | null,
  assetId: string,
  itemName: string
): ResolvedItem {
  const asset = manifest?.assets[assetId];
  if (
    asset &&
    asset.source !== 'missing' &&
    asset.kind === 'set' &&
    scene.textures.exists(assetId)
  ) {
    const item = asset.items[itemName];
    if (item) return { key: assetId, frame: itemName, w: item.w, h: item.h, anchors: item.anchors };
  }
  const design = designSetItem(assetId, itemName);
  const key = `${assetId}-${itemName}-placeholder`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(num('navy-700')).fillRect(0, 0, design.w, design.h);
    g.lineStyle(1, num('navy-400')).strokeRect(0.5, 0.5, design.w - 1, design.h - 1);
    const doorway = design.anchors?.doorway;
    if (doorway)
      g.fillStyle(num('navy-950')).fillRect(doorway[0], doorway[1], doorway[2], doorway[3]);
    g.generateTexture(key, design.w, design.h);
    g.destroy();
  }
  return { key, w: design.w, h: design.h, anchors: design.anchors };
}

export class Vault {
  private readonly scene: Phaser.Scene;
  private readonly door: Phaser.GameObjects.Image;
  private readonly doorClosedX: number;
  private readonly doorOpenX: number;
  private readonly cueX: number;
  private readonly cueTopY: number;
  private opened = false;

  constructor(
    scene: Phaser.Scene,
    station: Station,
    manifest: RuntimeManifest | null,
    groundY: number,
    onClick: (station: Station) => void
  ) {
    this.scene = scene;
    const wall = resolveItem(scene, manifest, station.asset, 'wall');
    const x = Math.round(station.x);
    const wallImage = scene.add.image(x, groundY, wall.key, wall.frame).setOrigin(0.5, 1);
    wallImage.setInteractive({ useHandCursor: true }).on('pointerdown', () => onClick(station));
    const wallLeft = x - wall.w / 2;
    const wallTop = groundY - wall.h;

    const door = resolveItem(scene, manifest, station.asset, 'door');
    const [doorwayX, doorwayY] = wall.anchors?.doorway ?? DEFAULT_DOORWAY;
    this.doorClosedX = Math.round(wallLeft + doorwayX);
    const doorY = Math.round(wallTop + doorwayY);
    this.door = scene.add.image(this.doorClosedX, doorY, door.key, door.frame).setOrigin(0, 0);
    this.doorOpenX = this.doorClosedX - door.w - DOOR_MARGIN;

    this.cueX = x;
    this.cueTopY = wallTop;
  }

  /** The cue sits on the wall's top; the vault has no text of its own, so the cue's hint goes on
   * the wall's face — above it is the classified sign. */
  cueAnchor(): CueAnchor {
    return { x: this.cueX, topY: this.cueTopY, hint: 'inside' };
  }

  isOpen(): boolean {
    return this.opened;
  }

  /** Rolls the door aside, revealing the wall's own pre-drawn doorway art underneath — idempotent,
   * so a second interact (or arriving again by menu/deep link) is a no-op. */
  open(): void {
    if (this.opened) return;
    this.opened = true;
    if (prefersReducedMotion()) {
      this.door.setX(this.doorOpenX);
      return;
    }
    this.scene.tweens.add({
      targets: this.door,
      x: this.doorOpenX,
      duration: DOOR_OPEN_MS,
      ease: 'Cubic.easeIn',
    });
    this.scene.cameras.main.shake(NUDGE_MS, NUDGE_INTENSITY);
  }
}
