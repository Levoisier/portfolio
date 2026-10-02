/**
 * The one "you can stop here" cue (Phaser adapter): the quest-scroll icon (`cue-logic.ts`) above
 * whichever station the panda is in range of, bobbing a whole pixel (still under reduced
 * motion), plus — for a station that has no hint of its own (no card text: a dossier stand, the
 * vault, a skill block, the contact post) — the "Press E/B to interact" line above the icon.
 * `WorldScene` owns it and moves it every frame from the stations' `cueAnchor`s; the station
 * adapters draw no marker of their own.
 */
import type Phaser from 'phaser';
import type { Lang } from '../../content/types';
import { num } from '../../design/palette';
import { ui } from '../../i18n/ui';
import type { LayoutMode } from '../../shared/layout-mode';
import { STATION_GLYPH_GAP } from '../config';
import { PIXEL_FONT, PIXEL_FONT_SIZE, registerPixelFont } from '../text/bitmap-font';
import { QUEST_ICON_H, QUEST_ICON_W, questBob, questIconRuns } from './cue-logic';

/** Where a station wants the cue: centred on `x`, resting on `topY` (the prop's top edge). */
export interface CueAnchor {
  x: number;
  topY: number;
  /** Where the cue's interact hint goes when the station shows none of its own: floating above
   * the icon, or `inside` on the prop's face just under its top (the vault, whose wall has the
   * classified sign floating right above it); null when the station has its own (a card). */
  hint: 'above' | 'inside' | null;
}

/** Space (art px) between the icon's top (or the prop's top, `inside`) and the hint's plate. */
const HINT_GAP = 3;
/** Padding (art px) of the floating hint's plate around its text. */
const HINT_PAD = 3;
/** Widest the floating hint gets before it wraps (art px). */
const HINT_MAX_W = 136;
/** Plate opacity: readable over the painted backdrop, which still shows through. */
const HINT_ALPHA = 0.78;

export class StationCue {
  private readonly scene: Phaser.Scene;
  private readonly icon: Phaser.GameObjects.Graphics;
  private readonly plate: Phaser.GameObjects.Graphics;
  private hint: Phaser.GameObjects.BitmapText | null = null;
  private reducedMotion: boolean;

  constructor(scene: Phaser.Scene, reducedMotion: boolean) {
    this.scene = scene;
    this.reducedMotion = reducedMotion;
    this.icon = scene.add.graphics().setVisible(false);
    // Drawn with its bottom centre at (0, 0), like the prop it stands on.
    const left = -Math.floor(QUEST_ICON_W / 2);
    for (const run of questIconRuns())
      this.icon.fillStyle(num(run.color)).fillRect(left + run.x, run.y - QUEST_ICON_H, run.w, 1);
    this.plate = scene.add.graphics().setVisible(false);
  }

  /** (Re)builds the floating hint for `lang`/`mode` once the pixel font exists. */
  drawLabels(lang: Lang, mode: LayoutMode): boolean {
    if (!registerPixelFont(this.scene)) return false;
    const text = (mode === 'desktop' ? ui.stationHintKey : ui.stationHintTouch)[lang];
    if (this.hint?.text === text) return true;
    this.hint?.destroy();
    this.hint = this.scene.add
      .bitmapText(0, 0, PIXEL_FONT, text, PIXEL_FONT_SIZE)
      .setMaxWidth(HINT_MAX_W)
      .setCenterAlign()
      .setTint(num('amber-400'))
      .setVisible(false);
    return true;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** Places the cue on `anchor` (or hides it for `null`); called every frame. */
  show(anchor: CueAnchor | null, nowMs: number): void {
    if (!anchor) {
      this.icon.setVisible(false);
      this.plate.setVisible(false);
      this.hint?.setVisible(false);
      return;
    }
    const bottom =
      Math.round(anchor.topY - STATION_GLYPH_GAP) - questBob(nowMs, this.reducedMotion);
    this.icon.setPosition(Math.round(anchor.x), bottom).setVisible(true);

    const hint = anchor.hint ? this.hint : null;
    this.plate.setVisible(hint !== null);
    this.hint?.setVisible(hint !== null);
    if (!hint) return;
    // The text rides with the icon's rest position, not its bob: moving text reads as jitter.
    const restBottom = Math.round(anchor.topY - STATION_GLYPH_GAP);
    const w = Math.ceil(hint.width);
    const h = Math.ceil(hint.height);
    const x = Math.round(anchor.x - w / 2);
    const y =
      anchor.hint === 'inside'
        ? Math.round(anchor.topY) + HINT_GAP + HINT_PAD
        : restBottom - QUEST_ICON_H - 1 - HINT_GAP - HINT_PAD - h;
    hint.setPosition(x, y);
    this.plate
      .clear()
      .fillStyle(num('navy-950'), HINT_ALPHA)
      .fillRect(x - HINT_PAD, y - HINT_PAD, w + 2 * HINT_PAD, h + 2 * HINT_PAD);
  }
}
