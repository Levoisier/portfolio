/**
 * Plain game constants (no Phaser import). Movement values are "tune by feel" starting points
 * (ARCHITECTURE.md → Player); layout validation derives jump rules from them via `jumpApex()`.
 */
/** World dimensions are owned by `world/layout.ts` (the data model); re-exported here so the
 * rest of the game can keep importing them from `config.ts`. */
export { GROUND_Y, WORLD_H, WORLD_W } from './world/layout';
/** Character cell and the baseline its feet stand on (ARCHITECTURE.md → Rendering contract). */
export const CELL = 64;
export const CELL_BASELINE = 60;
export const PANDA_ART_H = 48;
/** How often debug stats go out on the bus. */
export const DEBUG_STATS_MS = 500;

// ─── Player physics ──────────────────────────────────────────────────────────
/** px/s² — the arcade world gravity. */
export const GRAVITY = 900;
/** px/s. */
export const WALK_SPEED = 90;
export const RUN_SPEED = 150;
/** px/s (negative = up). */
export const JUMP_VELOCITY = -330;
/** Early release of jump multiplies an upward vy by this (variable jump height). */
export const JUMP_CUT = 0.5;
/** ms after walking off a ledge during which a jump still counts as grounded. */
export const COYOTE_MS = 90;
/** ms a jump press is remembered before landing. */
export const JUMP_BUFFER_MS = 120;
/** Horizontal acceleration toward the target speed, px/s² (ground / air) and braking. */
export const GROUND_ACCEL = 1400;
export const GROUND_DECEL = 1800;
export const AIR_ACCEL = 900;
/** Air-frame timing (ARCHITECTURE.md → Player). */
export const TAKEOFF_MS = 60;
export const LAND_MS = 80;
export const AIR_APEX_VY = 60;
/** Fixed collision box, bottom-centre on the cell baseline: offset (22, 16) in the 64×64 cell. */
export const PLAYER_BODY = { w: 20, h: 44 } as const;
export const PLAYER_BODY_OFFSET = {
  x: (CELL - PLAYER_BODY.w) / 2,
  y: CELL_BASELINE - PLAYER_BODY.h,
} as const;
/** Arcade physics step used by layout validation (the game sets the measured refresh rate). */
export const LAYOUT_STEP_HZ = 60;

// ─── Camera ──────────────────────────────────────────────────────────────────
/** Width (art px) of the centred band the panda moves in without the camera following. */
export const CAMERA_DEADZONE_W = 64;
/** Follow smoothing time constant, ms (alpha = 1 − exp(−dt / τ)). */
export const CAMERA_TAU_MS = 90;
/** How far ahead of the panda (art px, in its facing direction) the camera aims. */
export const CAMERA_LOOKAHEAD = 24;

// ─── Stations (Phase 5) ───────────────────────────────────────────────────────
/** Gap (art px) between a station's top edge and the interact-prompt glyph above it. */
export const STATION_GLYPH_GAP = 6;

// ─── Wheel / trackpad walking ────────────────────────────────────────────────
/** Pixels per line for `deltaMode === 1`, and per page for `deltaMode === 2`. */
export const WHEEL_LINE_PX = 16;
export const WHEEL_PAGE_PX = 400;
/** Walking time earned per wheel pixel, and the most that can be banked. */
export const WHEEL_MS_PER_PX = 2.5;
export const WHEEL_MAX_MS = 450;
