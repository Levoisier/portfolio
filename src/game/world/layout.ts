/**
 * The level from data (ARCHITECTURE.md → World model). Plain typed data, no Phaser import, so
 * it can be imported from anywhere (including `config.ts`, which re-exports the world
 * dimensions) and unit-tested by `validate.ts` without a browser.
 *
 * Positions come from `GAME_DESIGN.md` → _The level_ (x-ranges) and _Canonical ids_; content
 * ids (`projects`, `confidentialProjects`, `SKILL_CATEGORIES`) are read from `src/content`
 * rather than repeated here, so the two can never drift apart (AGENTS.md Golden Rule 2).
 */
import { confidentialProjects, projects, SKILL_CATEGORIES } from '../../content';

/** World dimensions (ARCHITECTURE.md → Rendering contract: height 480, ground top y 432). */
export const WORLD_H = 480;
export const GROUND_Y = 432;

/** Sky mood per `GAME_DESIGN.md` → _The level_ "Sky" column; `fx/sky.ts` maps each to colors. */
export type SkyMood = 'deep-night' | 'night' | 'darkest-night' | 'pre-dawn' | 'sunrise';

export interface Zone {
  id: string;
  x0: number;
  x1: number;
  sky: SkyMood;
}

export type StationKind = 'gate' | 'project' | 'vault' | 'dossier' | 'block' | 'contact';

export interface Station {
  /** Canonical id, project id, confidential-project id, or a `SKILL_CATEGORIES` id. */
  id: string;
  kind: StationKind;
  x: number;
  /** y the trigger/prop sits on: the ground for most kinds, a block's bottom edge for `block`. */
  y: number;
  /** Manifest asset id this station uses to render (Phase 5/8/9/10 build the actual object). */
  asset: string;
  /** Interact-trigger width (art px), centred on `x`. */
  triggerW: number;
  /** `block` stations only: the platform (by id) the panda jumps from to bump it. */
  platformId?: string;
}

export type PlatformSize = 's' | 'm' | 'l';

export interface Platform {
  id: string;
  x: number;
  /** Top surface y (art px) — the panda stands here; one-way (only the top face collides). */
  y: number;
  size: PlatformSize;
}

export interface Prop {
  id: string;
  /** Manifest asset id (a `set` asset's item, or a standalone sprite/strip). */
  asset: string;
  /** Item name inside a `set` asset (omitted for a standalone sprite). */
  item?: string;
  x: number;
  /** y the prop rests on: the ground, or a platform's top surface at this x. */
  y: number;
}

/** A painted tree standing on the ground, behind the terrain lip (decoration only). */
export interface Tree {
  id: string;
  asset: 'tree-start' | 'tree-decor';
  /** Trunk x (the sprite is bottom-centred here). */
  x: number;
  /** Mirror it, so repeated trees don't read as copies. */
  flip?: boolean;
}

export interface WorldLayout {
  width: number;
  height: number;
  groundY: number;
  zones: Zone[];
  stations: Station[];
  platforms: Platform[];
  props: Prop[];
  /**
   * Centres of the gaps in the painted terrain, each spanned by a `bridge` at ground level.
   * Visual only: the ground collider stays continuous, so walking over one never changes.
   */
  bridges: number[];
  trees: Tree[];
}

/** `x0…x1` in art px, in world order (GAME_DESIGN.md → _The level_). */
const ZONES: Zone[] = [
  { id: 'gate', x0: 0, x1: 480, sky: 'deep-night' },
  { id: 'fiora', x0: 480, x1: 800, sky: 'night' },
  { id: 'japaniracer', x0: 800, x1: 1120, sky: 'night' },
  { id: 'le-parche', x0: 1120, x1: 1440, sky: 'night' },
  { id: 'maison-cielare', x0: 1440, x1: 1760, sky: 'night' },
  { id: 'orquestia', x0: 1760, x1: 2080, sky: 'night' },
  { id: 'transcolombia', x0: 2080, x1: 2400, sky: 'night' },
  { id: 'classified', x0: 2400, x1: 3200, sky: 'darkest-night' },
  { id: 'lab', x0: 3200, x1: 4000, sky: 'pre-dawn' },
  { id: 'contact', x0: 4000, x1: 4620, sky: 'sunrise' },
];

export const WORLD_W = ZONES.at(-1)!.x1;

const zoneCenter = (id: string): number => {
  const z = ZONES.find((zone) => zone.id === id);
  if (!z) throw new Error(`world/layout: unknown zone "${id}"`);
  return Math.round((z.x0 + z.x1) / 2);
};

/** One-way platforms under the Reagent lab's eight element blocks (GAME_DESIGN.md → _Skills
 * mechanic_). All at the same, single tier: the ground → platform → block chain the
 * jump-derived rules in `validate.ts` check. */
const LAB_ZONE = ZONES.find((z) => z.id === 'lab')!;
const LAB_STEP = (LAB_ZONE.x1 - LAB_ZONE.x0 - 100) / (SKILL_CATEGORIES.length - 1);
/** Height (art px) of a platform's top above the ground: comfortably under `jumpApex() − 4`. */
const LAB_PLATFORM_HEIGHT = 40;
/** Height (art px) of a block's bottom edge above its platform: inside the bump-range rules. */
const LAB_BLOCK_HEIGHT = 64;
const LAB_PLATFORM_Y = GROUND_Y - LAB_PLATFORM_HEIGHT;
const LAB_BLOCK_Y = LAB_PLATFORM_Y - LAB_BLOCK_HEIGHT;

const LAB_PLATFORMS: Platform[] = SKILL_CATEGORIES.map((cat, i) => ({
  id: `lab-platform-${cat}`,
  x: Math.round(LAB_ZONE.x0 + 50 + i * LAB_STEP),
  y: LAB_PLATFORM_Y,
  size: 's',
}));

const GATE_STATION: Station = {
  id: 'gate',
  kind: 'gate',
  x: zoneCenter('gate'),
  y: GROUND_Y,
  asset: 'station-spawn-gate',
  triggerW: 120,
};

/** The 6 project stations, in world order, positioned at the centre of their own zone. Every
 * project id is also its station id, its panel id, and its `station-<id>` asset id. */
const PROJECT_STATIONS: Station[] = projects.map((p) => ({
  id: p.id,
  kind: 'project',
  x: zoneCenter(p.id),
  y: GROUND_Y,
  asset: `station-${p.id}`,
  triggerW: 64,
}));

const VAULT_STATION: Station = {
  id: 'classified',
  kind: 'vault',
  x: 2500,
  y: GROUND_Y,
  asset: 'confidential-vault',
  triggerW: 96,
};

/** 4 dossier stands spread across the classified wing, past the vault. */
const DOSSIER_STATIONS: Station[] = confidentialProjects.map((c, i) => ({
  id: c.id,
  kind: 'dossier',
  x: 2650 + i * 150,
  y: GROUND_Y,
  asset: 'confidential-dossier',
  triggerW: 48,
}));

/** 8 skill-category element blocks, one per `LAB_PLATFORMS` entry. */
const BLOCK_STATIONS: Station[] = SKILL_CATEGORIES.map((cat, i) => ({
  id: cat,
  kind: 'block',
  x: LAB_PLATFORMS[i]!.x,
  y: LAB_BLOCK_Y,
  asset: 'skill-block',
  triggerW: 32,
  platformId: LAB_PLATFORMS[i]!.id,
}));

const CONTACT_STATION: Station = {
  id: 'contact',
  kind: 'contact',
  x: zoneCenter('contact'),
  y: GROUND_Y,
  asset: 'contact-post',
  triggerW: 96,
};

/** Decorative prop slots (positions only — the owning phase renders them; ASSETS.md → wave D /
 * wave C). The gate's crate awaits Phase 10's wake beat; the classified wing's fence panels and
 * beacon (GAME_DESIGN.md → _Classified wing_, `props-zones`) sit in the gaps between its
 * stations' triggers — clear of the vault (2452–2548) and the four dossier stands. */
const PROPS: Prop[] = [
  { id: 'gate-crate', asset: 'props-misc', item: 'crate', x: 190, y: GROUND_Y },
  { id: 'classified-fence-1', asset: 'props-zones', item: 'fence', x: 2426, y: GROUND_Y },
  { id: 'classified-fence-2', asset: 'props-zones', item: 'fence', x: 2587, y: GROUND_Y },
  { id: 'classified-beacon-1', asset: 'props-zones', item: 'beacon', x: 2725, y: GROUND_Y },
  { id: 'classified-fence-3', asset: 'props-zones', item: 'fence', x: 2875, y: GROUND_Y },
  { id: 'classified-beacon-2', asset: 'props-zones', item: 'beacon', x: 3025, y: GROUND_Y },
  { id: 'classified-fence-4', asset: 'props-zones', item: 'fence', x: 3162, y: GROUND_Y },
  { id: 'lab-fume-hood', asset: 'props-zones', item: 'fume-hood', x: 3226, y: GROUND_Y },
  { id: 'lab-shelf', asset: 'props-zones', item: 'lab-shelf', x: 3972, y: GROUND_Y },
  // Ambience (Phase 11, `props-misc`): dressing in the gaps between stations. (The gate's lamp
  // post gave way to the start tree, which carries its own lantern.)
  { id: 'misc-fiora-bench', asset: 'props-misc', item: 'bench', x: 540, y: GROUND_Y },
  { id: 'misc-japaniracer-toolbox', asset: 'props-misc', item: 'toolbox', x: 858, y: GROUND_Y },
  { id: 'misc-japaniracer-barrel', asset: 'props-misc', item: 'barrel', x: 1082, y: GROUND_Y },
  { id: 'misc-le-parche-cone', asset: 'props-misc', item: 'cone', x: 1176, y: GROUND_Y },
  { id: 'misc-maison-lamp', asset: 'props-misc', item: 'lamp-post', x: 1480, y: GROUND_Y },
  { id: 'misc-orquestia-valve', asset: 'props-misc', item: 'valve-pipe', x: 2044, y: GROUND_Y },
  { id: 'misc-transcolombia-crate', asset: 'props-misc', item: 'crate', x: 2118, y: GROUND_Y },
  { id: 'misc-transcolombia-gas', asset: 'props-misc', item: 'gas-cylinder', x: 2372, y: GROUND_Y },
  { id: 'misc-contact-bench', asset: 'props-misc', item: 'bench', x: 4460, y: GROUND_Y },
  { id: 'misc-contact-lamp', asset: 'props-misc', item: 'lamp-post', x: 4580, y: GROUND_Y },
];

/** Two crossings, each in the widest station-free gap (clear of every station sprite): gate →
 * Fiora, and the Reagent lab → the sunrise lookout. Used sparingly on purpose. */
const BRIDGES = [448, 4100];

/** The start tree frames the spawn on the left (GAME_DESIGN.md → _The level_, zone 0); maples
 * dress the widest gaps between stations, mirrored alternately. */
const TREES: Tree[] = [
  { id: 'tree-gate', asset: 'tree-start', x: 56 },
  { id: 'tree-fiora', asset: 'tree-decor', x: 800, flip: true },
  { id: 'tree-le-parche', asset: 'tree-decor', x: 1440 },
  { id: 'tree-orquestia', asset: 'tree-decor', x: 2080, flip: true },
  { id: 'tree-contact', asset: 'tree-decor', x: 4470 },
];

export const WORLD_LAYOUT: WorldLayout = {
  width: WORLD_W,
  height: WORLD_H,
  groundY: GROUND_Y,
  zones: ZONES,
  stations: [
    GATE_STATION,
    ...PROJECT_STATIONS,
    VAULT_STATION,
    ...DOSSIER_STATIONS,
    ...BLOCK_STATIONS,
    CONTACT_STATION,
  ],
  platforms: LAB_PLATFORMS,
  props: PROPS,
  bridges: BRIDGES,
  trees: TREES,
};

/** The zone containing `x` (clamped to the world). */
export function zoneAt(x: number, zones: readonly Zone[] = WORLD_LAYOUT.zones): Zone {
  const first = zones[0]!;
  const last = zones[zones.length - 1]!;
  const clamped = Math.min(Math.max(x, first.x0), last.x1 - 1);
  return zones.find((z) => clamped >= z.x0 && clamped < z.x1) ?? last;
}
