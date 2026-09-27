/**
 * Pure `/#<id>` deep-link parsing (GAME_DESIGN.md → _Canonical ids_ / _Deep links_). `WorldScene`
 * reads `location.hash` at spawn and resolves it against `WORLD_LAYOUT.stations`' ids; the UI
 * resolves it the same way to decide which panel (if any) to open.
 */

/** The station id `hash` names, or `null` when it names none of `validIds`. Accepts `"#id"` or
 * a bare `"id"`, trims whitespace; case-sensitive (every canonical id is already lower-kebab). */
export function parseDeepLink(hash: string, validIds: readonly string[]): string | null {
  const id = hash.trim().replace(/^#/, '');
  return id.length > 0 && validIds.includes(id) ? id : null;
}

/** The hash a station's deep link sets (and the panel-close handler clears). */
export function hashFor(id: string): string {
  return `#${id}`;
}
