/**
 * Phaser adapter for every station whose prop is a single `sprite`-kind asset — the 6 project
 * stations (BACKLOG.md Phase 5) and, since Phase 8, the 4 confidential-project dossier stands
 * (`confidential-dossier` is a `sprite` too): the prop image (or the documented placeholder box
 * when the art has not landed yet, narrower in the portrait `handheld` layout), the
 * click/tap-to-open hit area, and each card's title and interact hint. The quest-scroll marker
 * above the station in range is `stations/cue.ts`, placed from `cueAnchor`. The vault (`kind:
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
import { PIXEL_FONT, PIXEL_FONT_SIZE, registerPixelFont } from '../text/bitmap-font';
import type { Station } from '../world/layout';
import type { CueAnchor } from './cue';
import { cardSign, cardWidth } from './cue-logic';

/** Inner padding (art px) of a station card's title and interact hint. */
const CARD_PAD = 8;
/** Space (art px) between a card's title and its interact hint. */
const CARD_HINT_GAP = 6;
/** A card narrower than this (a dossier stand) shows no text — the cue carries its hint. */
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

/** The delivered prop's texture key + size, or null until the art lands (a card is drawn). */
function deliveredProp(
  scene: Phaser.Scene,
  manifest: RuntimeManifest | null,
  id: string
): { key: string; w: number; h: number } | null {
  const asset = manifest?.assets[id];
  if (asset?.source === 'raw' && asset.kind === 'sprite' && scene.textures.exists(id))
    return { key: id, w: asset.width, h: asset.height };
  return null;
}

/**
 * A station **card** `w × h`: a translucent night-blue panel with a lighter 1-px edge, drawn in
 * code so the backdrop shows through (and the gate's `sign` plate, where the sign text goes).
 * One texture per width — the portrait `handheld` layout uses narrower cards (`cardWidth`).
 */
function cardTexture(
  scene: Phaser.Scene,
  id: string,
  w: number,
  h: number,
  sign: Rect | undefined
): string {
  const key = `${id}-card-${w}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(num('night-700'), CARD_ALPHA).fillRect(0, 0, w, h);
    g.fillStyle(num('night-400'))
      .fillRect(0, 0, w, 1)
      .fillRect(0, h - 1, w, 1);
    g.fillRect(0, 1, 1, h - 2).fillRect(w - 1, 1, 1, h - 2);
    if (sign) g.fillStyle(num('navy-950'), 0.85).fillRect(...sign);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return key;
}

interface CardText {
  title: Phaser.GameObjects.BitmapText | null;
  hint: Phaser.GameObjects.BitmapText;
}

interface Geometry {
  x: number;
  topY: number;
  w: number;
  h: number;
  /** Set for a code-drawn card (no delivered art): its image, design width and design sign. */
  card: { image: Phaser.GameObjects.Image; id: string; designW: number; sign?: Rect } | null;
}

export class Stations {
  private readonly geometry = new Map<string, Geometry>();
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
      const x = Math.round(station.x);
      const prop = deliveredProp(scene, manifest, station.asset);
      if (prop) {
        const obj = scene.add.image(x, groundY, prop.key).setOrigin(0.5, 1);
        obj.setInteractive({ useHandCursor: true }).on('pointerdown', () => onClick(station));
        this.geometry.set(station.id, {
          x,
          topY: groundY - prop.h,
          w: prop.w,
          h: prop.h,
          card: null,
        });
        continue;
      }
      const { w: designW, h } = designSize(station.asset);
      const sign: Rect | undefined = getAsset(station.asset).anchors?.sign;
      const w = cardWidth(designW, mode, sign !== undefined);
      const signRect = sign && cardSign(sign, designW, w);
      const image = scene.add
        .image(x, groundY, cardTexture(scene, station.asset, w, h, signRect))
        .setOrigin(0.5, 1);
      image.setInteractive({ useHandCursor: true }).on('pointerdown', () => onClick(station));
      this.geometry.set(station.id, {
        x,
        topY: groundY - h,
        w,
        h,
        card: { image, id: station.asset, designW, sign },
      });
    }
  }

  /** Where the cue goes for `id` (null if it is not one of these stations). A card with text
   * carries its own hint; anything else (delivered art, a narrow dossier card) gets the cue's. */
  cueAnchor(id: string): CueAnchor | null {
    const geo = this.geometry.get(id);
    if (!geo) return null;
    return { x: geo.x, topY: geo.topY, hint: this.texts.has(id) ? null : 'above' };
  }

  /** `id`'s card sign plate in world coordinates, or null when it has no card or no sign (the
   * gate's delivered art carries its own anchor — `Story` reads that one itself). */
  signRect(id: string): Rect | null {
    const geo = this.geometry.get(id);
    if (!geo?.card?.sign) return null;
    const [sx, sy, sw, sh] = cardSign(geo.card.sign, geo.card.designW, geo.w);
    return [geo.x - Math.floor(geo.w / 2) + sx, geo.topY + sy, sw, sh];
  }

  /**
   * (Re)draws every card's pixel text — the project title at the top, and the interact hint
   * under it (shown only while the panda is in range) — once the pixel font exists, and again
   * on a language or input-mode change (`E` on a keyboard, `B` on the pad). The gate's card has
   * no title: its sign already names it, so its hint goes under the sign plate instead.
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
      const sign = this.signRect(id);
      const left = geo.x - Math.floor(geo.w / 2);
      const maxW = geo.w - 2 * CARD_PAD;
      const titleText = projects.find((p) => p.id === id)?.title;
      const title = titleText
        ? this.text(titleText, maxW, 'paper-100').setY(geo.topY + CARD_PAD)
        : null;
      title?.setX(Math.round(left + (geo.w - title.width) / 2));
      // Under the title, not at the card's foot: the panda stands in front of the lower half.
      const h = this.text(hint, maxW, 'amber-400');
      const hintY = title
        ? title.y + title.height + CARD_HINT_GAP
        : sign
          ? sign[1] + sign[3] + CARD_HINT_GAP
          : geo.topY + CARD_PAD;
      h.setPosition(Math.round(left + (geo.w - h.width) / 2), Math.round(hintY));
      h.setVisible(id === this.activeId);
      this.texts.set(id, { title, hint: h });
    }
    return true;
  }

  /** The input mode changed (rotation, a mouse plugged in): resize the cards for it and swap
   * the hint's key/button. */
  setMode(mode: LayoutMode): void {
    if (mode === this.mode) return;
    for (const geo of this.geometry.values()) {
      const card = geo.card;
      if (!card) continue;
      const w = cardWidth(card.designW, mode, card.sign !== undefined);
      if (w === geo.w) continue;
      const sign = card.sign && cardSign(card.sign, card.designW, w);
      card.image.setTexture(cardTexture(this.scene, card.id, w, geo.h, sign));
      // The hit area was sized from the old texture.
      card.image.input?.hitArea.setTo(0, 0, w, geo.h);
      geo.w = w;
    }
    this.mode = mode;
    this.drawLabels(this.lang, mode);
  }

  private text(value: string, maxW: number, color: 'paper-100' | 'amber-400') {
    return this.scene.add
      .bitmapText(0, 0, PIXEL_FONT, value, PIXEL_FONT_SIZE)
      .setMaxWidth(maxW)
      .setCenterAlign()
      .setTint(num(color));
  }

  /** Shows `id`'s card hint (hiding the previous one), or none for `null` (no station nearby,
   * or a panel open — `WorldScene` passes `null` while `modalOpen`). */
  setActive(id: string | null): void {
    if (id === this.activeId) return;
    if (this.activeId) this.texts.get(this.activeId)?.hint.setVisible(false);
    if (id) this.texts.get(id)?.hint.setVisible(true);
    this.activeId = id;
  }
}
