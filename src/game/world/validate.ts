/**
 * Pure layout validation (ARCHITECTURE.md → World model). No Phaser; derives the jump-derived
 * rules from `config.ts` via `player/logic.ts`'s `jumpApex()`, exactly as the doc specifies.
 * Returns a list of human-readable problems — empty means the layout is sound.
 */
import { confidentialProjects, projects, SKILL_CATEGORIES } from '../../content';
import { ASSET_MANIFEST } from '../../assets/registry';
import { GRAVITY, JUMP_VELOCITY, LAYOUT_STEP_HZ, PANDA_ART_H, PLAYER_BODY } from '../config';
import { jumpApex } from '../player/logic';
import type { Platform, PlatformSize, Station, WorldLayout } from './layout';

const APEX = jumpApex(GRAVITY, Math.abs(JUMP_VELOCITY), LAYOUT_STEP_HZ);
/** A one-way platform's top must be at most this high above the surface it's jumped from. */
const PLATFORM_MAX_HEIGHT = APEX - 4;
/** A skill block's bottom edge must clear this much above its platform (the panda walks under it)… */
const BLOCK_MIN_HEIGHT = Math.max(PLAYER_BODY.h + 2, PANDA_ART_H + 1);
/** …and be no higher than this (the panda's head must still reach it on a jump). */
const BLOCK_MAX_HEIGHT = PLAYER_BODY.h + APEX - 4;

/** `{ platform-s: 48, platform-m: 80, platform-l: 128 }`, read from the registry rather than
 * duplicated here (AGENTS.md Golden Rule 5: assets go through the registry). */
function platformWidths(): Record<PlatformSize, number> {
  const asset = ASSET_MANIFEST.assets.find((a) => a.id === 'platforms');
  const widths: Partial<Record<PlatformSize, number>> = {};
  if (asset?.kind === 'set') {
    for (const item of asset.items) {
      const size = item.name.replace('platform-', '') as PlatformSize;
      widths[size] = item.size[0];
    }
  }
  return { s: 48, m: 80, l: 128, ...widths };
}

const knownStationIds = (): Set<string> =>
  new Set<string>([
    'gate',
    'classified',
    'lab',
    'contact',
    ...projects.map((p) => p.id),
    ...confidentialProjects.map((c) => c.id),
    ...SKILL_CATEGORIES,
  ]);

function triggerSpan(s: Station): [number, number] {
  return [s.x - s.triggerW / 2, s.x + s.triggerW / 2];
}

export function validateLayout(layout: WorldLayout): string[] {
  const errors: string[] = [];

  // ── Zones: ordered, contiguous, cover [0, width). ──────────────────────────────────────────
  const zones = layout.zones;
  if (zones.length === 0) errors.push('layout has no zones');
  zones.forEach((z, i) => {
    if (!(z.x1 > z.x0)) errors.push(`zone "${z.id}": empty or inverted range [${z.x0}, ${z.x1})`);
    const prev = zones[i - 1];
    if (prev && prev.x1 !== z.x0)
      errors.push(`zone "${z.id}": gap or overlap after "${prev.id}" (${prev.x1} ≠ ${z.x0})`);
  });
  if (zones[0] && zones[0].x0 !== 0) errors.push('the first zone must start at x = 0');
  const lastZone = zones.at(-1);
  if (lastZone && lastZone.x1 !== layout.width)
    errors.push(`the last zone must end at layout.width (${lastZone.x1} ≠ ${layout.width})`);

  const zoneOf = (x: number) => zones.find((z) => x >= z.x0 && x < z.x1);

  // ── Stations: known id, inside a zone, no overlapping triggers. ────────────────────────────
  const known = knownStationIds();
  for (const st of layout.stations) {
    if (!known.has(st.id)) errors.push(`station "${st.id}": id does not resolve to any content`);
    if (!zoneOf(st.x)) errors.push(`station "${st.id}": x=${st.x} is outside every zone`);
  }
  const byX = [...layout.stations].sort((a, b) => a.x - b.x);
  for (let i = 1; i < byX.length; i++) {
    const prev = byX[i - 1]!;
    const cur = byX[i]!;
    if (triggerSpan(cur)[0] < triggerSpan(prev)[1])
      errors.push(`stations "${prev.id}" and "${cur.id}" have overlapping triggers`);
  }

  // ── Platforms: one-way, reachable with a single jump from the ground. ──────────────────────
  const widths = platformWidths();
  const platformsById = new Map<string, Platform>(layout.platforms.map((p) => [p.id, p]));
  for (const p of layout.platforms) {
    const height = layout.groundY - p.y;
    if (!(height > 0 && height <= PLATFORM_MAX_HEIGHT))
      errors.push(
        `platform "${p.id}": ${height} px above the ground exceeds the jump apex (max ${PLATFORM_MAX_HEIGHT.toFixed(2)})`
      );
  }

  // ── Skill blocks: bottom edge inside the bump-range above their platform. ──────────────────
  for (const st of layout.stations) {
    if (st.kind !== 'block') continue;
    const platform = st.platformId ? platformsById.get(st.platformId) : undefined;
    if (!platform) {
      errors.push(`block "${st.id}": no platform "${String(st.platformId)}"`);
      continue;
    }
    const height = platform.y - st.y;
    if (!(height >= BLOCK_MIN_HEIGHT && height <= BLOCK_MAX_HEIGHT))
      errors.push(
        `block "${st.id}": ${height} px above its platform is outside the bump range [${BLOCK_MIN_HEIGHT}, ${BLOCK_MAX_HEIGHT.toFixed(2)}]`
      );
  }

  // ── Props: resting on the ground or on a platform. ─────────────────────────────────────────
  for (const prop of layout.props) {
    const onGround = prop.y === layout.groundY;
    const onPlatform = layout.platforms.some(
      (p) => p.y === prop.y && Math.abs(prop.x - p.x) <= widths[p.size] / 2
    );
    if (!onGround && !onPlatform)
      errors.push(`prop "${prop.id}": not resting on the ground or a platform (y=${prop.y})`);
  }

  return errors;
}
