/**
 * Phaser adapter for every station whose prop is a single `sprite`-kind asset — the 6 project
 * stations (BACKLOG.md Phase 5) and, since Phase 8, the 4 confidential-project dossier stands
 * (`confidential-dossier` is a `sprite` too): the prop image (or the documented placeholder box
 * when the art has not landed yet), the click/tap-to-open hit area, and the small pixel
 * "interact" glyph that floats above the one the panda is currently near. The vault (`kind:
 * 'vault'`, a multi-item `set` asset with its own door animation) is a different shape and gets
 * its own adapter, `stations/Vault.ts`. Trigger-zone math stays pure in `trigger.ts`; this module
 * only ever calls methods on the `Phaser.Scene`/objects it is handed.
 */
import type Phaser from 'phaser';
import { getAsset, type Rect } from '../../assets/registry';
import type { RuntimeManifest } from '../../assets/runtime';
import { projects } from '../../content';
import type { Lang } from '../../content/types';
import { num } from '../../design/palette';
import { ui } from '../../i18n/ui';
import type { LayoutMode } from '../../shared/layout-mode';
import { STATION_GLYPH_GAP } from '../config';
import { PIXEL_FONT, PIXEL_FONT_SIZE, registerPixelFont } from '../text/bitmap-font';
import type { Station } from '../world/layout';

/** Inner padding (art px) of a station card's title and interact hint. */
const CARD_PAD = 8;
/** Space (art px) between a card's title and its interact hint. */
const CARD_HINT_GAP = 6;
/** A card narrower than this (a dossier stand) shows no text — the glyph and HUD prompt remain. */
const CARD_TEXT_MIN_W = 120;
/** Card fill opacity: the painted backdrop shows through, so the card reads as part of it. */
const CARD_ALPHA = 0.62;

/** The design-time `maxSize`/`targetHeight` for a `sprite` asset (the placeholder box's size,
 * also the fallback when no runtime manifest resolved a real one). */
function designSize(id: string): { w: number; h: number } {
  const asset = getAsset(id);
  if (asset.kind !== 'sprite') throw new Error(`stations: "${id}" is not a sprite asset`);
  return { w: asset.maxSize[0], h: asset.targetHeight };
}

/**
 * The delivered prop's texture key + size; until the art lands, a **card** at the design size
 * (`maxSize[0] × targetHeight`): a translucent night-blue panel with a lighter 1-px edge, drawn in
 * code so the backdrop shows through (and the gate's `sign` plate, where the sign text goes).
 */
function resolveStation(
  scene: Phaser.Scene,
  manifest: RuntimeManifest | null,
  id: string
): { key: string; w: number; h: number; card: boolean } {
  const asset = manifest?.assets[id];
  if (asset?.source === 'raw' && asset.kind === 'sprite' && scene.textures.exists(id)) {
    return { key: id, w: asset.width, h: asset.height, card: false };
  }
  const { w, h } = designSize(id);
  const key = `${id}-card`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(num('night-700'), CARD_ALPHA).fillRect(0, 0, w, h);
    g.fillStyle(num('night-400'))
      .fillRect(0, 0, w, 1)
      .fillRect(0, h - 1, w, 1);
    g.fillRect(0, 1, 1, h - 2).fillRect(w - 1, 1, 1, h - 2);
    const sign: Rect | undefined = getAsset(id).anchors?.sign;
    if (sign) g.fillStyle(num('navy-950'), 0.85).fillRect(...sign);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return { key, w, h, card: true };
}

interface CardText {
  title: Phaser.GameObjects.BitmapText | null;
  hint: Phaser.GameObjects.BitmapText;
}

/** A small amber "interact here" badge with a dark cut-in "!" — flat palette rects only, no
 * rotation or antialiasing, so it stays crisp at any zoom (AGENTS.md Golden Rule 6). Exported:
 * `stations/Vault.ts` (Phase 8) draws the same glyph over its own, non-`sprite`-kind station. */
export function drawGlyph(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(num('ink-900')).fillRect(-6, -12, 12, 12);
  g.fillStyle(num('amber-400')).fillRect(-5, -11, 10, 10);
  g.fillStyle(num('ink-900')).fillRect(-1, -9, 2, 5);
  g.fillStyle(num('ink-900')).fillRect(-1, -3, 2, 2);
}

interface Geometry {
  x: number;
  topY: number;
  w: number;
  h: number;
  card: boolean;
}

export class Stations {
  private readonly geometry = new Map<string, Geometry>();
  private readonly glyph: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private readonly texts = new Map<string, CardText>();
  private activeId: string | null = null;
  private lang: Lang;
  private mode: LayoutMode;

  constructor(
    scene: Phaser.Scene,
    stations: readonly Station[],
    manifest: RuntimeManifest | null,
    groundY: number,
    onClick: (station: Station) => void,
    lang: Lang,
    mode: LayoutMode
  ) {
    this.scene = scene;
    this.lang = lang;
    this.mode = mode;
    for (const station of stations) {
      const { key, w, h, card } = resolveStation(scene, manifest, station.asset);
      const x = Math.round(station.x);
      const obj = scene.add.image(x, groundY, key).setOrigin(0.5, 1);
      obj.setInteractive({ useHandCursor: true });
      obj.on('pointerdown', () => onClick(station));
      this.geometry.set(station.id, { x, topY: groundY - h, w, h, card });
    }

    this.glyph = scene.add.graphics().setVisible(false);
    drawGlyph(this.glyph);
  }

  /**
   * (Re)draws every card's pixel text — the project title at the top, and the interact hint
   * under it (shown only while the panda is in range) — once the pixel font exists, and again
   * on a language or input-mode change (`E` on a keyboard, `B` on the pad). The gate's card has
   * no title: its sign already names it.
   */
  drawLabels(lang: Lang = this.lang, mode: LayoutMode = this.mode): boolean {
    this.lang = lang;
    this.mode = mode;
    if (!registerPixelFont(this.scene)) return false;
    for (const t of this.texts.values()) {
      t.title?.destroy();
      t.hint.destroy();
    }
    this.texts.clear();
    const hint = (mode === 'desktop' ? ui.stationHintKey : ui.stationHintTouch)[lang];
    for (const [id, geo] of this.geometry) {
      if (!geo.card || geo.w < CARD_TEXT_MIN_W) continue;
      const left = geo.x - Math.floor(geo.w / 2);
      const maxW = geo.w - 2 * CARD_PAD;
      const titleText = projects.find((p) => p.id === id)?.title;
      const title = titleText
        ? this.text(titleText, maxW, 'paper-100').setY(geo.topY + CARD_PAD)
        : null;
      title?.setX(Math.round(left + (geo.w - title.width) / 2));
      // Under the title, not at the card's foot: the panda stands in front of the lower half.
      const h = this.text(hint, maxW, 'amber-400');
      const hintY = title ? title.y + title.height + CARD_HINT_GAP : geo.topY + CARD_PAD;
      h.setPosition(Math.round(left + (geo.w - h.width) / 2), Math.round(hintY));
      h.setVisible(id === this.activeId);
      this.texts.set(id, { title, hint: h });
    }
    return true;
  }

  /** The input mode changed (rotation, a mouse plugged in): swap the hint's key/button. */
  setMode(mode: LayoutMode): void {
    if (mode !== this.mode) this.drawLabels(this.lang, mode);
  }

  private text(value: string, maxW: number, color: 'paper-100' | 'amber-400') {
    return this.scene.add
      .bitmapText(0, 0, PIXEL_FONT, value, PIXEL_FONT_SIZE)
      .setMaxWidth(maxW)
      .setCenterAlign()
      .setTint(num(color));
  }

  /** Shows the glyph above `id`'s prop (and its card's hint), or hides both for `null` (no
   * station nearby, or a panel open — `WorldScene` passes `null` while `modalOpen`). */
  setActive(id: string | null): void {
    if (id !== this.activeId) {
      if (this.activeId) this.texts.get(this.activeId)?.hint.setVisible(false);
      if (id) this.texts.get(id)?.hint.setVisible(true);
      this.activeId = id;
    }
    const geo = id ? this.geometry.get(id) : undefined;
    if (!geo) {
      this.glyph.setVisible(false);
      return;
    }
    this.glyph.setPosition(geo.x, Math.round(geo.topY - STATION_GLYPH_GAP));
    this.glyph.setVisible(true);
  }
}
