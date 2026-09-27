/**
 * Tiered ambience (BACKLOG.md Phase 11 — GAME_DESIGN.md → Ambience tiers): drifting ember/dust
 * particles (code-generated palette squares), the bubbling flask in the lab, and a glow on the
 * lamp posts on the high tier only. Reduced motion stops the particles and the flask loop.
 * The optional `flare-flame` (high tier) is not placed yet: `bg-far` tiles, so its flare anchor
 * repeats per tile and needs per-tile flames — left for when the art exists.
 */
import type Phaser from 'phaser';
import type { RuntimeManifest } from '../../assets/runtime';
import { num } from '../../design/palette';
import { GROUND_Y } from '../config';
import { tierFlags, type Tier } from '../quality';
import { WORLD_LAYOUT } from '../world/layout';

const EMBER_KEY = 'fx-ember';
const FLASK_ID = 'flask-bubbling';
const FLASK_X = 3924;
/** ms between ember spawns at particleScale 1 (the high tier). */
const EMBER_EVERY_MS = 70;

export class Ambience {
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly flask: Phaser.GameObjects.Sprite | null = null;
  private readonly lamps: Phaser.GameObjects.Image[];

  constructor(
    scene: Phaser.Scene,
    manifest: RuntimeManifest | null,
    props: Map<string, Phaser.GameObjects.Image>,
    tier: Tier,
    reducedMotion: boolean
  ) {
    if (!scene.textures.exists(EMBER_KEY)) {
      const g = scene.make.graphics({}, false);
      g.fillStyle(num('amber-400')).fillRect(0, 0, 1, 1);
      g.generateTexture(EMBER_KEY, 1, 1);
      g.destroy();
    }
    this.embers = scene.add.particles(0, 0, EMBER_KEY, {
      x: { min: 0, max: WORLD_LAYOUT.width },
      y: { min: GROUND_Y - 140, max: GROUND_Y - 4 },
      lifespan: { min: 2500, max: 5000 },
      speedX: { min: -4, max: 4 },
      speedY: { min: -14, max: -4 },
      alpha: { start: 0.9, end: 0 },
      frequency: EMBER_EVERY_MS,
      quantity: 1,
    });

    const flask = manifest?.assets[FLASK_ID];
    if (
      flask &&
      flask.source !== 'missing' &&
      flask.kind === 'strip' &&
      scene.textures.exists(FLASK_ID)
    ) {
      if (!scene.anims.exists(FLASK_ID)) {
        scene.anims.create({
          key: FLASK_ID,
          frames: scene.anims.generateFrameNumbers(FLASK_ID, { start: 0, end: flask.frames - 1 }),
          frameRate: flask.fps,
          repeat: -1,
        });
      }
      this.flask = scene.add
        .sprite(FLASK_X, GROUND_Y, FLASK_ID, 0)
        .setOrigin(0.5, flask.baseline / flask.frameHeight);
    }

    this.lamps = [...props.entries()].filter(([id]) => id.endsWith('-lamp')).map(([, img]) => img);
    this.refresh(tier, reducedMotion);
  }

  /** Re-applies the tier (runtime downgrade) and the motion preference. */
  refresh(tier: Tier, reducedMotion: boolean): void {
    const flags = tierFlags(tier);
    if (reducedMotion) this.embers.stop();
    else {
      this.embers.setFrequency(Math.round(EMBER_EVERY_MS / flags.particleScale));
      if (!this.embers.emitting) this.embers.start();
    }
    if (this.flask) {
      if (reducedMotion) this.flask.stop().setFrame(0);
      else if (!this.flask.anims.isPlaying) this.flask.play(FLASK_ID);
    }
    for (const lamp of this.lamps) {
      if (flags.filters && !reducedMotion) {
        if (!lamp.filters) lamp.enableFilters();
        if (lamp.filters && lamp.filters.internal.getActive().length === 0)
          lamp.filters.internal.addGlow(num('amber-100'), 2, 0);
      } else lamp.filters?.internal.clear();
    }
  }
}
