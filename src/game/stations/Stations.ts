/**
 * Phaser adapter for the 6 project stations (BACKLOG.md Phase 5 — ARCHITECTURE.md → Stations &
 * panels): the prop sprite (or the documented placeholder box when the art has not landed yet),
 * the click/tap-to-open hit area, and the small pixel "interact" glyph that floats above the one
 * the panda is currently near. Trigger-zone math stays pure in `trigger.ts`; this module only
 * ever calls methods on the `Phaser.Scene`/objects it is handed.
 */
import type Phaser from 'phaser';
import { getAsset } from '../../assets/registry';
import type { RuntimeManifest } from '../../assets/runtime';
import { num } from '../../design/palette';
import { STATION_GLYPH_GAP } from '../config';
import type { Station } from '../world/layout';

/** The design-time `maxSize`/`targetHeight` for a `sprite` asset (the placeholder box's size,
 * also the fallback when no runtime manifest resolved a real one). */
function designSize(id: string): { w: number; h: number } {
  const asset = getAsset(id);
  if (asset.kind !== 'sprite') throw new Error(`stations: "${id}" is not a sprite asset`);
  return { w: asset.maxSize[0], h: asset.targetHeight };
}

/** The real texture's key + size when the pipeline resolved one; else the documented sprite
 * placeholder (ARCHITECTURE.md → Asset pipeline → Placeholders: `maxSize[0] × targetHeight` in
 * `navy-700` with a `navy-400` outline), generated on demand so it renders identically whether
 * or not `pnpm assets` has run. */
function resolveStation(
  scene: Phaser.Scene,
  manifest: RuntimeManifest | null,
  id: string
): { key: string; w: number; h: number } {
  const asset = manifest?.assets[id];
  if (asset && asset.source !== 'missing' && asset.kind === 'sprite' && scene.textures.exists(id)) {
    return { key: id, w: asset.width, h: asset.height };
  }
  const { w, h } = designSize(id);
  const key = `${id}-placeholder`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(num('navy-700')).fillRect(0, 0, w, h);
    g.lineStyle(1, num('navy-400')).strokeRect(0.5, 0.5, w - 1, h - 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return { key, w, h };
}

/** A small amber "interact here" badge with a dark cut-in "!" — flat palette rects only, no
 * rotation or antialiasing, so it stays crisp at any zoom (AGENTS.md Golden Rule 6). */
function drawGlyph(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(num('ink-900')).fillRect(-6, -12, 12, 12);
  g.fillStyle(num('amber-400')).fillRect(-5, -11, 10, 10);
  g.fillStyle(num('ink-900')).fillRect(-1, -9, 2, 5);
  g.fillStyle(num('ink-900')).fillRect(-1, -3, 2, 2);
}

export class Stations {
  private readonly geometry = new Map<string, { x: number; topY: number }>();
  private readonly glyph: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    stations: readonly Station[],
    manifest: RuntimeManifest | null,
    groundY: number,
    onClick: (station: Station) => void
  ) {
    for (const station of stations) {
      const { key, h } = resolveStation(scene, manifest, station.asset);
      const x = Math.round(station.x);
      const obj = scene.add.image(x, groundY, key).setOrigin(0.5, 1);
      obj.setInteractive({ useHandCursor: true });
      obj.on('pointerdown', () => onClick(station));
      this.geometry.set(station.id, { x, topY: groundY - h });
    }

    this.glyph = scene.add.graphics().setVisible(false);
    drawGlyph(this.glyph);
  }

  /** Shows the glyph above `id`'s prop, or hides it for `null` (no station nearby, or a panel
   * open — `WorldScene` passes `null` while `modalOpen`). */
  setActive(id: string | null): void {
    const geo = id ? this.geometry.get(id) : undefined;
    if (!geo) {
      this.glyph.setVisible(false);
      return;
    }
    this.glyph.setPosition(geo.x, Math.round(geo.topY - STATION_GLYPH_GAP));
    this.glyph.setVisible(true);
  }
}
