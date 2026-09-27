/**
 * The level from data (ARCHITECTURE.md → World model, Phase 4): ground and one-way platforms
 * built from `world/layout.ts`, the night→dawn sky and parallax layers, and zone tracking on
 * the bus. Phase 3's temporary flat ground and single test platform lived here before; see
 * LESSONS.md for what changed.
 */
import Phaser from 'phaser';
import { DEFAULT_LANG } from '../../i18n/lang';
import { num, rgbChannels } from '../../design/palette';
import { bus } from '../../shared/bus';
import { onReducedMotionChange, prefersReducedMotion } from '../../shared/motion';
import {
  DEBUG_STATS_MS,
  FADE_TRAVEL_MS,
  GROUND_Y,
  LAYOUT_STEP_HZ,
  PANDA_ART_H,
  WORLD_H,
  WORLD_W,
} from '../config';
import { REGISTRY_KEY, type GameContext } from '../context';
import { applyParallaxMotion, buildParallax, type ParallaxHandle } from '../fx/parallax';
import { blinkBeacons, ClassifiedWing } from '../fx/classified';
import { SkyRenderer } from '../fx/sky';
import type { SourcedIntent } from '../input/intent';
import { KeyboardSource } from '../input/keyboard';
import { mergeIntents } from '../input/merge';
import { TouchPadState } from '../input/touch';
import { WheelWalker } from '../input/wheel';
import { PandaSprite } from '../player/PandaSprite';
import { FpsGuard, tierFlags } from '../quality';
import { follow, snapFollow, type FollowState } from '../render/follow';
import { RefreshMeter } from '../render/refresh';
import { Skills } from '../stations/Skills';
import { bumpedBlock } from '../stations/skills-logic';
import { Stations } from '../stations/Stations';
import { Story } from '../stations/Story';
import { stationAt } from '../stations/trigger';
import { Vault } from '../stations/Vault';
import { parseDeepLink } from '../travel/deep-link';
import {
  autoWalkStep,
  planFastTravel,
  planWalk,
  shouldFadeTravel,
  travelTargetX,
  type TravelPlan,
} from '../travel/plan';
import { buildProps } from '../world/props';
import { WORLD_LAYOUT, zoneAt, type PlatformSize, type Station } from '../world/layout';

/** Stations rendered by the generic single-sprite adapter (BACKLOG.md Phase 5's 6 project
 * stations, plus Phase 8's 4 dossier stands — `confidential-dossier` is a `sprite` asset too);
 * the gate/blocks/contact kinds have no panel yet — later phases build those without touching
 * this filter. The vault (`kind: 'vault'`) is a different shape (`stations/Vault.ts`, below). */
const INTERACTIVE_STATIONS: Station[] = WORLD_LAYOUT.stations.filter(
  (s) => s.kind === 'gate' || s.kind === 'project' || s.kind === 'dossier'
);
const VAULT_STATION: Station | null = WORLD_LAYOUT.stations.find((s) => s.kind === 'vault') ?? null;
/** The Reagent lab's 8 skill-category element blocks (BACKLOG.md Phase 9), in `world/layout.ts`
 * x order — a different shape from every sprite-kind station (`stations/Skills.ts`). */
const SKILL_STATIONS: Station[] = WORLD_LAYOUT.stations.filter((s) => s.kind === 'block');
const GATE_STATION = WORLD_LAYOUT.stations.find((s) => s.kind === 'gate')!;
const CONTACT_STATION = WORLD_LAYOUT.stations.find((s) => s.kind === 'contact')!;
/** Every station tracked for triggers/prompt (`stations/trigger.ts`'s `stationAt`): the ones
 * above plus the vault (shares the same approach/prompt/interact loop despite opening no DOM
 * panel of its own) and the 8 skill blocks (same, plus their own local bump reaction). */
const TRIGGER_STATIONS: Station[] = [
  ...INTERACTIVE_STATIONS,
  ...(VAULT_STATION ? [VAULT_STATION] : []),
  ...SKILL_STATIONS,
  CONTACT_STATION,
];
/** Decorative props this scene renders so far (BACKLOG.md Phase 8's classified wing, Phase 9's
 * lab); a later phase widens this (or drops the filter) as it adds its own (`world/props.ts` is
 * generic). */
const CLASSIFIED_PROPS = WORLD_LAYOUT.props.filter((p) => p.id.startsWith('classified-'));
const LAB_PROPS = WORLD_LAYOUT.props.filter((p) => p.id.startsWith('lab-'));

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
  private story!: Story;
  private fpsGuard = new FpsGuard();
  private refreshMeter = new RefreshMeter();
  private keyboard!: KeyboardSource;
  private wheel = new WheelWalker();
  private touch = new TouchPadState();
  private modalOpen = false;
  private followState: FollowState = { exact: 0, scrollX: 0, screenX: 0 };
  /** Physics steps taken this frame (`world.stepsLastFrame`), read before `postUpdate` clears it. */
  private stepsThisFrame = 0;
  private statsIn = 0;
  private zoneId = '';
  private stations!: Stations;
  private vault: Vault | null = null;
  private skills!: Skills;
  private classifiedWing!: ClassifiedWing;
  private stationId: string | null = null;
  /** Click/tap-to-open (ARCHITECTURE.md → Input → Pointer/tap): a plain walk toward the clicked
   * station, cleared on arrival (then opened) or by any manual movement/jump/interact. */
  private travel: { plan: TravelPlan; stationId: string } | null = null;
  /** Menu fast-travel (BACKLOG.md Phase 7): an active `travel`-sourced run that overrides every
   * other input (`mergeIntents`) even while `ui:modal` stays `true` the whole time — the menu
   * never flips it back to `false` on a selection, only on a genuine cancel. Cleared on arrival
   * (`openStation` then runs) or by `fadeTravelTo` taking the fade branch instead. */
  private fastTravel: { plan: TravelPlan; stationId: string } | null = null;
  /** The first-visit hint hides on the first real move/jump/interact (`input:first-move`,
   * BACKLOG.md Phase 7); fires once per session. */
  private hintDismissed = false;
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
    this.stations = new Stations(
      this,
      INTERACTIVE_STATIONS,
      this.ctx.manifest,
      GROUND_Y,
      (station) => this.handleStationClick(station)
    );
    this.story = new Story(
      this,
      this.ctx.manifest,
      GATE_STATION,
      CONTACT_STATION,
      GROUND_Y,
      bus.last('lang:change')?.lang ?? DEFAULT_LANG,
      (station) => this.handleStationClick(station)
    );
    if (VAULT_STATION) {
      this.vault = new Vault(this, VAULT_STATION, this.ctx.manifest, GROUND_Y, (station) =>
        this.handleStationClick(station)
      );
    }
    const classifiedZone = WORLD_LAYOUT.zones.find((z) => z.id === 'classified')!;
    this.classifiedWing = new ClassifiedWing(
      this,
      classifiedZone.x0,
      classifiedZone.x1,
      GROUND_Y,
      VAULT_STATION?.x ?? Math.round((classifiedZone.x0 + classifiedZone.x1) / 2),
      this.ctx.tier
    );
    blinkBeacons(this, buildProps(this, this.ctx.manifest, CLASSIFIED_PROPS));
    buildProps(this, this.ctx.manifest, LAB_PROPS);
    this.skills = new Skills(
      this,
      SKILL_STATIONS,
      this.ctx.manifest,
      (station) => this.handleStationClick(station),
      () => bus.emit('station:open', { id: 'stack' })
    );

    // Deep link (GAME_DESIGN.md → Deep links): `/#<id>` spawns at that station's x. An id with
    // no panel yet (gate/block/contact) still resolves — `station:open` below is a no-op until
    // its phase adds the panel; `classified` resolves too and stays a no-op UI-side (it has no
    // panel of its own), but still runs the vault's own local open() (below).
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
    this.physics.add.collider(this.panda.sprite, this.skills.bodies);

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
          this.touch.reset();
        },
        { replay: true }
      ),
      bus.on('input:wheel', ({ deltaX, deltaY, deltaMode }) => {
        if (!this.modalOpen) this.wheel.push(deltaX, deltaY, deltaMode);
      }),
      // `B`'s close precedence (GAME_DESIGN.md → Controls) is decided in `ui/pad.ts` before it
      // ever emits this event, so a press that closed a panel never also reads as an interact
      // here (the same outcome the keyboard gets from `KeyboardState`'s modal gate).
      bus.on('input:pad', (e) => {
        if (!this.modalOpen) this.touch.handle(e);
      }),
      bus.on('travel:to', ({ id }) => this.startFastTravel(id)),
      bus.on('skills:reset', () => this.skills.reset()),
      bus.on('lang:change', ({ lang }) => this.story.drawSign(lang)),
      bus.on(
        'fonts:ready',
        () => {
          this.ctx.pixelFont = this.story.drawSign();
          this.classifiedWing.drawSign();
        },
        { replay: true }
      ),
      bus.on('tier:change', ({ tier }) => {
        this.ctx.tier = tier;
        this.classifiedWing.refresh(tier, prefersReducedMotion());
      }),
      onReducedMotionChange((reduced) => {
        applyParallaxMotion(this.parallax, reduced);
        this.classifiedWing.refresh(this.ctx.tier, reduced);
      }),
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
    this.setStation(stationAt(this.panda.sprite.x, TRIGGER_STATIONS));
    this.sky.update(this.panda.sprite.x);
    this.updateDebugState();

    this.ctx.ready = true;
    bus.emit('game:ready', {});
    if (deepLink) this.openStation(deepLink);
    else this.story.startIntro(spawnX, GROUND_Y - PANDA_ART_H);
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
    const padIntent = this.touch.read();
    const manualInput =
      keyboardIntent.moveX !== 0 ||
      keyboardIntent.jumpPressed ||
      keyboardIntent.interactPressed ||
      wheelMoveX !== 0 ||
      padIntent.moveX !== 0 ||
      padIntent.jumpPressed ||
      padIntent.interactPressed;
    // Any manual input cancels an in-flight click-to-open walk (ARCHITECTURE.md → Input →
    // Pointer/tap): the player took over.
    if (this.travel && manualInput) this.travel = null;
    // First-visit controls hint (BACKLOG.md Phase 7 — GAME_DESIGN.md → HUD): fires once, off the
    // same raw sources (not the merged intent, which a menu fast-travel can drive on its own).
    if (!this.hintDismissed && manualInput) {
      this.hintDismissed = true;
      bus.emit('input:first-move', {});
    }

    const sources: SourcedIntent[] = [
      { source: 'keyboard', intent: keyboardIntent },
      { source: 'wheel', intent: { moveX: wheelMoveX } },
      { source: 'pad', intent: padIntent },
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
    if (this.fastTravel) {
      const step = autoWalkStep(this.panda.sprite.x, this.fastTravel.plan);
      if (step) sources.push({ source: 'travel', intent: step, active: true });
      else {
        const { stationId } = this.fastTravel;
        this.fastTravel = null;
        bus.emit('travel:arrived', { id: stationId });
        this.openStation(stationId);
      }
    }

    const intent = mergeIntents(sources, { modalOpen: this.modalOpen });
    if (intent.menuPressed) bus.emit('menu:open', {});
    if (intent.interactPressed && this.stationId) this.openStation(this.stationId);

    // A menu fast-travel keeps `modalOpen` true throughout (merge.ts) but must still walk/run
    // and animate normally — only a genuinely paused game (a panel/menu open, nothing driving
    // the panda) poses it as `interact`.
    const storyPose = this.story.update(delta, manualInput);
    this.panda.update(intent, delta, this.modalOpen && !this.fastTravel ? 'interact' : storyPose);
    // Bump from below: the head hit a block's static body during the last physics step.
    const head = this.panda.sprite.body;
    const bumped = bumpedBlock(
      this.panda.sprite.x,
      head.blocked.up || head.touching.up,
      SKILL_STATIONS
    );
    if (bumped) this.skills.bump(bumped);
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
    this.setStation(stationAt(this.panda.sprite.x, TRIGGER_STATIONS));
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

  /** A menu selection (`travel:to`, BACKLOG.md Phase 7 — GAME_DESIGN.md → Menu / map): run there
   * (close) or fade-teleport (far, or reduced motion) then open it. `ui:modal` is already `true`
   * from the menu and stays that way throughout — an active `travel` source overrides it
   * (`mergeIntents`), so the run still plays while the game otherwise stays paused. An unknown id
   * (neither a station nor a zone) is silently ignored. */
  private startFastTravel(id: string): void {
    const targetX = travelTargetX(id);
    if (targetX === null) return;
    this.travel = null;
    this.fastTravel = null;
    const fromX = this.panda.sprite.x;
    if (shouldFadeTravel(fromX, targetX, this.ctx.viewport.backingW, prefersReducedMotion())) {
      this.fadeTravelTo(targetX, id);
    } else {
      this.fastTravel = { plan: planFastTravel(fromX, targetX), stationId: id };
    }
  }

  /** Fade to `ink-900`, teleport, fade back in, then open — instant (no tween at all) under
   * reduced motion, the same "instant under reduced motion" pattern as every other camera/tween
   * effect in this codebase. */
  private fadeTravelTo(targetX: number, id: string): void {
    if (prefersReducedMotion()) {
      this.teleport(targetX);
      bus.emit('travel:arrived', { id });
      this.openStation(id);
      return;
    }
    const cam = this.cameras.main;
    const [r, g, b] = rgbChannels('ink-900');
    cam.fadeOut(FADE_TRAVEL_MS, r, g, b);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.teleport(targetX);
      cam.fadeIn(FADE_TRAVEL_MS, r, g, b);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        bus.emit('travel:arrived', { id });
        this.openStation(id);
      });
    });
  }

  /** Only the bus knows what happens next UI-side (AGENTS.md Golden Rule 7): the UI opens the
   * matching DOM panel (if one exists) and flips `ui:modal`, which is what actually pauses input
   * and poses the panda — this is a no-op UI-side for a station id with no panel yet (e.g. a
   * skill block, still Phase 9) or with no panel at all (the vault, below). Every "the player
   * reached/activated station `id`" path (interact, click, walk/fast-travel arrival) funnels
   * through here, so the vault's own local, game-side reaction (Golden Rule 7 again: the UI is
   * never told) lives in this one choke point instead of at each call site. */
  private openStation(id: string): void {
    // A skill block reacts in the game only (bump → used, tiles fly to the board); the stack
    // panel opens once the board completes, from Skills' own callback.
    if (SKILL_STATIONS.some((s) => s.id === id)) {
      this.skills.bump(id);
      return;
    }
    bus.emit('station:open', { id });
    if (VAULT_STATION && id === VAULT_STATION.id) {
      this.vault?.open();
      this.classifiedWing.shiftLightToScarlet();
      this.ctx.vaultOpen = true;
    }
  }

  /** Debug hook only (`window.__PORTFOLIO__.teleport`, also used by `openStation` and
   * `fadeTravelTo`): feet on the ground, camera snapped, any pending walk-to-x cancelled. */
  private teleport(x: number): void {
    this.travel = null;
    this.fastTravel = null;
    this.panda.teleportTo(x, GROUND_Y);
    this.followState = snapFollow({
      targetX: x,
      facing: this.panda.facing,
      viewW: this.scale.width,
      worldW: WORLD_W,
    });
    this.applyCamera();
    this.setZone(zoneAt(x).id);
    this.setStation(stationAt(x, TRIGGER_STATIONS));
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
      if (id === CONTACT_STATION.id) this.story.maybeFinale();
    }
    this.story.setContactActive(this.stationId === CONTACT_STATION.id);
    const activeId = this.modalOpen ? null : this.stationId;
    this.stations.setActive(activeId);
    this.vault?.setActive(activeId !== null && activeId === VAULT_STATION?.id);
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
