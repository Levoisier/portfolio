/**
 * Classified wing ambience (BACKLOG.md Phase 8 — GAME_DESIGN.md → Classified wing): the
 * `CLASIFICADO / CLASSIFIED` sign (drawn in code once the pixel font is ready, ARCHITECTURE.md →
 * Rendering contract → _In-world text_), the wing's ambient light shifting toward scarlet once
 * the vault opens, the high-tier-only sweeping scanner light, and the warning beacons' blink.
 * Like `sky.ts`/`parallax.ts`, this only ever calls methods on the `Phaser.Scene`/objects it is
 * handed, never a runtime `import 'phaser'`.
 */
import type Phaser from 'phaser';
import { num } from '../../design/palette';
import { prefersReducedMotion } from '../../shared/motion';
import { ui } from '../../i18n/ui';
import type { Tier } from '../quality';
import { PIXEL_FONT, PIXEL_FONT_SIZE, registerPixelFont } from '../text/bitmap-font';

/** How dark-scarlet the wing's ambient overlay gets once the vault has opened. */
const SCARLET_LIGHT_ALPHA = 0.16;
const LIGHT_SHIFT_MS = 600;
/** The sign plate, above the vault, and its padding around the bitmap text. */
const SIGN_Y_ABOVE_GROUND = 190;
const SIGN_PAD_X = 8;
const SIGN_PAD_Y = 6;
/** The scanner beam: width, world-space extent inside the wing, sweep duration. */
const SCANNER_W = 24;
const SCANNER_MARGIN = 40;
const SCANNER_MS = 4000;
const BEACON_BLINK_MS = 700;

export class ClassifiedWing {
  private readonly scene: Phaser.Scene;
  private readonly zoneX0: number;
  private readonly zoneX1: number;
  private readonly groundY: number;
  private readonly signX: number;
  private readonly lightOverlay: Phaser.GameObjects.Rectangle;
  private signDrawn = false;
  private scanBeam: Phaser.GameObjects.Rectangle | null = null;
  private scanTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    zoneX0: number,
    zoneX1: number,
    groundY: number,
    signX: number,
    tier: Tier
  ) {
    this.scene = scene;
    this.zoneX0 = zoneX0;
    this.zoneX1 = zoneX1;
    this.groundY = groundY;
    this.signX = signX;
    this.lightOverlay = scene.add
      .rectangle(zoneX0, 0, zoneX1 - zoneX0, groundY, num('scarlet-700'), 0)
      .setOrigin(0, 0)
      .setDepth(-50);
    this.refresh(tier, prefersReducedMotion());
  }

  /** The `CLASIFICADO / CLASSIFIED` plate + text (a fixed bilingual placard, ARCHITECTURE.md →
   * i18n — it never re-renders on `lang:change`). Safe to call before the pixel font is ready
   * (a no-op until `fonts:ready`); idempotent once drawn. */
  drawSign(): void {
    if (this.signDrawn || !registerPixelFont(this.scene)) return;
    this.signDrawn = true;
    const text = this.scene.add
      .bitmapText(0, 0, PIXEL_FONT, ui.classifiedSign.es, PIXEL_FONT_SIZE)
      .setTint(num('paper-100'))
      .setDepth(1);
    const plateW = Math.round(text.width) + SIGN_PAD_X * 2;
    const plateH = Math.round(text.height) + SIGN_PAD_Y * 2;
    const plateY = this.groundY - SIGN_Y_ABOVE_GROUND - plateH;
    const plateX = Math.round(this.signX - plateW / 2);
    this.scene.add
      .rectangle(plateX, plateY, plateW, plateH, num('ink-900'))
      .setOrigin(0, 0)
      .setStrokeStyle(1, num('scarlet-500'))
      .setDepth(0);
    text.setPosition(plateX + SIGN_PAD_X, plateY + SIGN_PAD_Y);
  }

  /** Tweens the wing's ambient overlay toward scarlet (instant under reduced motion) — called
   * once, when the vault opens (`WorldScene.openStation`). Idempotent in effect: a second call
   * re-tweens to the same alpha, which is visually a no-op. */
  shiftLightToScarlet(): void {
    if (prefersReducedMotion()) {
      this.lightOverlay.setAlpha(SCARLET_LIGHT_ALPHA);
      return;
    }
    this.scene.tweens.add({
      targets: this.lightOverlay,
      alpha: SCARLET_LIGHT_ALPHA,
      duration: LIGHT_SHIFT_MS,
      ease: 'Sine.easeOut',
    });
  }

  /** Builds or tears down the sweeping scanner beam so it always matches the current tier/motion
   * preference (BACKLOG.md Phase 8: "Scanner light sweep on the high tier only"; continuous
   * back-and-forth motion is skipped under reduced motion, the same spirit as parallax/particles
   * easing back). Call again whenever either input changes (`tier:change`, reduced-motion). */
  refresh(tier: Tier, reducedMotion: boolean): void {
    const shouldShow = tier === 'high' && !reducedMotion;
    if (shouldShow === (this.scanBeam !== null)) return;
    if (shouldShow) {
      this.scanBeam = this.scene.add
        .rectangle(
          this.zoneX0 + SCANNER_MARGIN,
          0,
          SCANNER_W,
          this.groundY,
          num('scarlet-300'),
          0.06
        )
        .setOrigin(0.5, 0)
        .setDepth(-55);
      this.scanTween = this.scene.tweens.add({
        targets: this.scanBeam,
        x: this.zoneX1 - SCANNER_MARGIN,
        duration: SCANNER_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.scanTween?.stop();
      this.scanTween = null;
      this.scanBeam?.destroy();
      this.scanBeam = null;
    }
  }
}

/** The wing's warning beacons blink regardless of tier (a single cheap tween each) — every image
 * keyed `classified-beacon-*` by `world/props.ts`'s `buildProps`. */
export function blinkBeacons(
  scene: Phaser.Scene,
  images: ReadonlyMap<string, Phaser.GameObjects.Image>
): void {
  for (const [id, image] of images) {
    if (!id.startsWith('classified-beacon')) continue;
    scene.tweens.add({
      targets: image,
      alpha: { from: 1, to: 0.35 },
      duration: BEACON_BLINK_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
