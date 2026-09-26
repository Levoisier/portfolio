/**
 * Phase 2: an empty world — navy-900, the panda's idle loop (or a code-drawn placeholder when
 * there is no manifest) and one in-world pixel-text label. Phase 3+ builds the level here.
 */
import Phaser from 'phaser';
import { profile } from '../../content';
import { num } from '../../design/palette';
import { bus } from '../../shared/bus';
import { CELL, CELL_BASELINE, DEBUG_STATS_MS, PANDA_ART_H } from '../config';
import { REGISTRY_KEY, type GameContext } from '../context';
import { FpsGuard } from '../quality';
import { PIXEL_FONT, PIXEL_FONT_SIZE, registerPixelFont } from '../text/bitmap-font';

const PANDA_IDLE = 'panda-idle';
const PANDA_PLACEHOLDER = 'panda-placeholder';

export class WorldScene extends Phaser.Scene {
  private ctx!: GameContext;
  private panda!: Phaser.GameObjects.Sprite;
  private label: Phaser.GameObjects.BitmapText | null = null;
  private fpsGuard = new FpsGuard();
  private statsIn = 0;
  private cleanup: (() => void)[] = [];

  constructor() {
    super('world');
  }

  create() {
    this.ctx = this.registry.get(REGISTRY_KEY) as GameContext;
    this.cameras.main.setBackgroundColor(num('navy-900'));

    this.panda = this.add.sprite(0, 0, this.pandaTexture());
    this.panda.setOrigin(0.5, CELL_BASELINE / CELL).setVertexRoundMode('full');
    if (this.anims.exists(PANDA_IDLE)) this.panda.play(PANDA_IDLE);

    this.cleanup.push(
      bus.on('fonts:ready', () => this.addLabel(), { replay: true }),
      bus.on('tier:change', ({ tier }) => (this.ctx.tier = tier))
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      for (const off of this.cleanup) off();
    });
    this.layout();

    this.ctx.ready = true;
    bus.emit('game:ready', {});
  }

  update(_time: number, delta: number) {
    if (this.ctx.tier === 'high' && !this.ctx.tierPinned && this.fpsGuard.feed(delta)) {
      this.ctx.tier = 'low';
      bus.emit('tier:change', { tier: 'low' });
    }
    if (this.ctx.debug && (this.statsIn -= delta) <= 0) {
      this.statsIn = DEBUG_STATS_MS;
      const v = this.ctx.viewport;
      bus.emit('debug:stats', {
        fps: Math.round(this.game.loop.actualFps),
        zoom: v.zoom,
        dpr: this.ctx.dpr,
        viewW: v.backingW,
        viewH: v.backingH,
        tier: this.ctx.tier,
        mode: this.ctx.mode,
      });
    }
  }

  /** The interim/real idle strip when loaded, else a 64×64 box drawn in code. */
  private pandaTexture(): string {
    const strip = this.ctx.manifest?.assets[PANDA_IDLE];
    if (strip?.kind === 'strip' && strip.source !== 'missing' && this.textures.exists(PANDA_IDLE)) {
      if (!this.anims.exists(PANDA_IDLE))
        this.anims.create({
          key: PANDA_IDLE,
          frames: this.anims.generateFrameNumbers(PANDA_IDLE, { start: 0, end: strip.frames - 1 }),
          frameRate: strip.fps,
          repeat: strip.loop ? -1 : 0,
        });
      return (this.ctx.pandaTexture = PANDA_IDLE);
    }
    if (!this.textures.exists(PANDA_PLACEHOLDER)) {
      const w = Math.round(PANDA_ART_H * 0.7);
      const x = (CELL - w) / 2;
      const y = CELL_BASELINE - PANDA_ART_H;
      const g = this.make.graphics({}, false);
      g.fillStyle(num('ink-900')).fillRect(x, y, w, PANDA_ART_H);
      g.fillStyle(num('ink-700')).fillRect(x + 1, y + 1, w - 2, PANDA_ART_H - 2);
      g.fillStyle(num('scarlet-500')).fillRect(x + 2, y + 2, 2, 2);
      g.generateTexture(PANDA_PLACEHOLDER, CELL, CELL);
      g.destroy();
    }
    return (this.ctx.pandaTexture = PANDA_PLACEHOLDER);
  }

  private addLabel() {
    if (this.label || !registerPixelFont(this)) return;
    this.label = this.add
      .bitmapText(0, 0, PIXEL_FONT, profile.name, PIXEL_FONT_SIZE)
      .setTint(num('paper-100'));
    this.ctx.pixelFont = true;
    this.layout();
  }

  /** Integer positions only: the panda stands at 3/4 of the view, the label above it. */
  private layout() {
    const { width, height } = this.scale;
    this.cameras.main.setSize(width, height);
    const x = Math.floor(width / 2);
    const feet = Math.floor(height * 0.75);
    this.panda.setPosition(x, feet);
    this.label?.setPosition(Math.floor(x - this.label.width / 2), feet - PANDA_ART_H - 24);
  }
}
