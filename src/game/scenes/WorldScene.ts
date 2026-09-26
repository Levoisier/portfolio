/**
 * The level from data (ARCHITECTURE.md → World model, Phase 4): ground and one-way platforms
 * built from `world/layout.ts`, the night→dawn sky and parallax layers, and zone tracking on
 * the bus. Phase 3's temporary flat ground and single test platform lived here before; see
 * LESSONS.md for what changed.
 */
import Phaser from 'phaser';
import { profile } from '../../content';
import { num } from '../../design/palette';
import { bus } from '../../shared/bus';
import { onReducedMotionChange, prefersReducedMotion } from '../../shared/motion';
import { DEBUG_STATS_MS, GROUND_Y, LAYOUT_STEP_HZ, PANDA_ART_H, WORLD_H, WORLD_W } from '../config';
import { REGISTRY_KEY, type GameContext } from '../context';
import { applyParallaxMotion, buildParallax, type ParallaxHandle } from '../fx/parallax';
import { SkyRenderer } from '../fx/sky';
import type { SourcedIntent } from '../input/intent';
import { KeyboardSource } from '../input/keyboard';
import { mergeIntents } from '../input/merge';
import { WheelWalker } from '../input/wheel';
import { PandaSprite } from '../player/PandaSprite';
import { FpsGuard, tierFlags } from '../quality';
import { follow, snapFollow, type FollowState } from '../render/follow';
import { RefreshMeter } from '../render/refresh';
import { Stations } from '../stations/Stations';
import { stationAt } from '../stations/trigger';
import { PIXEL_FONT, PIXEL_FONT_SIZE, registerPixelFont } from '../text/bitmap-font';
import { parseDeepLink } from '../travel/deep-link';
import { autoWalkStep, planWalk, type TravelPlan } from '../travel/plan';
import { WORLD_LAYOUT, zoneAt, type PlatformSize, type Station } from '../world/layout';

/** The 6 project stations only (BACKLOG.md Phase 5); the gate/vault/dossiers/blocks/contact
 * kinds have no panel yet — later phases build those without touching this filter. */
const PROJECT_STATIONS: Station[] = WORLD_LAYOUT.stations.filter((s) => s.kind === 'project');

const SPAWN_X = 160;
const FLOOR_ID = 'floor-plant';
const FLOOR_PLACEHOLDER = 'floor-placeholder';
const FLOOR_HEIGHT = 32;
const PLATFORMS_ID = 'platforms';
const PLATFORM_FRAME: Record<PlatformSize, string> = {
  s: 'platform-s',
  m: 'platform-m',
  l: 'platform-l',
};
const PLATFORM_FALLBACK_SIZE: Record<PlatformSize, { w: number; h: number }> = {
  s: { w: 48, h: 16 },
  m: { w: 80, h: 16 },
  l: { w: 128, h: 16 },
};
/** Full star field on the high tier; scaled by `tierFlags().particleScale` on low, and capped
 * further under `prefers-reduced-motion` (ARCHITECTURE.md → Motion preference: "particles
 * minimal"). */
const BASE_STAR_COUNT = 40;
const REDUCED_MOTION_STAR_CAP = 12;

export class WorldScene extends Phaser.Scene {
  private ctx!: GameContext;
  private panda!: PandaSprite;
  private sky!: SkyRenderer;
  private parallax!: ParallaxHandle;
  private label: Phaser.GameObjects.BitmapText | null = null;
  private fpsGuard = new FpsGuard();
  private refreshMeter = new RefreshMeter();
  private keyboard!: KeyboardSource;
  private wheel = new WheelWalker();
  private modalOpen = false;
  private followState: FollowState = { exact: 0, scrollX: 0, screenX: 0 };
  /** Physics steps taken this frame (`world.stepsLastFrame`), read before `postUpdate` clears it. */
  private stepsThisFrame = 0;
  private statsIn = 0;
  private zoneId = '';
  private stations!: Stations;
  private stationId: string | null = null;
  /** Click/tap-to-open (ARCHITECTURE.md → Input → Pointer/tap): a plain walk toward the clicked
   * station, cleared on arrival (then opened) or by any manual movement/jump/interact. */
  private travel: { plan: TravelPlan; stationId: string } | null = null;
  private cleanup: (() => void)[] = [];
  private groundBody!: Phaser.Physics.Arcade.StaticBody;

  constructor() {
    super('world');
  }

  create() {
    this.ctx = this.registry.get(REGISTRY_KEY) as GameContext;
    this.cameras.main.setBackgroundColor(num('navy-900'));
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this.buildGround();
    const platforms = this.buildPlatforms();
    this.stations = new Stations(this, PROJECT_STATIONS, this.ctx.manifest, GROUND_Y, (station) =>
      this.handleStationClick(station)
    );

    // Deep link (GAME_DESIGN.md → Deep links): `/#<id>` spawns at that station's x. An id with
    // no panel yet (gate/vault/dossier/block/contact) still resolves — `station:open` below is a
    // no-op until its phase adds the panel.
    const deepLink = parseDeepLink(
      location.hash,
      WORLD_LAYOUT.stations.map((s) => s.id)
    );
    const spawnStation = deepLink
      ? WORLD_LAYOUT.stations.find((s) => s.id === deepLink)
      : undefined;
    const spawnX = spawnStation?.x ?? SPAWN_X;

    this.panda = new PandaSprite(this, spawnX, GROUND_Y, this.ctx.manifest);
    this.ctx.pandaTexture = this.panda.textureKey;
    this.physics.add.collider(this.panda.sprite, this.groundBody);
    this.physics.add.collider(this.panda.sprite, platforms);

    this.sky = new SkyRenderer(this, WORLD_LAYOUT.zones, WORLD_LAYOUT.width, this.starCount());
    this.parallax = buildParallax(
      this,
      this.ctx.manifest,
      this.ctx.tier,
      WORLD_LAYOUT.width,
      GROUND_Y
    );
    applyParallaxMotion(this.parallax, prefersReducedMotion());

    this.keyboard = new KeyboardSource(this);
    this.cleanup.push(
      bus.on(
        'ui:modal',
        ({ open }) => {
          this.modalOpen = open;
          this.keyboard.setModal(open);
          this.wheel.reset();
        },
        { replay: true }
      ),
      bus.on('input:wheel', ({ deltaX, deltaY, deltaMode }) => {
        if (!this.modalOpen) this.wheel.push(deltaX, deltaY, deltaMode);
      }),
      bus.on('fonts:ready', () => this.addLabel(), { replay: true }),
      bus.on('tier:change', ({ tier }) => (this.ctx.tier = tier)),
      onReducedMotionChange((reduced) => applyParallaxMotion(this.parallax, reduced)),
      () => this.keyboard.destroy()
    );

    this.ctx.teleport = (x: number) => this.teleport(x);
    this.ctx.openStation = (id: string) => {
      const station = WORLD_LAYOUT.stations.find((s) => s.id === id);
      if (!station) return;
      this.teleport(station.x);
      this.openStation(id);
    };

    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);
      for (const off of this.cleanup) off();
    });
    this.layout();
    this.setZone(zoneAt(this.panda.sprite.x).id);
    this.setStation(stationAt(this.panda.sprite.x, PROJECT_STATIONS));
    this.sky.update(this.panda.sprite.x);
    this.updateDebugState();

    this.ctx.ready = true;
    bus.emit('game:ready', {});
    if (deepLink) this.openStation(deepLink);
  }

  update(_time: number, delta: number) {
    if (this.ctx.tier === 'high' && !this.ctx.tierPinned && this.fpsGuard.feed(delta)) {
      this.ctx.tier = 'low';
      bus.emit('tier:change', { tier: 'low' });
    }

    // Step Arcade at the real display refresh (ARCHITECTURE.md → Player) so 120/144 Hz screens
    // move the body every rendered frame instead of on alternate ones.
    const hz = this.refreshMeter.feed(this.game.loop.rawDelta);
    if (hz !== null) {
      this.physics.world.setFPS(hz);
      this.ctx.physicsHz = hz;
    }

    const keyboardIntent = this.keyboard.read();
    const wheelMoveX = this.wheel.update(delta);
    // Any manual input cancels an in-flight click-to-open walk (ARCHITECTURE.md → Input →
    // Pointer/tap): the player took over.
    if (
      this.travel &&
      (keyboardIntent.moveX !== 0 ||
        keyboardIntent.jumpPressed ||
        keyboardIntent.interactPressed ||
        wheelMoveX !== 0)
    ) {
      this.travel = null;
    }

    const sources: SourcedIntent[] = [
      { source: 'keyboard', intent: keyboardIntent },
      { source: 'wheel', intent: { moveX: wheelMoveX } },
    ];
    if (this.travel) {
      const step = autoWalkStep(this.panda.sprite.x, this.travel.plan);
      if (step) sources.push({ source: 'pointer', intent: step });
      else {
        const { stationId } = this.travel;
        this.travel = null;
        this.openStation(stationId);
      }
    }

    const intent = mergeIntents(sources, { modalOpen: this.modalOpen });
    if (intent.menuPressed) bus.emit('menu:open', {});
    if (intent.interactPressed && this.stationId) this.openStation(this.stationId);

    this.panda.update(intent, delta, this.modalOpen ? 'interact' : null);
    // Snapshot now: `world.postUpdate()` (already queued for this frame) resets it to 0.
    this.stepsThisFrame = this.physics.world.stepsLastFrame;

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
        zone: this.zoneId,
      });
    }
  }

  /** Runs after Arcade has synced the panda's sprite position from its body (POST_UPDATE fires
   * after the physics plugin's own listener, registered when the scene booted, ahead of ours). */
  private onPostUpdate() {
    const stepMs = 1000 / (this.ctx.physicsHz || LAYOUT_STEP_HZ);
    this.followState = follow(this.followState, {
      targetX: this.panda.sprite.x,
      facing: this.panda.facing,
      viewW: this.scale.width,
      worldW: WORLD_W,
      dtMs: this.stepsThisFrame * stepMs,
    });
    this.applyCamera();
    this.setZone(zoneAt(this.panda.sprite.x).id);
    this.setStation(stationAt(this.panda.sprite.x, PROJECT_STATIONS));
    this.sky.update(this.panda.sprite.x);
    if (this.ctx.debug) this.updateDebugState();
  }

  /** Click/tap the prop (ARCHITECTURE.md → Input → Pointer/tap): open now if already in its
   * trigger, else start a basic walk-to-x that opens it on arrival (`update()` drives the plan). */
  private handleStationClick(station: Station): void {
    if (this.modalOpen) return;
    if (this.stationId === station.id) {
      this.openStation(station.id);
      return;
    }
    this.travel = { plan: planWalk(this.panda.sprite.x, station.x), stationId: station.id };
  }

  /** Only the bus knows what happens next (AGENTS.md Golden Rule 7): the UI opens the matching
   * DOM panel (if one exists yet) and flips `ui:modal`, which is what actually pauses input and
   * poses the panda — this is a no-op here for a station id with no panel (Phase 7–10 add more). */
  private openStation(id: string): void {
    bus.emit('station:open', { id });
  }

  /** Debug hook only (`window.__PORTFOLIO__.teleport`, also used by `openStation`): feet on the
   * ground, camera snapped, any pending click-to-open walk cancelled. */
  private teleport(x: number): void {
    this.travel = null;
    this.panda.teleportTo(x, GROUND_Y);
    this.followState = snapFollow({
      targetX: x,
      facing: this.panda.facing,
      viewW: this.scale.width,
      worldW: WORLD_W,
    });
    this.applyCamera();
    this.setZone(zoneAt(x).id);
    this.setStation(stationAt(x, PROJECT_STATIONS));
    this.sky.update(x);
    this.updateDebugState();
  }

  private applyCamera(): void {
    this.cameras.main.scrollX = this.followState.scrollX;
    this.ctx.camera = { scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY };
  }

  /** Emits `zone:enter` (ARCHITECTURE.md → bus contract) and updates the debug hook only when
   * the zone actually changed. */
  private setZone(id: string): void {
    if (id === this.zoneId) return;
    this.zoneId = id;
    this.ctx.zone = id;
    bus.emit('zone:enter', { id });
  }

  /** Emits `station:enter`/`station:leave` only on an actual change (ARCHITECTURE.md → Stations
   * & panels) and keeps the canvas glyph in sync — hidden while a panel/menu is open, since the
   * prompt no longer applies once the player has already opened it. */
  private setStation(id: string | null): void {
    if (id !== this.stationId) {
      if (this.stationId) bus.emit('station:leave', { id: this.stationId });
      this.stationId = id;
      if (id) bus.emit('station:enter', { id });
    }
    this.stations.setActive(this.modalOpen ? null : this.stationId);
  }

  private starCount(): number {
    const scaled = Math.round(BASE_STAR_COUNT * tierFlags(this.ctx.tier).particleScale);
    return prefersReducedMotion() ? Math.min(scaled, REDUCED_MOTION_STAR_CAP) : scaled;
  }

  private updateDebugState(): void {
    const body = this.panda.sprite.body;
    this.ctx.player = {
      x: this.panda.sprite.x,
      y: this.panda.sprite.y,
      vx: body.velocity.x,
      vy: body.velocity.y,
      state: this.panda.stateName,
      anim: this.panda.animKey,
      frame: this.panda.frameName,
      flipX: this.panda.sprite.flipX,
      grounded: body.blocked.down || body.touching.down,
    };
  }

  /** Ground: a `floor-plant` strip tiled across the world, `ink-900` filling the rest, one solid
   * collider. */
  private buildGround(): void {
    const key = this.textures.exists(FLOOR_ID) ? FLOOR_ID : ensureFloorPlaceholder(this);
    this.add.tileSprite(0, GROUND_Y, WORLD_W, FLOOR_HEIGHT, key).setOrigin(0, 0);
    this.add
      .rectangle(
        0,
        GROUND_Y + FLOOR_HEIGHT,
        WORLD_W,
        WORLD_H - (GROUND_Y + FLOOR_HEIGHT),
        num('ink-900')
      )
      .setOrigin(0, 0);
    this.groundBody = this.physics.add.staticBody(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
  }

  /** One-way platforms from `world/layout.ts` (currently the Reagent lab's 8 block platforms):
   * only their top face collides. */
  private buildPlatforms(): Phaser.Types.Physics.Arcade.ImageWithStaticBody[] {
    return WORLD_LAYOUT.platforms.map((p) => {
      const frame = PLATFORM_FRAME[p.size];
      const size = this.platformSize(p.size);
      const image = this.textures.exists(PLATFORMS_ID)
        ? this.physics.add
            .staticImage(p.x, p.y, PLATFORMS_ID, frame)
            .setOrigin(0.5, 0)
            .refreshBody()
        : this.physics.add
            .staticImage(p.x, p.y, ensurePlatformPlaceholder(this, size, p.size))
            .setOrigin(0.5, 0)
            .refreshBody();
      const body = image.body;
      body.setSize(size.w, size.h, false);
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      return image;
    });
  }

  private platformSize(size: PlatformSize): { w: number; h: number } {
    const asset = this.ctx.manifest?.assets[PLATFORMS_ID];
    const item =
      asset && asset.source !== 'missing' && asset.kind === 'set'
        ? asset.items[PLATFORM_FRAME[size]]
        : undefined;
    return item ?? PLATFORM_FALLBACK_SIZE[size];
  }

  private addLabel(): void {
    if (this.label || !registerPixelFont(this)) return;
    this.label = this.add
      .bitmapText(0, GROUND_Y - PANDA_ART_H - 24, PIXEL_FONT, profile.name, PIXEL_FONT_SIZE)
      .setTint(num('paper-100'));
    this.label.setX(Math.floor(SPAWN_X - this.label.width / 2));
    this.ctx.pixelFont = true;
  }

  /** Integer positions only: camera size + bottom anchoring (ARCHITECTURE.md → Camera). */
  private layout(): void {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    cam.setSize(width, height);
    cam.setBounds(0, WORLD_H - height, WORLD_W, height);
    cam.scrollY = WORLD_H - height;
    this.sky.resize(width, height);
    if (this.panda) {
      this.followState = snapFollow({
        targetX: this.panda.sprite.x,
        facing: this.panda.facing,
        viewW: width,
        worldW: WORLD_W,
      });
      this.applyCamera();
    }
  }
}

/** `floor-plant`'s documented placeholder (ARCHITECTURE.md → Asset pipeline): `ink-700` with a
 * 2-px `paper-500` top edge, tiled the same as the real strip. */
function ensureFloorPlaceholder(scene: Phaser.Scene): string {
  if (!scene.textures.exists(FLOOR_PLACEHOLDER)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(num('ink-700')).fillRect(0, 0, 256, FLOOR_HEIGHT);
    g.fillStyle(num('paper-500')).fillRect(0, 0, 256, 2);
    g.generateTexture(FLOOR_PLACEHOLDER, 256, FLOOR_HEIGHT);
    g.destroy();
  }
  return FLOOR_PLACEHOLDER;
}

/** A set item's documented placeholder: its `size` box in `navy-700` with a `navy-400` outline. */
function ensurePlatformPlaceholder(
  scene: Phaser.Scene,
  size: { w: number; h: number },
  sizeKey: PlatformSize
): string {
  const key = `platform-placeholder-${sizeKey}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(num('navy-700')).fillRect(0, 0, size.w, size.h);
    g.lineStyle(1, num('navy-400')).strokeRect(0.5, 0.5, size.w - 1, size.h - 1);
    g.generateTexture(key, size.w, size.h);
    g.destroy();
  }
  return key;
}
