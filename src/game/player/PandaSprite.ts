/**
 * Phaser adapter around the pure player state machine (ARCHITECTURE.md → Player). It builds
 * animations from the resolved runtime manifest (never `art/manifest.json`), copies `logic.ts`'s
 * output onto the Arcade body every frame, and reasserts the fixed collision box so a frame
 * change can never move it. The machine itself never touches Phaser.
 */
import type Phaser from 'phaser';
import type { RuntimeManifest } from '../../assets/runtime';
import { num } from '../../design/palette';
import { bus } from '../../shared/bus';
import {
  CELL,
  CELL_BASELINE,
  PANDA_ART_H,
  PLAYER_BODY,
  PLAYER_BODY_OFFSET,
  RUN_SPEED,
  WALK_SPEED,
} from '../config';
import type { Intent } from '../input/intent';
import { ANIM, initialPlayerState, step } from './logic';
import type { AirFrame, BodyReport, Pose } from './types';

const PLACEHOLDER_KEY = 'panda-placeholder';
/** The rest pose holds this long after any action before the idle loop (the breath) starts, so
 * a quick stop-and-go or a landing settles on the standing frame instead of a breath. */
const IDLE_LOOP_DELAY_MS = 250;

/** Air-strip frames this module plays (`crouch` is unused — ARCHITECTURE.md → Player). */
const AIR_FRAME_ORDER: readonly AirFrame[] = ['takeoff', 'rise', 'apex', 'fall', 'land'];

/** Fallback frame index when `panda-air` has no (or an incomplete) `frameNames` list. */
const AIR_FRAME_FALLBACK: Record<AirFrame, number> = {
  takeoff: 1,
  rise: 2,
  apex: 3,
  fall: 4,
  land: 5,
};

export class PandaSprite {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  /** The texture actually in use: `panda-idle`, or the code-drawn placeholder (no manifest). */
  readonly textureKey: string;

  private state = initialPlayerState(1);
  private readonly usingPlaceholder: boolean;
  private readonly hasRun: boolean;
  /** Animations built from real art (raw or reference) — see `buildAnim`. */
  private readonly built = new Set<string>();
  private readonly hasAir: boolean;
  private readonly airFrames: Record<AirFrame, number>;
  private currentAnim = '';
  private currentAirFrame = -1;
  /** True until the next `update()`: Arcade reports `blocked.down = false` before its first
   * physics step, so a panda spawned (or teleported) onto the ground would otherwise flash an
   * air frame (ARCHITECTURE.md → Testing strategy / the player-logic implementer's notes). */
  private forceGrounded = true;
  private lastAnim: string = ANIM.idle;
  /** Whether `panda-idle` loops (the breath); without real art idle holds frame 0 still. */
  private readonly idleLoops: boolean;
  private idleMs = 0;
  private lastFrame: AirFrame | undefined;

  constructor(scene: Phaser.Scene, x: number, y: number, manifest: RuntimeManifest | null) {
    this.usingPlaceholder = !scene.textures.exists(ANIM.idle);
    const key = this.usingPlaceholder ? ensurePlaceholder(scene) : ANIM.idle;
    this.textureKey = key;
    this.sprite = scene.physics.add.sprite(x, y, key);
    this.sprite.setOrigin(0.5, CELL_BASELINE / CELL).setVertexRoundMode('full');
    this.sprite.setCollideWorldBounds(true);
    this.lockBody();

    this.hasRun = !this.usingPlaceholder && this.buildAnim(scene, ANIM.run, manifest);
    this.idleLoops = !this.usingPlaceholder && this.buildAnim(scene, ANIM.idle, manifest);
    if (!this.usingPlaceholder) {
      this.buildAnim(scene, ANIM.walk, manifest);
      this.buildAnim(scene, ANIM.interact, manifest);
      this.buildAnim(scene, ANIM.wave, manifest);
    }
    this.hasAir = !this.usingPlaceholder && scene.textures.exists(ANIM.air);
    this.airFrames = resolveAirFrames(manifest, this.hasAir);
    this.restPose();
  }

  get facing(): -1 | 1 {
    return this.state.facing;
  }

  get stateName(): string {
    return this.state.name;
  }

  get animKey(): string {
    return this.lastAnim;
  }

  get frameName(): AirFrame | undefined {
    return this.lastFrame;
  }

  /**
   * One frame: read what the body reports, run the pure machine, apply its output
   * (ARCHITECTURE.md → Player; the input implementer's integration notes).
   */
  update(intent: Intent, dtMs: number, pose: Pose = null): void {
    const body = this.sprite.body;
    const report: BodyReport = {
      grounded: this.forceGrounded || body.blocked.down || body.touching.down,
      vy: body.velocity.y,
      blockedUp: body.blocked.up || body.touching.up,
    };
    this.forceGrounded = false;

    const result = step(this.state, intent, dtMs, report, pose);
    this.state = result.state;
    this.lastAnim = result.anim;
    this.lastFrame = result.frame;

    body.velocity.x = result.vx;
    if (result.vy !== null) body.velocity.y = result.vy;
    if (result.state.sinceJump === 0) bus.emit('sfx', { name: 'jump' });

    this.applyAnim(result.anim, result.frame, dtMs);
    this.sprite.setFlipX(result.flipX);
    this.lockBody();
  }

  /** Debug hook only (`teleport(x)`): feet on the ground, zero velocity, machine reset. */
  teleportTo(x: number, groundY: number): void {
    const body = this.sprite.body;
    this.sprite.setPosition(x, groundY);
    body.reset(x, groundY);
    body.velocity.set(0, 0);
    this.state = initialPlayerState(this.state.facing);
    this.lastAnim = ANIM.idle;
    this.lastFrame = undefined;
    this.forceGrounded = true;
    this.restPose();
    this.lockBody();
  }

  /** Every action ends here: the standing frame (idle's frame 0), with the idle loop — when
   * there is real art for it — starting after `IDLE_LOOP_DELAY_MS`. */
  private restPose(): void {
    if (this.usingPlaceholder) return;
    this.sprite.anims.stop();
    this.sprite.anims.timeScale = 1;
    this.sprite.setTexture(ANIM.idle, 0);
    this.currentAnim = ANIM.idle;
    this.currentAirFrame = -1;
    this.idleMs = 0;
  }

  /** `panda-air` is never played by fps — it is set to the named frame every step. Everything
   * else is a normal loop; `panda-run` falls back to `panda-walk` sped up when it is missing, and
   * a pose with no real art (a placeholder `panda-wave`/`panda-interact`) shows the idle. */
  private applyAnim(anim: string, frame: AirFrame | undefined, dtMs: number): void {
    if (this.usingPlaceholder) return;

    if (anim === ANIM.air) {
      if (!this.hasAir) return;
      const index = frame ? this.airFrames[frame] : 0;
      if (this.currentAnim !== ANIM.air) {
        this.sprite.anims.stop();
        this.sprite.setTexture(ANIM.air);
        this.currentAnim = ANIM.air;
        this.currentAirFrame = -1;
      }
      if (this.currentAirFrame !== index) {
        this.sprite.setFrame(index);
        this.currentAirFrame = index;
      }
      return;
    }

    let key = anim;
    let timeScale = 1;
    if (anim === ANIM.run && !this.hasRun) {
      key = ANIM.walk;
      timeScale = RUN_SPEED / WALK_SPEED;
    }
    if (!this.built.has(key)) key = ANIM.idle;

    if (key === ANIM.idle) {
      if (this.currentAnim !== ANIM.idle) this.restPose();
      else if (this.idleLoops && !this.sprite.anims.isPlaying) {
        this.idleMs += dtMs;
        if (this.idleMs >= IDLE_LOOP_DELAY_MS) this.sprite.play(ANIM.idle);
      }
      return;
    }

    if (this.currentAnim !== key) {
      this.sprite.play(key);
      this.currentAnim = key;
    }
    this.sprite.anims.timeScale = timeScale;
  }

  /**
   * Builds `key`'s animation from the resolved manifest strip, if both exist and it is real art.
   * A pipeline placeholder (a grey box) is never played on the panda. Returns whether it built —
   * `applyAnim` only plays what is in `built` (the `panda-run` fallback and missing poses rely on
   * it). Animations live on the scene's global manager: `sprite.anims.exists()` only sees
   * animations local to the sprite, so it is not a usable check here (LESSONS.md).
   */
  private buildAnim(scene: Phaser.Scene, key: string, manifest: RuntimeManifest | null): boolean {
    if (!scene.textures.exists(key)) return false;
    const asset = manifest?.assets[key];
    if (!asset || asset.kind !== 'strip') return false;
    if (asset.source === 'missing' || asset.source === 'placeholder') return false;
    if (!scene.anims.exists(key))
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: asset.frames - 1 }),
        frameRate: asset.fps,
        repeat: asset.loop ? -1 : 0,
      });
    this.built.add(key);
    return true;
  }

  /** Guards Golden Rule 6 / ARCHITECTURE.md → Player: every frame is 64×64, but a frame change
   * (`setFrame`/`setTexture`) can still touch the body's size or offset — reassert both. */
  private lockBody(): void {
    const body = this.sprite.body;
    body.setSize(PLAYER_BODY.w, PLAYER_BODY.h, false);
    body.setOffset(PLAYER_BODY_OFFSET.x, PLAYER_BODY_OFFSET.y);
  }
}

/** The code-drawn 64×64 placeholder (no manifest): a rounded ink box, no animation. */
function ensurePlaceholder(scene: Phaser.Scene): string {
  if (!scene.textures.exists(PLACEHOLDER_KEY)) {
    const w = Math.round(PANDA_ART_H * 0.7);
    const x = (CELL - w) / 2;
    const y = CELL_BASELINE - PANDA_ART_H;
    const g = scene.make.graphics({}, false);
    g.fillStyle(num('ink-900')).fillRect(x, y, w, PANDA_ART_H);
    g.fillStyle(num('ink-700')).fillRect(x + 1, y + 1, w - 2, PANDA_ART_H - 2);
    g.fillStyle(num('scarlet-500')).fillRect(x + 2, y + 2, 2, 2);
    g.generateTexture(PLACEHOLDER_KEY, CELL, CELL);
    g.destroy();
  }
  return PLACEHOLDER_KEY;
}

function resolveAirFrames(
  manifest: RuntimeManifest | null,
  hasAir: boolean
): Record<AirFrame, number> {
  const asset = hasAir ? manifest?.assets[ANIM.air] : undefined;
  const strip = asset && asset.source !== 'missing' && asset.kind === 'strip' ? asset : undefined;
  const max = Math.max(0, (strip?.frames ?? 6) - 1);
  const clamp = (i: number) => Math.min(Math.max(i, 0), max);
  const frames = {} as Record<AirFrame, number>;
  for (const name of AIR_FRAME_ORDER) {
    const named = strip?.frameNames?.indexOf(name) ?? -1;
    frames[name] = clamp(named >= 0 ? named : AIR_FRAME_FALLBACK[name]);
  }
  return frames;
}
