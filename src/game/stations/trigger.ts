/**
 * Pure station-trigger math (ARCHITECTURE.md → Stations & panels). `WorldScene` calls
 * `stationAt` from `POST_UPDATE`/teleport, the same way it already tracks the current zone, and
 * emits `station:enter`/`station:leave` only when the id actually changes.
 */

export interface StationTrigger {
  id: string;
  x: number;
  /** Trigger width (art px), centred on `x` — `validate.ts` guarantees no two overlap. */
  triggerW: number;
}

/** The id of the trigger `x` falls inside, or `null` between stations. */
export function stationAt(x: number, stations: readonly StationTrigger[]): string | null {
  for (const s of stations) {
    const half = s.triggerW / 2;
    if (x >= s.x - half && x < s.x + half) return s.id;
  }
  return null;
}
