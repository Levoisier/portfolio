/**
 * The painted scenery (ARCHITECTURE.md → Scenery): a full-screen backdrop in screen space,
 * terrain spans with bridges over their gaps, and trees on the ground. Geometry comes from
 * `world/scenery.ts` (pure); this module only places images on the scene it is given, so it
 * never imports Phaser at runtime.
 */
import type Phaser from 'phaser';
import type { RuntimeLayer, RuntimeManifest, RuntimeSprite } from '../../assets/runtime';
import { num } from '../../design/palette';
import type { WorldLayout } from '../world/layout';
import {
  backdropPlacement,
  pickBackdrop,
  terrainPieces,
  terrainSpans,
  type BackdropId,
  type TerrainSlices,
} from '../world/scenery';
import { skyStopsFromZones, sunAlphaAt, type SkyStop } from './sky';

const TERRAIN_ID = 'terrain';
const BRIDGE_ID = 'bridge';
/** Each bridge post rests this far onto the terrain cap on either side of its gap. */
const BRIDGE_OVERLAP = 6;
/** Trees root slightly into the terrain lip, so its grass hides where the trunk meets it. */
const TREE_SINK = 4;

const DEPTH = { backdrop: -120, dawn: -119, tree: -35, terrain: -30, bridge: -29 } as const;
/** Peak strength of the additive sunrise wash over the (night) painting at the lookout. */
const DAWN_MAX_ALPHA = 0.32;

function sprite(manifest: RuntimeManifest | null, id: string): RuntimeSprite | null {
  const a = manifest?.assets[id];
  return a && a.source !== 'missing' && a.kind === 'sprite' ? a : null;
}

function backdrop(manifest: RuntimeManifest | null, id: BackdropId): RuntimeLayer | null {
  const a = manifest?.assets[id];
  return a && a.source !== 'missing' && a.kind === 'backdrop' ? a : null;
}

export class Scenery {
  /** Whether the painted terrain replaced the placeholder floor (the scene skips its own). */
  readonly hasTerrain: boolean;
  /** Whether a backdrop replaced the code-drawn sky and parallax skyline. */
  readonly hasBackdrop: boolean;
  private readonly image: Phaser.GameObjects.Image | null = null;
  /** The painting is a night scene; the level still ends at sunrise (GAME_DESIGN.md → _The
   * level_), so a warm additive wash fades in along the same curve the code sky's sun used. */
  private readonly dawn: Phaser.GameObjects.Rectangle | null = null;
  private readonly stops: SkyStop[];
  private readonly manifest: RuntimeManifest | null;
  private readonly textures: Phaser.Textures.TextureManager;
  private readonly worldW: number;
  private current: RuntimeLayer | null = null;
  private view = { w: 0, h: 0, groundScreenY: 0 };

  constructor(scene: Phaser.Scene, manifest: RuntimeManifest | null, layout: WorldLayout) {
    this.manifest = manifest;
    this.textures = scene.textures;
    const hasTexture = (key: string) => scene.textures.exists(key);
    this.worldW = layout.width;
    this.stops = skyStopsFromZones(layout.zones, layout.width);
    const landscape = backdrop(manifest, 'backdrop-landscape');
    const portrait = backdrop(manifest, 'backdrop-portrait');
    this.hasBackdrop =
      Boolean(landscape && hasTexture(landscape.id)) ||
      Boolean(portrait && hasTexture(portrait.id));
    if (this.hasBackdrop) {
      const first = (landscape && hasTexture(landscape.id) ? landscape : portrait)!;
      this.image = scene.add
        .image(0, 0, first.id)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.backdrop);
      this.current = first;
      this.dawn = scene.add
        .rectangle(0, 0, 1, 1, num('amber-600'))
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.dawn)
        .setBlendMode('ADD')
        .setAlpha(0);
    }

    const terrain = sprite(manifest, TERRAIN_ID);
    const surface = terrain?.anchors?.surface;
    const tile = terrain?.anchors?.tile;
    this.hasTerrain = Boolean(terrain && surface && tile && hasTexture(TERRAIN_ID));
    if (this.hasTerrain) {
      const slices: TerrainSlices = { width: terrain!.width, tileX: tile![0], tileW: tile![2] };
      const bridge = sprite(manifest, BRIDGE_ID);
      const withBridges = Boolean(bridge && hasTexture(BRIDGE_ID));
      const gapW = withBridges ? bridge!.width - 2 * BRIDGE_OVERLAP : 0;
      const spans = terrainSpans(layout.width, withBridges ? layout.bridges : [], gapW, slices);
      const texture = scene.textures.get(TERRAIN_ID);
      const top = layout.groundY - surface![1];
      for (const [x0, x1] of spans) {
        for (const piece of terrainPieces(x0, x1, slices)) {
          const frame = `cols-${piece.srcX}-${piece.w}`;
          if (!texture.has(frame)) texture.add(frame, 0, piece.srcX, 0, piece.w, terrain!.height);
          scene.add.image(piece.x, top, TERRAIN_ID, frame).setOrigin(0, 0).setDepth(DEPTH.terrain);
        }
      }
      if (withBridges) {
        const deckTop = layout.groundY - (bridge!.anchors?.surface?.[1] ?? 0);
        for (const centre of layout.bridges) {
          scene.add
            .image(Math.round(centre - bridge!.width / 2), deckTop, BRIDGE_ID)
            .setOrigin(0, 0)
            .setDepth(DEPTH.bridge);
        }
      }
    }

    for (const tree of layout.trees) {
      const asset = sprite(manifest, tree.asset);
      if (!asset || !hasTexture(tree.asset)) continue;
      // Origin (0, 0) at an integer x: a bottom-centred origin on an odd width lands on a half
      // pixel. A flip is a −1 scale, so it needs full vertex rounding (Rendering contract).
      const img = scene.add
        .image(
          tree.x - Math.floor(asset.width / 2),
          layout.groundY + TREE_SINK - asset.height,
          tree.asset
        )
        .setOrigin(0, 0)
        .setDepth(DEPTH.tree);
      if (tree.flip) img.setFlipX(true).setVertexRoundMode('full');
    }
  }

  /** The view changed size or layout mode: pick the painting for its aspect and re-place it. */
  resize(viewW: number, viewH: number, groundScreenY: number) {
    this.view = { w: viewW, h: viewH, groundScreenY };
    this.dawn?.setSize(viewW, viewH);
    if (!this.image) return;
    const wanted = backdrop(this.manifest, pickBackdrop(viewW, viewH));
    const next = wanted && this.textures.exists(wanted.id) ? wanted : this.current;
    if (next && next !== this.current) {
      this.image.setTexture(next.id);
      this.current = next;
    }
  }

  /** The painting on screen now, or null without one. */
  get backdropId(): string | null {
    return this.current?.id ?? null;
  }

  /** Player moved: the sunrise wash follows the level's sky phase at `x`. */
  updateMood(x: number) {
    this.dawn?.setAlpha(DAWN_MAX_ALPHA * sunAlphaAt(x, this.stops));
  }

  /** Camera moved: slide the backdrop across its spare width. */
  update(scrollX: number) {
    if (!this.image || !this.current) return;
    const { x, y } = backdropPlacement({
      id: this.current.id as BackdropId,
      viewW: this.view.w,
      viewH: this.view.h,
      bgW: this.current.width,
      bgH: this.current.height,
      horizonY: this.current.anchors?.horizon?.[1] ?? this.current.height,
      groundScreenY: this.view.groundScreenY,
      scrollX,
      worldW: this.worldW,
    });
    this.image.setPosition(x, y);
  }
}
