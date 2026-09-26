import { describe, expect, it } from 'vitest';
import { WORLD_LAYOUT, type WorldLayout } from './layout';
import { validateLayout } from './validate';

/** A structural clone, so a test's edits never leak into `WORLD_LAYOUT` or another test. */
const clone = (): WorldLayout => structuredClone(WORLD_LAYOUT);

describe('validateLayout', () => {
  it('passes on the real layout', () => {
    expect(validateLayout(WORLD_LAYOUT)).toEqual([]);
  });

  it('fails when a station id resolves to nothing in the content', () => {
    const layout = clone();
    layout.stations[0]!.id = 'not-a-real-project';
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('not-a-real-project'))).toBe(true);
  });

  it('fails when a station sits outside every zone', () => {
    const layout = clone();
    layout.stations[0]!.x = layout.width + 1000;
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('outside every zone'))).toBe(true);
  });

  it('fails when two stations have overlapping triggers', () => {
    const layout = clone();
    const [a, b] = layout.stations;
    b!.x = a!.x;
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('overlapping triggers'))).toBe(true);
  });

  it('fails when a platform is too high to reach with a single jump (unreachable)', () => {
    const layout = clone();
    layout.platforms[0]!.y = layout.groundY - 200;
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('exceeds the jump apex'))).toBe(true);
  });

  it('fails when a platform sits at or below the ground', () => {
    const layout = clone();
    layout.platforms[0]!.y = layout.groundY;
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('exceeds the jump apex'))).toBe(true);
  });

  it('fails when a skill block is out of the bump range above its platform (too low)', () => {
    const layout = clone();
    const block = layout.stations.find((s) => s.kind === 'block')!;
    const platform = layout.platforms.find((p) => p.id === block.platformId)!;
    block.y = platform.y - 10; // far below the 49 px minimum
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('bump range'))).toBe(true);
  });

  it('fails when a skill block is out of the bump range above its platform (too high)', () => {
    const layout = clone();
    const block = layout.stations.find((s) => s.kind === 'block')!;
    const platform = layout.platforms.find((p) => p.id === block.platformId)!;
    block.y = platform.y - 300; // far above the ~98 px maximum
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('bump range'))).toBe(true);
  });

  it('fails when a skill block references a platform that does not exist', () => {
    const layout = clone();
    const block = layout.stations.find((s) => s.kind === 'block')!;
    block.platformId = 'no-such-platform';
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('no platform'))).toBe(true);
  });

  it('fails when a prop rests in mid-air (neither the ground nor a platform)', () => {
    const layout = clone();
    layout.props.push({ id: 'floating-crate', asset: 'props-misc', item: 'crate', x: 300, y: 100 });
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('floating-crate'))).toBe(true);
  });

  it('fails when the zones have a gap or overlap', () => {
    const layout = clone();
    layout.zones[1]!.x0 += 10;
    const errors = validateLayout(layout);
    expect(errors.some((e) => e.includes('gap or overlap'))).toBe(true);
  });
});
