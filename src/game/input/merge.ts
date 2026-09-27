/**
 * Folds every input source into the one per-frame `Intent` (ARCHITECTURE.md → Input). Pure, so
 * the precedence rules — travel overrides, modal gating — are unit-tested without Phaser.
 */
import { NO_INTENT, type Intent, type SourcedIntent } from './intent';

export interface MergeOptions {
  /** A panel or the menu is open (`ui:modal`): the UI owns the keys, so every source is gated. */
  modalOpen: boolean;
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function complete(partial: Partial<Intent>): Intent {
  return {
    moveX: clamp(partial.moveX ?? NO_INTENT.moveX),
    run: partial.run ?? NO_INTENT.run,
    jumpPressed: partial.jumpPressed ?? NO_INTENT.jumpPressed,
    jumpHeld: partial.jumpHeld ?? NO_INTENT.jumpHeld,
    interactPressed: partial.interactPressed ?? NO_INTENT.interactPressed,
    menuPressed: partial.menuPressed ?? NO_INTENT.menuPressed,
  };
}

/**
 * An active `travel` source replaces everything, even while a modal is open (fast travel starts
 * from the menu). Otherwise a modal gates every source; the rest sum `moveX` (clamped to
 * [−1, 1], so opposite sources cancel) and OR the booleans. An inactive `travel` source is an
 * ordinary contributor.
 */
export function mergeIntents(
  sources: readonly SourcedIntent[],
  { modalOpen }: MergeOptions
): Intent {
  const travel = sources.find((s) => s.source === 'travel' && s.active);
  if (travel) return complete(travel.intent);
  const out = complete({});
  if (modalOpen) return out;
  let moveX = 0;
  for (const { intent } of sources) {
    moveX += intent.moveX ?? 0;
    out.run ||= intent.run ?? false;
    out.jumpPressed ||= intent.jumpPressed ?? false;
    out.jumpHeld ||= intent.jumpHeld ?? false;
    out.interactPressed ||= intent.interactPressed ?? false;
    out.menuPressed ||= intent.menuPressed ?? false;
  }
  out.moveX = clamp(moveX);
  return out;
}
