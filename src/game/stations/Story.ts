/**
 * The story beats (BACKLOG.md Phase 10): the name and roles on the gate sign, the once-per-session
 * intro (asleep → "Z"s → wave, skippable), the contact post's idle/active frames, and the finale
 * at the lookout when everything was visited. Game-side only; panels open through the bus.
 */
import type Phaser from 'phaser';
import { getAsset, type Rect } from '../../assets/registry';
import type { RuntimeManifest } from '../../assets/runtime';
import { confidentialProjects, profile, projects } from '../../content';
import type { Lang } from '../../content/types';
import { num } from '../../design/palette';
import { safeLocalStorage } from '../../i18n/lang';
import { ui } from '../../i18n/ui';
import { prefersReducedMotion } from '../../shared/motion';
import { readVisited } from '../../shared/visited';
import type { Pose } from '../player/types';
import { PIXEL_FONT, PIXEL_FONT_SIZE, registerPixelFont } from '../text/bitmap-font';
import type { Station } from '../world/layout';
import type { CueAnchor } from './cue';

const INTRO_KEY = 'portfolio:intro-played';
const SLEEP_MS = 1400;
const WAVE_MS = 1600;
const FINALE_MS = 3200;
/** Tighter than the font's 14 px line so name + two roles fit the 40-px sign anchor. */
const SIGN_LINE_H = 11;
const CONTACT_ID = 'contact-post';
const GATE_ID = 'station-spawn-gate';

function safeSessionStorage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

/** "Everything visited" (GAME_DESIGN.md → Canonical ids): every project, one dossier, the stack. */
export function everythingVisited(visited: ReadonlySet<string>): boolean {
  return (
    projects.every((p) => visited.has(p.id)) &&
    confidentialProjects.some((c) => visited.has(c.id)) &&
    visited.has('stack')
  );
}

export class Story {
  private readonly scene: Phaser.Scene;
  private signRect: Rect;
  private signTexts: Phaser.GameObjects.BitmapText[] = [];
  private readonly post: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  private readonly postIsStrip: boolean;
  private readonly postTopY: number;
  private readonly postX: number;
  private lang: Lang;
  /** ms left in the current beat; the pose it shows. */
  private beatMs = 0;
  private beat: 'sleep' | 'wave' | 'finale' | null = null;
  private zees: Phaser.GameObjects.BitmapText | null = null;
  private thanks: Phaser.GameObjects.BitmapText | null = null;
  private finalePlayed = false;

  constructor(
    scene: Phaser.Scene,
    manifest: RuntimeManifest | null,
    gate: Station,
    contact: Station,
    groundY: number,
    lang: Lang,
    onClick: (station: Station) => void
  ) {
    this.scene = scene;
    this.lang = lang;

    // Gate sign anchor → world rect (the gate prop itself is built by `Stations`, origin (0.5, 1)).
    const gateRuntime = manifest?.assets[GATE_ID];
    const gateDesign = getAsset(GATE_ID);
    const gateW =
      gateRuntime &&
      gateRuntime.source !== 'missing' &&
      gateRuntime.kind === 'sprite' &&
      scene.textures.exists(GATE_ID)
        ? gateRuntime.width
        : gateDesign.kind === 'sprite'
          ? gateDesign.maxSize[0]
          : 0;
    const gateH =
      gateRuntime &&
      gateRuntime.source !== 'missing' &&
      gateRuntime.kind === 'sprite' &&
      scene.textures.exists(GATE_ID)
        ? gateRuntime.height
        : gateDesign.kind === 'sprite'
          ? gateDesign.targetHeight
          : 0;
    const sign = (gateRuntime && gateRuntime.source !== 'missing'
      ? gateRuntime.anchors?.sign
      : undefined) ??
      gateDesign.anchors?.sign ?? [0, 0, gateW, 24];
    const left = Math.round(gate.x - gateW / 2);
    const top = groundY - gateH;
    this.signRect = [left + sign[0], top + sign[1], sign[2], sign[3]];

    // Contact post: a 2-frame strip (idle, active) or a placeholder box of the same cell size.
    const postRuntime = manifest?.assets[CONTACT_ID];
    this.postX = Math.round(contact.x);
    if (
      postRuntime &&
      postRuntime.source !== 'missing' &&
      postRuntime.kind === 'strip' &&
      scene.textures.exists(CONTACT_ID)
    ) {
      this.post = scene.add
        .sprite(this.postX, groundY, CONTACT_ID, 0)
        .setOrigin(0.5, postRuntime.baseline / postRuntime.frameHeight);
      this.postIsStrip = true;
      this.postTopY = groundY - postRuntime.frameHeight;
    } else {
      const design = getAsset(CONTACT_ID);
      const [w, h] = design.kind === 'strip' ? design.cell : [112, 128];
      const key = `${CONTACT_ID}-placeholder`;
      if (!scene.textures.exists(key)) {
        const g = scene.make.graphics({}, false);
        g.fillStyle(num('scarlet-700')).fillRect(0, 0, w, h);
        g.lineStyle(1, num('scarlet-300')).strokeRect(0.5, 0.5, w - 1, h - 1);
        g.generateTexture(key, w, h);
        g.destroy();
      }
      this.post = scene.add.image(this.postX, groundY, key).setOrigin(0.5, 1);
      this.postIsStrip = false;
      this.postTopY = groundY - h;
    }
    this.post.setInteractive({ useHandCursor: true }).on('pointerdown', () => onClick(contact));
  }

  /** Draws (or redraws, on `lang:change`) the sign lines once the pixel font exists. */
  drawSign(lang: Lang = this.lang): boolean {
    this.lang = lang;
    if (!registerPixelFont(this.scene)) return false;
    for (const t of this.signTexts) t.destroy();
    const [x, y, w, h] = this.signRect;
    const lines = [profile.name, ...profile.roles.map((r) => r[lang])];
    const blockH = lines.length * SIGN_LINE_H;
    let lineY = Math.round(y + (h - blockH) / 2) + 2;
    this.signTexts = lines.map((line, i) => {
      const t = this.scene.add
        .bitmapText(0, lineY, PIXEL_FONT, line, PIXEL_FONT_SIZE)
        .setTint(num(i === 0 ? 'amber-100' : 'paper-300'));
      t.setX(Math.round(x + (w - t.width) / 2));
      lineY += SIGN_LINE_H;
      return t;
    });
    this.thanks?.setText(ui.finaleThanks[lang]);
    return true;
  }

  /** The gate's card was resized for a layout mode (`Stations.signRect`): move the sign text. */
  setSignRect(rect: Rect): void {
    const [x, y, w, h] = this.signRect;
    if (rect[0] === x && rect[1] === y && rect[2] === w && rect[3] === h) return;
    this.signRect = rect;
    if (this.signTexts.length) this.drawSign();
  }

  /** Where the cue goes over the contact post (it has no text, so the cue carries the hint). */
  contactCueAnchor(): CueAnchor {
    return { x: this.postX, topY: this.postTopY, hint: 'above' };
  }

  setContactActive(active: boolean): void {
    if (this.postIsStrip) (this.post as Phaser.GameObjects.Sprite).setFrame(active ? 1 : 0);
  }

  /** Starts the intro once per session; returns false when it already played. */
  startIntro(pandaX: number, pandaTopY: number): boolean {
    const store = safeSessionStorage();
    try {
      if (store?.getItem(INTRO_KEY)) return false;
      store?.setItem(INTRO_KEY, '1');
    } catch {
      // Blocked storage: play it this time.
    }
    this.beat = 'sleep';
    this.beatMs = SLEEP_MS;
    if (registerPixelFont(this.scene)) {
      this.zees = this.scene.add
        .bitmapText(pandaX + 8, pandaTopY - 14, PIXEL_FONT, 'z Z', PIXEL_FONT_SIZE)
        .setTint(num('navy-200'));
    }
    return true;
  }

  /** Arriving at the lookout with everything visited plays the finale once per page view. */
  maybeFinale(): void {
    if (this.finalePlayed || !everythingVisited(readVisited(safeLocalStorage()))) return;
    this.finalePlayed = true;
    this.skip();
    this.beat = 'finale';
    this.beatMs = FINALE_MS;
    if (registerPixelFont(this.scene)) {
      this.thanks = this.scene.add
        .bitmapText(0, this.postTopY - 24, PIXEL_FONT, ui.finaleThanks[this.lang], PIXEL_FONT_SIZE)
        .setTint(num('amber-100'));
      this.thanks.setX(Math.round(this.postX - this.thanks.width / 2));
    }
    if (!prefersReducedMotion()) this.burst();
  }

  /** The pose for this frame; any manual input skips the intro (never the finale's text). */
  update(dtMs: number, manualInput: boolean): Pose {
    if (!this.beat) return null;
    if (manualInput && this.beat !== 'finale') {
      this.skip();
      return null;
    }
    this.beatMs -= dtMs;
    if (this.beatMs <= 0) {
      if (this.beat === 'sleep') {
        this.zees?.destroy();
        this.zees = null;
        this.beat = 'wave';
        this.beatMs = WAVE_MS;
      } else {
        this.beat = null;
        return null;
      }
    }
    return this.beat === 'sleep' ? null : 'wave';
  }

  private skip(): void {
    this.zees?.destroy();
    this.zees = null;
    this.beat = null;
  }

  /** A few palette squares rising from the post (code particles, no texture). */
  private burst(): void {
    const colors = ['scarlet-500', 'amber-400', 'amber-100', 'navy-200'] as const;
    for (let i = 0; i < 14; i++) {
      const sq = this.scene.add.rectangle(
        this.postX + ((i * 37) % 64) - 32,
        this.postTopY + 8,
        2,
        2,
        num(colors[i % colors.length]!)
      );
      this.scene.tweens.add({
        targets: sq,
        y: sq.y - 30 - ((i * 13) % 30),
        alpha: 0,
        duration: 900 + ((i * 97) % 600),
        onUpdate: () => sq.setY(Math.round(sq.y)),
        onComplete: () => sq.destroy(),
      });
    }
  }
}
