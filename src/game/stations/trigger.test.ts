import { describe, expect, it } from 'vitest';
import { stationAt, type StationTrigger } from './trigger';

const STATIONS: StationTrigger[] = [
  { id: 'fiora', x: 640, triggerW: 64 },
  { id: 'japaniracer', x: 960, triggerW: 64 },
];

describe('stations/trigger: stationAt (enter/leave boundaries)', () => {
  it('is null well outside any trigger', () => {
    expect(stationAt(0, STATIONS)).toBeNull();
  });

  it('enters at the trigger left edge and leaves past the right edge', () => {
    expect(stationAt(607, STATIONS)).toBeNull();
    expect(stationAt(608, STATIONS)).toBe('fiora'); // 640 - 64/2
    expect(stationAt(640, STATIONS)).toBe('fiora');
    expect(stationAt(671, STATIONS)).toBe('fiora');
    expect(stationAt(672, STATIONS)).toBeNull(); // 640 + 64/2, half-open
  });

  it('is null in the gap between two stations, then enters the next one', () => {
    expect(stationAt(700, STATIONS)).toBeNull();
    expect(stationAt(928, STATIONS)).toBe('japaniracer');
  });

  it('reports a fresh enter/leave sequence as x sweeps across both triggers', () => {
    const xs = [0, 608, 640, 700, 928, 991, 1200];
    const seen = xs.map((x) => stationAt(x, STATIONS));
    expect(seen).toEqual([null, 'fiora', 'fiora', null, 'japaniracer', 'japaniracer', null]);
  });
});
