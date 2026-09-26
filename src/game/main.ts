/**
 * The only entry that statically imports Phaser (loaded lazily by boot.ts). Creates the game
 * and applies the rendering contract: Scale NONE, and on every screen change
 * `resize(backing)` THEN `setZoom(zoom / dpr)` — the reverse order leaves a stale CSS size.
 */
import Phaser from 'phaser';
import { num } from '../design/palette';
import { DEFAULT_LANG } from '../i18n/lang';
import { bus, type Tier } from '../shared/bus';
import { readLayoutMode, targetViewHeight, watchLayoutMode } from '../shared/layout-mode';
import type { BootOptions } from './boot';
import { REGISTRY_KEY, type GameContext } from './context';
import { detectTier } from './quality';
import { watchScreen } from './render/viewport';
import { computeViewport, screenFromCss, type ScreenRect } from './render/zoom';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';

export function startGame({ parent, manifest, debug }: BootOptions): Phaser.Game {
  const mode = readLayoutMode();
  const box = parent.getBoundingClientRect();
  let screen: ScreenRect = screenFromCss(box.width, box.height, devicePixelRatio);
  const decision = detectTier();
  const ctx: GameContext = {
    manifest,
    tier: decision.tier,
    tierPinned: decision.pinned,
    mode,
    viewport: computeViewport(screen, targetViewHeight(mode)),
    dpr: screen.dpr,
    debug,
    ready: false,
    paused: false,
    pixelFont: false,
    pandaTexture: '',
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: ctx.viewport.backingW,
    height: ctx.viewport.backingH,
    pixelArt: true,
    backgroundColor: num('ink-900'),
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    banner: false,
    // The page never scrolls; the UI owns DOM focus, so Phaser must not grab keys globally.
    input: { keyboard: { capture: [] } },
    scene: [BootScene, WorldScene],
  });
  game.registry.set(REGISTRY_KEY, ctx);

  const apply = () => {
    const v = computeViewport(screen, targetViewHeight(ctx.mode));
    ctx.viewport = v;
    ctx.dpr = screen.dpr;
    game.scale.resize(v.backingW, v.backingH);
    game.scale.setZoom(v.scaleZoom);
    game.canvas.style.left = `${v.offsetX}px`;
    game.canvas.style.top = `${v.offsetY}px`;
  };
  game.events.once(Phaser.Core.Events.READY, () => {
    apply();
    watchScreen(parent, (rect) => {
      screen = rect;
      apply();
    });
    watchLayoutMode((m) => {
      if (m === ctx.mode) return;
      ctx.mode = m;
      apply();
    });
  });
  game.events.on(Phaser.Core.Events.HIDDEN, () => (ctx.paused = true));
  game.events.on(Phaser.Core.Events.VISIBLE, () => (ctx.paused = false));

  if (debug) {
    window.__PORTFOLIO__ = {
      getState: () => ({
        ready: ctx.ready,
        paused: ctx.paused,
        tier: ctx.tier,
        mode: ctx.mode,
        zoom: ctx.viewport.zoom,
        dpr: ctx.dpr,
        backingW: ctx.viewport.backingW,
        backingH: ctx.viewport.backingH,
        fps: Math.round(game.loop.actualFps),
        lang: bus.last('lang:change')?.lang ?? DEFAULT_LANG,
        pixelFont: ctx.pixelFont,
        pandaTexture: ctx.pandaTexture,
      }),
      setTier: (tier: Tier) => {
        ctx.tier = tier;
        ctx.tierPinned = true;
        bus.emit('tier:change', { tier });
      },
    };
  }
  return game;
}
