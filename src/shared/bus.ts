/**
 * The only channel between the game (Phaser) and the UI (DOM). Adding an event = adding a
 * key to `Events` with its payload type. The bus remembers the last payload of every event,
 * so a late subscriber can ask for it (`{ replay: true }`) — e.g. `fonts:ready` fired before
 * the lazily loaded game existed.
 */
import type { Lang } from '../content/types';
import type { LayoutMode } from './layout-mode';

export type Tier = 'high' | 'low';
/** A physical control on the handheld pad (BACKLOG.md Phase 6 — ARCHITECTURE.md → Input →
 * Touch pad). */
export type PadButton = 'left' | 'right' | 'a' | 'b' | 'start';

export interface DebugStats {
  fps: number;
  zoom: number;
  dpr: number;
  viewW: number;
  viewH: number;
  tier: Tier;
  mode: LayoutMode;
  /** The zone the player is currently in (`world/layout.ts` id). */
  zone: string;
}

export interface Events {
  /** Loader progress in [0, 1]. */
  'game:progress': { progress: number };
  'game:ready': Record<string, never>;
  'zone:enter': { id: string };
  'station:enter': { id: string };
  'station:leave': { id: string };
  'station:open': { id: string };
  'panel:closed': { id: string };
  'ui:modal': { open: boolean };
  'menu:open': Record<string, never>;
  'travel:to': { id: string };
  'travel:arrived': { id: string };
  'lang:change': { lang: Lang };
  'sound:toggle': { on: boolean };
  /** Every wheel event on the page (canvas, HUD, letterbox alike — `src/ui/wheel.ts` is the
   * single path), forwarded so it still walks the panda. */
  'input:wheel': { deltaX: number; deltaY: number; deltaMode: number };
  /** A handheld-pad button's down/up edge (`src/ui/pad.ts` is the only emitter;
   * `game/input/touch.ts` reads it, the same way `ui/wheel.ts` forwards `input:wheel`). `B`'s
   * close precedence (GAME_DESIGN.md → Controls) is decided in `ui/pad.ts` before this ever
   * fires, so a press that closes a panel is never also forwarded as an interact. */
  'input:pad': { button: PadButton; down: boolean; timeStamp: number };
  /** The first manual move/jump/interact of the session (BACKLOG.md Phase 7 — the first-visit
   * controls hint hides on this and never comes back). Fires once. */
  'input:first-move': Record<string, never>;
  'fonts:ready': Record<string, never>;
  'tier:change': { tier: Tier };
  /** Emitted about twice a second, only in debug mode. */
  'debug:stats': DebugStats;
}

export type EventName = keyof Events;
type Handler<K extends EventName> = (payload: Events[K]) => void;

export class Bus {
  private handlers = new Map<EventName, Set<Handler<never>>>();
  private lastPayload = new Map<EventName, unknown>();

  on<K extends EventName>(event: K, fn: Handler<K>, opts: { replay?: boolean } = {}): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn as Handler<never>);
    if (opts.replay && this.lastPayload.has(event)) fn(this.lastPayload.get(event) as Events[K]);
    return () => this.off(event, fn);
  }

  once<K extends EventName>(event: K, fn: Handler<K>, opts: { replay?: boolean } = {}): () => void {
    if (opts.replay && this.lastPayload.has(event)) {
      fn(this.lastPayload.get(event) as Events[K]);
      return () => {};
    }
    const off = this.on(event, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  off<K extends EventName>(event: K, fn: Handler<K>): void {
    this.handlers.get(event)?.delete(fn as Handler<never>);
  }

  emit<K extends EventName>(event: K, payload: Events[K]): void {
    this.lastPayload.set(event, payload);
    for (const fn of [...(this.handlers.get(event) ?? [])]) (fn as Handler<K>)(payload);
  }

  last<K extends EventName>(event: K): Events[K] | undefined {
    return this.lastPayload.get(event) as Events[K] | undefined;
  }
}

/** The app-wide bus (one module instance shared by the UI entry and the lazy game chunk). */
export const bus = new Bus();
