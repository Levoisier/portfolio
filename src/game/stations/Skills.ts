/**
 * The Reagent lab's 8 element blocks and periodic board (BACKLOG.md Phase 9 — GAME_DESIGN.md →
 * Skills mechanic). `skill-block` is a 3-frame `strip` (idle/bump/used) rather than the 6
 * projects' single-frame `sprite`, and each block needs its own solid physics body (so the panda
 * can bump it from below) plus a category-colored "window" and a periodic-board tile arc no
 * other station kind has — a different enough shape from `Stations.ts`'s generic single-sprite
 * adapter to get its own, the same reasoning `stations/Vault.ts` gives for the vault. Reuses
 * `Stations.ts`'s glyph so every station reads as the same "interact here" badge, and
 * `stations/skills-logic.ts`'s pure bump/board math (unit-tested there) for anything that isn't
 * a Phaser call.
 */
import type Phaser from 'phaser';
import { bus } from '../../shared/bus';
import { getAsset, type Rect } from '../../assets/registry';
import type { RuntimeManifest } from '../../assets/runtime';
import { skillCategorySymbols, skills } from '../../content';
import { SKILL_CATEGORIES, type Skill, type SkillCategory } from '../../content/types';
import { hex, num, SKILL_CATEGORY_COLOR } from '../../design/palette';
import { safeLocalStorage } from '../../i18n/lang';
import { prefersReducedMotion } from '../../shared/motion';
import {
  markUsedCategory,
  readUsedCategories,
  resetUsedCategories,
} from '../../shared/skills-progress';
import { STATION_GLYPH_GAP } from '../config';
import { PIXEL_FONT, PIXEL_FONT_SIZE, registerPixelFont } from '../text/bitmap-font';
import type { Station } from '../world/layout';
import { BOARD_COLUMNS, boardRows, boardSlot, skillsInCategory } from './skills-logic';
import { drawGlyph } from './Stations';

type BlockFrame = 'idle' | 'bump' | 'used';
const BLOCK_FRAME_NAMES: readonly BlockFrame[] = ['idle', 'bump', 'used'];
const BLOCK_FRAME_FALLBACK: Record<BlockFrame, number> = { idle: 0, bump: 1, used: 2 };
/** The manifest's declared window rect (art/manifest.json), used when no runtime anchor
 * resolved — the design-time fallback, same pattern as `stations/Vault.ts`'s `DEFAULT_DOORWAY`. */
const DEFAULT_WINDOW: Rect = [5, 5, 14, 14];

/** How long the transient "bump" frame shows before settling on "used" — instant under reduced
 * motion, the same "instant under reduced motion" pattern as every timed effect in this codebase. */
const BUMP_MS = 200;
/** The periodic board's flat grid, in art px. */
const BOARD_CELL_W = 22;
const BOARD_CELL_H = 16;
const BOARD_PAD = 4;
/** Gap between the board's bottom edge and the blocks' own top edge. */
const BOARD_GROUND_GAP = 30;
/** An element tile's box and its two-leg "arc" from a bumped block into its board slot. */
const TILE_W = 20;
const TILE_H = 14;
const TILE_ARC_MS = 220;
const TILE_ARC_HEIGHT = 28;
/** The board's own small "complete" pulse — skipped entirely under reduced motion, same as
 * `Vault`'s camera nudge. */
const CELEBRATE_MS = 160;

interface ResolvedBlock {
  key: string;
  w: number;
  h: number;
  window: Rect;
  frames: Record<BlockFrame, number>;
}

function designBlock(assetId: string): { w: number; h: number; window: Rect; frames: number } {
  const asset = getAsset(assetId);
  if (asset.kind !== 'strip') throw new Error(`Skills: "${assetId}" is not a strip asset`);
  return {
    w: asset.cell[0],
    h: asset.cell[1],
    window: asset.anchors?.window ?? DEFAULT_WINDOW,
    frames: asset.frames,
  };
}

function frameIndicesFor(
  frameNames: string[] | undefined,
  frameCount: number
): Record<BlockFrame, number> {
  const max = Math.max(0, frameCount - 1);
  const clamp = (i: number) => Math.min(Math.max(i, 0), max);
  const frames = {} as Record<BlockFrame, number>;
  for (const name of BLOCK_FRAME_NAMES) {
    const named = frameNames?.indexOf(name) ?? -1;
    frames[name] = clamp(named >= 0 ? named : BLOCK_FRAME_FALLBACK[name]);
  }
  return frames;
}

/** A design-time-sized, per-frame `ink-700` box + `ink-900` outline + a `scarlet-500` marker
 * dot whose x moves with the frame index (ARCHITECTURE.md → Asset pipeline → Placeholders,
 * "strips → …"), packed frame-by-frame into one canvas so `setFrame(index)` works exactly like
 * a real loaded spritesheet. Generated on demand so a block renders identically whether or not
 * `pnpm assets` has run. */
function ensureBlockPlaceholder(
  scene: Phaser.Scene,
  w: number,
  h: number,
  frameCount: number
): string {
  const key = `skill-block-placeholder-${w}x${h}x${frameCount}`;
  if (scene.textures.exists(key)) return key;
  const boxW = Math.max(1, Math.round(h * 0.7));
  const boxX = Math.round((w - boxW) / 2);
  const texture = scene.textures.createCanvas(key, w * frameCount, h);
  if (!texture) return key;
  const ctx = texture.context;
  const dotStep = frameCount > 1 ? (boxW - 3) / (frameCount - 1) : 0;
  for (let i = 0; i < frameCount; i++) {
    const ox = i * w;
    ctx.fillStyle = hex('ink-700');
    ctx.fillRect(ox + boxX, 0, boxW, h);
    ctx.strokeStyle = hex('ink-900');
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + boxX + 0.5, 0.5, boxW - 1, h - 1);
    ctx.fillStyle = hex('scarlet-500');
    ctx.fillRect(Math.round(ox + boxX + 1 + i * dotStep), h - 3, 2, 2);
  }
  texture.refresh();
  for (let i = 0; i < frameCount; i++) texture.add(i, 0, i * w, 0, w, h);
  return key;
}

function resolveBlock(
  scene: Phaser.Scene,
  manifest: RuntimeManifest | null,
  assetId: string
): ResolvedBlock {
  const design = designBlock(assetId);
  const asset = manifest?.assets[assetId];
  if (
    asset &&
    asset.source !== 'missing' &&
    asset.kind === 'strip' &&
    scene.textures.exists(assetId)
  ) {
    return {
      key: assetId,
      w: asset.frameWidth,
      h: asset.frameHeight,
      window: asset.anchors?.window ?? design.window,
      frames: frameIndicesFor(asset.frameNames, asset.frames),
    };
  }
  const key = ensureBlockPlaceholder(scene, design.w, design.h, design.frames);
  return {
    key,
    w: design.w,
    h: design.h,
    window: design.window,
    frames: frameIndicesFor(undefined, design.frames),
  };
}

interface Block {
  station: Station;
  image: Phaser.Types.Physics.Arcade.ImageWithStaticBody;
  window: Phaser.GameObjects.Rectangle;
  frames: Record<BlockFrame, number>;
  state: BlockFrame;
  geometry: { x: number; topY: number };
}

interface Tile {
  rect: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.BitmapText | null;
  skill: Skill;
}

export class Skills {
  private readonly scene: Phaser.Scene;
  private readonly store = safeLocalStorage();
  private readonly blocks = new Map<string, Block>();
  private readonly glyph: Phaser.GameObjects.Graphics;
  private readonly onBoardComplete: () => void;
  private readonly boardX: number;
  private readonly boardTopY: number;
  private readonly boardFrame: Phaser.GameObjects.Rectangle;
  private readonly tiles = new Map<number, Tile>();
  private symbolsDrawn = false;
  private used: Set<SkillCategory>;

  readonly bodies: Phaser.Types.Physics.Arcade.ImageWithStaticBody[] = [];

  constructor(
    scene: Phaser.Scene,
    stations: readonly Station[],
    manifest: RuntimeManifest | null,
    onClick: (station: Station) => void,
    onBoardComplete: () => void
  ) {
    this.scene = scene;
    this.onBoardComplete = onBoardComplete;
    this.used = readUsedCategories(this.store);

    // Board geometry first (every block shares the same `skill-block` asset, so its height is
    // the same for all 8 — resolve once, from the first station, rather than tracking a running
    // minimum through the loop below): the board must exist before that loop can place any
    // already-used category's tiles into it.
    const sampleHeight = stations[0] ? resolveBlock(scene, manifest, stations[0].asset).h : 0;
    const blockTopY = Math.round(stations[0]?.y ?? 0) - sampleHeight;
    const xs = stations.map((s) => s.x);
    this.boardX = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
    const rows = boardRows(skills.length);
    const boardW = BOARD_COLUMNS * BOARD_CELL_W + BOARD_PAD * 2;
    const boardH = rows * BOARD_CELL_H + BOARD_PAD * 2;
    this.boardTopY = blockTopY - BOARD_GROUND_GAP - boardH;
    this.boardFrame = scene.add
      .rectangle(
        Math.round(this.boardX - boardW / 2),
        Math.round(this.boardTopY),
        boardW,
        boardH,
        num('ink-900')
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, num('navy-400'))
      .setDepth(-2);

    for (const station of stations) {
      const resolved = resolveBlock(scene, manifest, station.asset);
      const x = Math.round(station.x);
      const y = Math.round(station.y);
      const left = x - resolved.w / 2;
      const top = y - resolved.h;

      const alreadyUsed = this.used.has(station.id as SkillCategory);
      const initialState: BlockFrame = alreadyUsed ? 'used' : 'idle';
      const image = scene.physics.add
        .staticImage(x, y, resolved.key, resolved.frames[initialState])
        .setOrigin(0.5, 1)
        .refreshBody();
      image.setInteractive({ useHandCursor: true }).on('pointerdown', () => onClick(station));
      this.bodies.push(image);

      const [wx, wy, ww, wh] = resolved.window;
      const windowRect = scene.add
        .rectangle(
          Math.round(left + wx),
          Math.round(top + wy),
          ww,
          wh,
          num(alreadyUsed ? 'ink-600' : SKILL_CATEGORY_COLOR[station.id as SkillCategory])
        )
        .setOrigin(0, 0)
        .setDepth(-1);

      const block: Block = {
        station,
        image,
        window: windowRect,
        frames: resolved.frames,
        state: initialState,
        geometry: { x, topY: top },
      };
      this.blocks.set(station.id, block);
      if (alreadyUsed) this.placeTiles(station.id as SkillCategory, x, top + wh / 2, false);
    }

    this.glyph = scene.add.graphics().setVisible(false);
    drawGlyph(this.glyph);
  }

  /** Whether `id` is one of these 8 blocks (`WorldScene.openStation`'s local-reaction check). */
  has(id: string): boolean {
    return this.blocks.has(id);
  }

  /** Shows the "interact here" glyph above `id`'s block, or hides it — same contract as
   * `Stations.setActive`/`Vault.setActive`. */
  setActive(id: string | null): void {
    const block = id ? this.blocks.get(id) : undefined;
    if (!block) {
      this.glyph.setVisible(false);
      return;
    }
    this.glyph.setPosition(block.geometry.x, Math.round(block.geometry.topY - STATION_GLYPH_GAP));
    this.glyph.setVisible(true);
  }

  /** Draws every window's category symbol once the pixel font is ready (`fonts:ready`) — a
   * no-op until then, idempotent once drawn, same pattern as `fx/classified.ts`'s `drawSign`. */
  drawSymbols(): void {
    if (this.symbolsDrawn || !registerPixelFont(this.scene)) return;
    this.symbolsDrawn = true;
    for (const block of this.blocks.values()) {
      const category = block.station.id as SkillCategory;
      this.scene.add
        .bitmapText(
          block.window.x + block.window.width / 2,
          block.window.y + block.window.height / 2,
          PIXEL_FONT,
          skillCategorySymbols[category],
          PIXEL_FONT_SIZE
        )
        .setOrigin(0.5, 0.5)
        .setTint(num('paper-100'))
        .setDepth(1);
    }
    // A tile placed before the font was ready (restoring persisted progress at boot, which
    // happens in the constructor — always before `fonts:ready`) still needs its label.
    for (const tile of this.tiles.values()) {
      if (tile.text) continue;
      tile.text = this.drawTileLabel(tile.rect.x, tile.rect.y, tile.skill);
    }
  }

  /** Bump from below (`blockedUp`) or interact — idle → bump → used, the category's skills pop
   * out and arc into the periodic board, and (once every category is used) a small celebration
   * plus `onBoardComplete()`. A no-op for an unknown id or a block that is not idle (already
   * bumped, or mid-transition) — idempotent, same contract as `Vault.open`. */
  bump(id: string): void {
    const block = this.blocks.get(id);
    if (!block || block.state !== 'idle') return;
    const category = id as SkillCategory;
    bus.emit('sfx', { name: 'bump' });
    const reduced = prefersReducedMotion();

    const settle = () => {
      block.state = 'used';
      block.image.setFrame(block.frames.used);
      block.window.setFillStyle(num('ink-600'));
      this.used = markUsedCategory(this.store, category);
      this.placeTiles(
        category,
        block.geometry.x,
        block.window.y + block.window.height / 2,
        !reduced
      );
      if (SKILL_CATEGORIES.every((c) => this.used.has(c))) {
        this.celebrate();
        this.onBoardComplete();
      }
    };

    if (reduced) {
      settle();
      return;
    }
    block.state = 'bump';
    block.image.setFrame(block.frames.bump);
    this.scene.time.delayedCall(BUMP_MS, settle);
  }

  /** The stack panel's "reset lab" control (`bus.on('skills:reset', …)`, `WorldScene`): every
   * block back to idle, the board cleared, progress erased. */
  reset(): void {
    resetUsedCategories(this.store);
    this.used = new Set();
    for (const block of this.blocks.values()) {
      block.state = 'idle';
      block.image.setFrame(block.frames.idle);
      block.window.setFillStyle(num(SKILL_CATEGORY_COLOR[block.station.id as SkillCategory]));
    }
    for (const tile of this.tiles.values()) {
      tile.rect.destroy();
      tile.text?.destroy();
    }
    this.tiles.clear();
  }

  /** The element tile's "SymbolNumber" pixel-text label, drawn on top of its rect. `null` when
   * the font is not registered yet — `drawSymbols()` fills it in once it is. */
  private drawTileLabel(x: number, y: number, skill: Skill): Phaser.GameObjects.BitmapText | null {
    if (!this.symbolsDrawn) return null;
    return this.scene.add
      .bitmapText(x, y, PIXEL_FONT, `${skill.symbol}${skill.number}`, PIXEL_FONT_SIZE)
      .setOrigin(0.5, 0.5)
      .setTint(num('ink-900'))
      .setDepth(0);
  }

  /** Spawns (or, on boot with persisted progress, instantly places) one tile per skill in
   * `category`, arcing from `(fromX, fromY)` into the periodic board — instant, no tween, when
   * `animate` is false (reduced motion, or restoring already-used progress on boot). */
  private placeTiles(
    category: SkillCategory,
    fromX: number,
    fromY: number,
    animate: boolean
  ): void {
    for (const skill of skillsInCategory(skills, category)) {
      if (this.tiles.has(skill.number)) continue;
      const slot = boardSlot(skill.number);
      const targetX = Math.round(
        this.boardX -
          (BOARD_COLUMNS * BOARD_CELL_W) / 2 +
          BOARD_PAD +
          slot.col * BOARD_CELL_W +
          BOARD_CELL_W / 2
      );
      const targetY = Math.round(
        this.boardTopY + BOARD_PAD + slot.row * BOARD_CELL_H + BOARD_CELL_H / 2
      );
      const rect = this.scene.add
        .rectangle(
          animate ? fromX : targetX,
          animate ? fromY : targetY,
          TILE_W,
          TILE_H,
          num(SKILL_CATEGORY_COLOR[category])
        )
        .setStrokeStyle(1, num('ink-900'))
        .setDepth(-1);
      const text = this.drawTileLabel(rect.x, rect.y, skill);
      const tile: Tile = { rect, text, skill };
      this.tiles.set(skill.number, tile);
      if (!animate) continue;

      const peakY = Math.min(fromY, targetY) - TILE_ARC_HEIGHT;
      const midX = Math.round((fromX + targetX) / 2);
      const targets = text ? [rect, text] : [rect];
      this.scene.tweens.add({
        targets,
        x: midX,
        y: peakY,
        duration: TILE_ARC_MS / 2,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets,
            x: targetX,
            y: targetY,
            duration: TILE_ARC_MS / 2,
            ease: 'Sine.easeIn',
          });
        },
      });
    }
  }

  /** The board's own small "complete" pulse (GAME_DESIGN.md → Skills mechanic: "a small
   * celebration") — skipped entirely under reduced motion. */
  private celebrate(): void {
    if (prefersReducedMotion()) return;
    this.scene.tweens.add({
      targets: this.boardFrame,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: CELEBRATE_MS,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }
}
