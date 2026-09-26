# BACKLOG.md — Game rebuild roadmap

The ordered plan for building the game portfolio described in GAME_DESIGN.md. One phase = one
agent session = one PR. Phases are sized so an agent can finish, test and verify one without
guessing.

## How to work this backlog (agents)

1. Pick the **first unchecked phase whose dependencies are checked** (see the graph). Phases on
   the same row of the graph can run in parallel on separate branches.
2. Read AGENTS.md → GAME_DESIGN.md → ARCHITECTURE.md → the phase below → any ASSETS.md rows it
   names → LESSONS.md entries for the same area.
3. Branch `feat/p<N>-<short-summary>` from the integration branch (`next` — see README →
   _Branching & deploy_) unless the environment assigns a branch; open the PR into it.
4. Implement **only** that phase. If you find a problem in another phase's code, fix it only if
   it blocks you, and say so in the PR.
5. Add the tests the phase lists. Run `pnpm verify` and `pnpm test:e2e`; both must pass.
6. Check every acceptance criterion in a running `pnpm preview` at **desktop 1440×900** and
   **mobile 390×844 (touch)**; attach or describe the screenshots.
7. Update ARCHITECTURE.md if a contract changed, DECISIONS.md for any new dependency or
   reversed decision, LESSONS.md for any gotcha, ASSETS.md statuses if media arrived. Check the
   phase box. Commit per AGENTS.md.

**Media never blocks a phase.** Missing art falls back to the interim panda
(`art/reference`) or pipeline placeholders with final geometry. When real art lands, it must
drop in with zero code changes.

## Dependency graph

```
P0 foundation ✅
 ├─ P1 asset pipeline ─┐
 └─ P2 game shell ─────┴─ P3 panda controller ─ P4 world ─ P5 stations & panels ─┬─ P6 mobile
                                                                                  ├─ P7 menu, HUD, a11y
                                                                                  ├─ P8 classified wing
                                                                                  ├─ P9 reagent lab
                                                                                  └─ P10 gate & contact
                                                              P4 + P8–P10 ─ P11 ambience & audio
                                                                   everything ─ P12 launch
```

## Media schedule (Cristian)

| Wave | Assets (ASSETS.md)                                    | Wanted by  | If late                      |
| ---- | ----------------------------------------------------- | ---------- | ---------------------------- |
| A    | panda-idle, walk, air, interact, wave                 | P3         | interim panda from the sheet |
| B    | floor-plant, platforms, bg-far, bg-mid                | P4         | placeholder skyline + floor  |
| C    | 6 stations, vault, dossier, skill-block, contact-post | P5, P8–P10 | placeholder boxes, same size |
| D    | props-misc, flask-bubbling (+ optional)               | P11        | ambience ships without them  |

---

## Phase 0 — Foundation ✅

### [x] chore: reset the repo for the game rebuild

Done: old scroll-site code and media removed (history kept in git at `51bbf3c`); content
extracted to `src/content/` (typed, bilingual, tested); palette + CSS tokens; asset registry
(`art/manifest.json`, `src/assets/registry.ts`); reference sheet + interim slicing map; Phaser
4.2.1, Vitest and Playwright installed; `pnpm verify`, `pnpm test`, `pnpm test:e2e`; docs
rewritten (AGENTS, GAME_DESIGN, ARCHITECTURE, ASSETS, DECISIONS, BACKLOG, LESSONS, README).

---

## Phase 1 — Asset pipeline

### [ ] feat(assets): `pnpm assets` — normalize art/raw into public/game

**Goal:** any image Cristian drops in `art/raw/<id>.png` (Nano Banana green-screen or PixelLab
transparent) becomes a clean, palette-snapped, correctly packed game asset — and every missing
asset still yields a usable interim/placeholder file with the final geometry.

**Depends on:** P0. **Media:** none (uses `art/reference/panda-sheet-v1.png`).

**Acceptance criteria**

- `scripts/assets/` Node CLI (TypeScript run via the repo toolchain, or `.mjs` with JSDoc
  types), wired as `pnpm assets` and run automatically by `predev` and `prebuild`.
- Implements the processing steps in ARCHITECTURE.md → _Asset pipeline_ for every manifest
  kind (`strip`, `sprite`, `set`, `layer`, `tile-strip`) and the source order
  raw → reference slices → placeholder.
- Background removal: existing alpha kept; `#00FF00` chroma key in HSV with edge cleanup;
  black flood-fill for the reference sheet (threshold in the slices file).
- One scale factor per strip; palette snap in OKLab against `src/design/palette.json`; binary
  alpha; orphan-pixel cleanup; bottom-centre packing on baseline `cellHeight − 4`.
- Layers/tile-strips: measured seam error; warning above a threshold; best-effort loop-point crop.
- Outputs `public/game/<id>.png` (+ `<id>@<item>.png` or an atlas for sets — document which),
  `public/game/manifest.json` (per id: resolved frames, frame size, source, warnings), and a
  console report table. `public/game/` stays gitignored.
- Interim panda: `panda-idle`, `panda-walk`, `panda-run`, `panda-air` come out of the reference
  sheet looking like the panda (not blobs); others are placeholders.
- Deterministic (same input → byte-identical output) and cached by input hash.

**Tests:** unit tests with tiny fixture PNGs (generated in-test with sharp): chroma key,
component grouping incl. satellite merge, scale-factor choice, palette snap, alpha binarize,
packing/baseline, seam measurement, placeholder geometry, manifest output shape.

**Manual check:** run `pnpm assets`; open `public/game/panda-walk.png` scaled ×8 — frames
aligned on one baseline, only palette colors, no green fringe. Paste the report in the PR.

**Files:** `scripts/assets/**`, `package.json`, `.gitignore`, `LESSONS.md`.
**Out of scope:** using the assets in the game (P2+).

---

## Phase 2 — Game shell

### [ ] feat(shell): page, loading screen, Phaser boot, pixel-perfect zoom, tiers, bus, i18n

**Goal:** a page that paints instantly, boots Phaser lazily into a pixel-perfect canvas at the
right integer zoom for every screen, with the plumbing every later phase uses.

**Depends on:** P0 (uses P1 output if present; must also boot with an empty `public/game/`).
**Media:** none.

**Acceptance criteria**

- `src/pages/index.astro` + `src/components/` shell per ARCHITECTURE.md → _Runtime overview_:
  `#loading`, `#screen`, `#hud` (empty slots), `#panels`, `#menu`; `<html lang>` +
  `data-lang` set before first paint.
- Fonts via `@fontsource`: **Pixelify Sans** (display/UI) and **Inter** (panel body), subset to
  latin + latin-ext; declared in `tokens.css`.
- Loading screen (DOM/CSS only): the name, a pixel progress bar fed by `game:progress`, the
  walking panda from `public/game/panda-walk.png` via CSS `steps()` (static fallback if absent).
- `src/game/boot.ts` dynamic-imports Phaser after first paint; `BootScene` loads
  `/game/manifest.json` and tier-appropriate assets; an empty `WorldScene` shows a solid
  `navy-900` background and a centered interim panda idle loop.
- `src/game/render/zoom.ts` (pure) implements the rendering contract; the canvas is crisp
  (no smoothing) at 1280×720, 1440×900@1 and @2, 1920×1080, 2560×1440, 390×844@3, 844×390@3;
  resize/orientation re-computes without reload.
- Layout mode detection (`desktop | handheld | landscape-touch`) + `src/game/quality.ts`
  (tiers, `?tier=` override, runtime FPS downgrade) + `src/shared/motion.ts`.
- `src/shared/bus.ts` typed event bus; `src/i18n/lang.ts` + `src/i18n/ui.ts` per
  ARCHITECTURE.md → _i18n_.
- In-world pixel-text technique chosen, prototyped on one label, recorded in DECISIONS.md.
- `?debug` overlay (fps, zoom, view size, tier, mode) + `window.__PORTFOLIO__` hook.
- Pauses the game loop when the tab is hidden.

**Tests:** unit — zoom math (every example in ARCHITECTURE.md), layout mode, tier decision,
lang detection; e2e — no console errors, canvas non-blank, `#loading` disappears, canvas CSS
size × dpr is an integer multiple of its backing size (desktop + mobile projects).

**Manual check:** screenshots at the sizes above; zoom a screenshot ×4 — pixels are square
blocks, no blur.

**Files:** `src/pages/`, `src/components/`, `src/game/{boot,config,quality}.ts`,
`src/game/render/`, `src/game/scenes/`, `src/shared/`, `src/i18n/`, `src/styles/tokens.css`,
`tests/e2e/`, `DECISIONS.md`.
**Out of scope:** movement, world, UI content.

---

## Phase 3 — Panda controller

### [ ] feat(player): responsive platformer movement, animations, camera, keyboard + wheel

**Goal:** moving the panda feels great.

**Depends on:** P1, P2. **Media:** wave A (interim frames until then).

**Acceptance criteria**

- `player/logic.ts` pure state machine per ARCHITECTURE.md → _Player_; `PandaSprite` plays
  `panda-idle | walk | run | air(frames by name) | interact | wave`, flips for left, never
  changes collision box with frames. Missing `panda-run` → walk animation at run speed.
- Constants in `config.ts`; coyote time, jump buffer, variable jump height (jump cut) all work.
- Input: keyboard (← → A D, Shift, Space W ↑, E Enter, M Esc) and **wheel/trackpad → walk**
  (deltaY maps to moveX with decay; a flick walks a few steps, not across the world).
  Pure `input/merge.ts`.
- Camera follow per the rendering contract (lerp + deadzone, bottom-anchored, world bounds).
- A temporary flat ground (placeholder floor) and one test platform; landing plays the `land`
  frame; no jitter between panda and ground at any zoom.

**Tests:** unit — state transitions (idle→walk→run, jump from coyote window, buffered jump,
jump cut, land), input merge incl. wheel decay; e2e — press → moves right, Space → leaves the
ground and returns, wheel → walks.

**Manual check:** 60 fps in the debug overlay while running back and forth; screenshots.

**Files:** `src/game/player/`, `src/game/input/`, `src/game/config.ts`,
`src/game/scenes/WorldScene.ts`, `tests/e2e/`.

---

## Phase 4 — World: layout, ground, sky, parallax

### [ ] feat(world): the level from data — ground, platforms, night→dawn sky, parallax

**Depends on:** P3. **Media:** wave B (placeholders until then).

**Acceptance criteria**

- `world/layout.ts` with every zone in GAME*DESIGN.md (x-ranges, station slots, platforms for
  the Reagent lab, prop slots) + `world/validate.ts` (pure) per ARCHITECTURE.md → \_World model*.
- Ground built from `floor-plant` tiles across the world; platforms from the `platforms` set
  with arcade collision (one-way from below).
- Sky drawn in code: gradient keyframes by player x (night → darkest night → pre-dawn →
  sunrise) from palette colors only, stars that fade toward dawn, a moon. Smooth, no banding
  jumps (step through palette colors deliberately — ordered dithering allowed).
- Parallax: `bg-far`, `bg-mid` (+ `bg-fore` on high tier only when present), tiled
  seamlessly, scroll factors from the manifest; reduced motion lowers the differential.
- Zone ids are exposed in the debug overlay and on the bus (`zone:enter`).

**Tests:** unit — layout validation (fails on a deliberately broken layout), sky interpolation;
e2e — teleport to each zone via the hook, screenshot, zone event fires.

**Files:** `src/game/world/`, `src/game/fx/{sky,parallax}.ts`, `WorldScene.ts`, `tests/e2e/`.

---

## Phase 5 — Stations & project panels

### [ ] feat(stations): project stations, prompts, DOM panels, visited, deep links

**Depends on:** P4. **Media:** the 5 project stations of wave C (placeholders until then).

**Acceptance criteria**

- Station objects for the 5 projects at their layout slots; trigger zones; a prompt (pixel
  text, localized: key / **B** / tap hint for the current input) appears on enter and hides on
  leave.
- Panels pre-rendered at build from `src/content/projects.ts`, both languages, per
  ARCHITECTURE.md → _Stations & panels_: title, description, stack chips, platform note, live
  link (`target="_blank" rel="noopener noreferrer"`), and for Fiora an accessible screenshot
  gallery (thumbnails → full image, arrows, Esc).
- Open via interact or clicking/tapping the prop (click far away → panda walks there, then
  opens). While open: game input paused, panda plays `interact`, focus trapped, `Esc`/close
  restores focus to the canvas. Closing never leaves the panda stuck in `interact`.
- Visited marks persisted; `/#<id>` deep link spawns at the station and opens its panel;
  closing updates the hash.
- Panel visual style: pixel frame (CSS, palette tokens), Pixelify Sans headings, Inter body,
  AA contrast.

**Tests:** unit — trigger enter/leave logic, hash parsing; e2e — walk/teleport to each station,
open, check title text in ES and EN, close with Esc, deep link `/#japaniracer`, Fiora gallery.

**Files:** `src/game/stations/`, `src/components/panels/`, `src/ui/panels.ts`, `tests/e2e/`.

---

## Phase 6 — Mobile: handheld mode & touch

### [ ] feat(mobile): handheld layout, touch pad, tap-to-interact

**Depends on:** P5 (P3 minimum). **Media:** none (controls are CSS/SVG).

**Acceptance criteria**

- `handheld` (portrait touch): game screen on top, pad below — D-pad ◀ ▶, **A** (jump),
  **B** (interact), START (menu) — styled as a pixel handheld with palette tokens; ≥ 48 px
  targets; multi-touch (hold ▶ + tap A works).
- `landscape-touch`: full-screen game with a translucent pad overlay; zoom recomputed.
- Tap a station on screen → walk there + open (same as click).
- No page scroll/zoom/pull-to-refresh/long-press menus inside the game area; safe-area insets
  respected; optional `navigator.vibrate` tick on jump/interact (Android).
- Low tier on phones; 50+ fps on a mid-range device profile (throttled Chromium ok).

**Tests:** e2e (mobile project) — pad visible in portrait, touch ▶ moves, A jumps, B opens a
station, rotate to landscape keeps playing, no horizontal page overflow.

**Files:** `src/ui/pad.ts`, `src/components/Pad.astro`, `src/game/input/touch.ts`, `tests/e2e/`.

---

## Phase 7 — Menu, fast travel, HUD & accessibility

### [ ] feat(ui): map/fast-travel menu, HUD, controls hint, keyboard/screen-reader path

**Depends on:** P5.

**Acceptance criteria**

- Menu (M / Esc / HUD button / START): every stop in world order with visited ✓; choosing one
  auto-runs the panda there (fade-teleport if > 1.5 screens away), then opens its panel.
  Pure `travel/plan.ts`.
- HUD per GAME_DESIGN.md: name badge, **Contact** (opens the contact panel from anywhere —
  stub until P10), `ES · EN` toggle (instant, no reload, canvas text updates), sound toggle
  (state only until P11), menu button.
- First-visit controls hint (input-aware), hidden after first movement, remembered.
- Keyboard-only: every panel reachable from the menu; visible focus rings; logical tab order;
  panels are dialogs with labels; `prefers-reduced-motion` behavior per ARCHITECTURE.md.
- Recruiter test: from page load, a project panel is open in ≤ 10 s using only the mouse
  (click a station or the menu) and only the keyboard.

**Tests:** unit — travel planner; e2e — menu → each stop opens its panel; language toggle
switches panel + HUD text; keyboard-only run-through; axe-core scan (add `@axe-core/playwright`
with an ADR) has no serious violations.

**Files:** `src/ui/{menu,hud,hint}.ts`, `src/components/`, `src/game/travel/`, `src/i18n/ui.ts`.

---

## Phase 8 — Classified wing

### [ ] feat(confidential): vault door, redacted dossiers, NDA-safe panels

**Depends on:** P5. **Media:** confidential-vault, confidential-dossier (placeholders until then).

**Acceptance criteria**

- Fence + `CLASIFICADO / CLASSIFIED` sign (pixel text), vault `closed` → interact → `open`
  (camera nudge off under reduced motion), wing light shifts toward scarlet.
- Four dossier stations from `src/content/confidential.ts`; panels show exactly industry, role,
  stack, impact, duration, team size, with a CSS redaction-bar reveal. **Golden Rule 3.**
- Scanner light sweep on the high tier only.

**Tests:** e2e — vault opens, each dossier panel renders only the allowed fields in both
languages; the existing content test still guards the data.

**Files:** `src/game/stations/`, `src/components/panels/`, `src/game/fx/`.

---

## Phase 9 — Reagent lab (stack)

### [ ] feat(skills): element blocks, periodic board, stack panel

**Depends on:** P5. **Media:** skill-block (placeholder until then).

**Acceptance criteria**

- 8 category blocks on the lab platforms, tinted with `SKILL_CATEGORY_COLOR`; bump from below
  (head hits block) or interact → `bump` → `used`; the category's skills pop out as element
  tiles (symbol + number in pixel text) and arc into a periodic board on the lab wall.
- Board completion → small celebration + the Stack panel opens once (full accessible list:
  symbol, name, category, proficiency); the panel is always reachable from the menu.
- Progress persisted; blocks reset only via a "reset lab" control in the panel.

**Tests:** unit — bump detection, board slot layout from skill numbers; e2e — bump all
blocks via the hook, board complete, panel lists all 34 skills in ES and EN.

**Files:** `src/game/stations/skills*.ts`, `src/components/panels/StackPanel.astro`.

---

## Phase 10 — Gate intro & sunrise contact

### [ ] feat(story): gate intro, contact finale, meta/OG basics

**Depends on:** P5. **Media:** station-spawn-gate, contact-post (+ optional panda-sleep,
panda-celebrate).

**Acceptance criteria**

- Gate: signboard with the name + roles in pixel text (localized); intro beat — panda asleep
  (`panda-sleep` or idle) → wakes → waves; skippable by any input; plays once per session.
- Contact post at the lookout: `idle` → `active` on approach; panel with the call to action +
  all `profile.contact` links; the HUD Contact button opens the same panel from anywhere.
- Finale: arriving with every station visited → `panda-celebrate` (or wave) + "thanks"
  line + fast travel back.
- `<title>`, meta description, OG/Twitter tags, JSON-LD `Person` from `src/content/profile.ts`.

**Tests:** e2e — intro skippable, contact links present with correct hrefs, HUD Contact works
from the gate, meta tags present.

**Files:** `src/game/stations/`, `src/components/panels/ContactPanel.astro`, `src/pages/`.

---

## Phase 11 — Ambience & audio

### [ ] feat(fx): desktop diorama ambience, lean mobile, optional audio

**Depends on:** P4, P8–P10. **Media:** wave D.

**Acceptance criteria**

- Tiered per GAME*DESIGN.md → \_Ambience tiers*: steam/ember/star particles, animated props
  (flask, flare flame, blinking lights), Phaser 4 filters (glow/bloom) on lamps, screens and the
  flare — **high tier only**; low tier stays within the mobile budget.
- Props from `props-misc` placed via layout data.
- Audio (ADR first): procedural SFX (jump, bump, open, close, vault) + optional ambient loop;
  off by default, remembered, unlocked on first user gesture; never autoplays.
- Runtime downgrade verified: forcing low fps on high tier switches to low.

**Tests:** e2e — high vs low tier object counts via the hook; sound toggle persists; reduced
motion disables shake/flash.

**Files:** `src/game/fx/`, `src/game/audio/`, `DECISIONS.md`.

---

## Phase 12 — Launch

### [ ] chore(launch): budgets, polish, share assets, cross-device QA, go live

**Depends on:** everything.

**Acceptance criteria**

- Performance budgets in ARCHITECTURE.md met (report numbers in LESSONS.md); Lighthouse mobile
  ≥ 80 performance, ≥ 95 accessibility, 100 SEO/best practices.
- OG image captured from the game by a script; favicon set from `panda-idle` frame 0.
- Cross-device QA list: Chrome/Safari/Firefox desktop, iOS Safari, Android Chrome; portrait +
  landscape; 60 Hz + 120 Hz displays.
- Optional: gamepad support; Phaser custom build if it saves ≥ 80 KB gzip.
- Merge `next` into `main` → Vercel production. (Until this phase `main` keeps serving the
  current site; see README → _Branching & deploy_.)

**Files:** various.
