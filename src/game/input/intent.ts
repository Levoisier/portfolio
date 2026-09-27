/**
 * The one per-frame input shape every source writes (ARCHITECTURE.md → Input). `*Pressed` are
 * edges (true for exactly one frame per physical press); `jumpHeld` is a level.
 */
export interface Intent {
  /** −1 (left) … 1 (right). */
  moveX: number;
  run: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  interactPressed: boolean;
  menuPressed: boolean;
}

export const NO_INTENT: Readonly<Intent> = Object.freeze({
  moveX: 0,
  run: false,
  jumpPressed: false,
  jumpHeld: false,
  interactPressed: false,
  menuPressed: false,
});

/**
 * Where an intent came from. `keyboard` and `wheel` are gated while a panel/menu is open;
 * `pad` (Phase 6) and `pointer` (Phase 5) are gated too (the UI covers the game then);
 * an active `travel` intent (Phase 7) overrides every other source.
 */
export type IntentSource = 'keyboard' | 'wheel' | 'pointer' | 'pad' | 'travel';

export interface SourcedIntent {
  source: IntentSource;
  intent: Partial<Intent>;
  /** `travel` only: when true it replaces all other sources this frame. */
  active?: boolean;
}
