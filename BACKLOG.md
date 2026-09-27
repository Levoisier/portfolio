# BACKLOG.md — Game rebuild roadmap

The ordered plan for building the game portfolio described in `GAME_DESIGN.md`. One phase = one
agent session = one PR. Phases are sized so an agent can finish, test and verify one without
guessing.

## How to work this backlog (agents)

1. Pick the **first unchecked phase whose _Depends on_ phases are all checked**. Siblings under
   the same parent in the graph (P1 ∥ P2; P6 ∥ P7; P8 ∥ P9 ∥ P10) can run in parallel on separate
   branches.
2. Read AGENTS.md → `GAME_DESIGN.md` → ARCHITECTURE.md → the phase below → any ASSETS.md rows it
   names → LESSONS.md entries for the same area.
3. Branch `feat/p<N>-<short-summary>` from the integration branch **`next`** (README →
   _Branching & deploy_) unless the environment assigns a branch; open the PR into `next`. If
   `next` does not exist, or AGENTS.md mentions GSAP/scenes, you are on the old site: stop and ask
   Cristian.
4. Implement **only** that phase. If you find a problem in another phase's code, fix it only if it
   blocks you, and say so in the PR.
5. Add the tests the phase lists. Run `pnpm verify` and `pnpm test:e2e`; both must pass.
6. Check every acceptance criterion in a running `pnpm preview` at **desktop 1440×900** and
   **mobile 390×844 (touch)**; review the screenshots, then attach or describe them.
7. Update ARCHITECTURE.md if a contract changed, DECISIONS.md for any new dependency or reversed
   decision, LESSONS.md for any gotcha, ASSETS.md statuses if media arrived. Check the phase box.
   Commit and open the PR per AGENTS.md.

**Media never blocks a phase.** Missing required art falls back to the interim panda
(`art/reference`) or pipeline placeholders with final geometry; missing optional art resolves to
`missing` and the documented fallback. When real art lands it must drop in with **zero code
changes** (positions on art come from anchors, frame counts from `assets.json`).

## Dependency graph

```
P0 foundation ✅
 ├─ P1 asset pipeline ─┐
 └─ P2 game shell ─────┴─ P3 panda controller ─ P4 world ─ P5 stations & panels ─┬─ P6 mobile
                                                                                  └─ P7 menu, HUD, a11y ─┬─ P8 classified wing
                                                                                                         ├─ P9 reagent lab
                                                                                                         └─ P10 gate & contact
                                                                  P6–P10 ─ P11 ambience & audio
                                                               everything ─ P12 launch
```

## Media schedule (Cristian)

| Wave | Assets (ASSETS.md)                                                                                                    | Wanted by  | If late                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| A    | panda-idle, walk, air, interact, wave (+ optional run); portrait ✅                                                   | P3         | interim panda from the sheet                                          |
| B    | floor-plant, platforms, bg-far, bg-mid                                                                                | P4         | placeholder skyline + floor                                           |
| C    | **gate first**, then 6 stations, vault, dossier, skill-block, contact-post, props-zones (+ optional sleep, celebrate) | P5, P8–P10 | placeholder boxes with anchors, same size; intro/finale use idle/wave |
| D    | props-misc, flask-bubbling (+ optional bg-fore, flare-flame)                                                          | P11        | placeholders, same size (props-misc and flask are required)           |

---

## Phase 0 — Foundation ✅

### [x] chore: reset the repo for the game rebuild

Done: old scroll-site code and media removed (history kept in git at `51bbf3c`); content in
`src/content/` (typed, bilingual, tested — incl. tagline, section copy, category symbols);
palette + CSS tokens; asset registry (`art/manifest.json`, `src/assets/registry.ts`) and the
runtime contract (`src/assets/runtime.ts`); reference sheet + slicing map + helper references
(`pnpm references`); `panda-portrait` delivered; Phaser 4.2.1, Vitest, Playwright; ESLint Phaser
import boundary; not-a-PWA policy tests; docs rewritten and reviewed.

---

## Phase 1 — Asset pipeline ✅

### [x] feat(assets): `pnpm assets` — normalize art/raw into public/game

**Goal:** any image Cristian drops in `art/raw/<id>.png` (Nano Banana green-screen or PixelLab
transparent) becomes a clean, palette-snapped, correctly packed game asset, and every missing
**required** asset still yields an interim/placeholder file with the final geometry.

**Depends on:** P0. **Media:** none (uses `art/reference/*`).

**Acceptance criteria**

- `scripts/assets/` in TypeScript run natively by Node (`"assets": "node scripts/assets/cli.ts"`,
  erasable syntax, `.ts` import extensions, JSON `with { type: 'json' }`), reusing
  `ASSET_MANIFEST` and `PALETTE`. `package.json`: `"dev": "pnpm assets && astro dev"`,
  `"build": "pnpm assets && astro build"` (no `pre*` hooks).
- Implements ARCHITECTURE.md → _Asset pipeline_ exactly: source order incl. `missing` for optional
  assets; background detection (alpha / green / black with the threshold rule); edge cleanup;
  frames & items (reference array order + shadow strip; row-major grouping; satellites; ruler
  frame; `frameNames` exact); scaling rules (native vs fake, ruler, state strips, sheet `scale`,
  fit into `maxSize`/`size`); OKLab palette snap; binary alpha; orphan cleanup; feet-centroid
  packing on `baseline`; sets as JSON-hash atlases; layer/tile-strip loop-point + alignment;
  anchor detection; placeholders as specified; palette-exact PNG output with read-back check.
- Writes `public/game/assets.json` conforming to `src/assets/runtime.ts` (type-checked by importing
  the types) and prints the report (frames found vs expected, clipping, ΔE mean/p95, seam error,
  anchors). Deterministic; cached per ARCHITECTURE; exits non-zero only for an invalid manifest or
  an internal error; `--strict` turns warnings into failures.
- Interim panda: `panda-idle`, `panda-walk`, `panda-run`, `panda-air` come out of the reference sheet
  with paws intact, baked ground shadows removed, feet (not shadow) on the baseline, and one
  consistent scale; `panda-portrait` comes out ~77×100 with solid legs (threshold rule → 6).

**Tests:** unit tests with tiny fixture PNGs generated in-test with sharp: green key + edge
cleanup (a scarlet disc anti-aliased onto `#00FF00` yields no `paper-700` edge pixels), black
flood-fill threshold rule, component grouping (row-major grid, satellite merge, ruler drop),
scale-factor choice (native k-upscale, ruler, state strip, tallest frame), palette snap, alpha
binarize, feet-centroid packing on baseline, loop-point + seam measurement, placeholder geometry
per kind, `missing` for optional assets, PNG read-back is palette-exact, `assets.json` shape.

**Manual check:** run `pnpm assets`; open `public/game/panda-walk.png` scaled ×8 — frames on one
baseline, paws present, no shadow bar, only palette colors, no green or khaki halo. Paste the
report in the PR.

**Files:** `scripts/assets/**`, `package.json`, `src/assets/*` (only if the contract needs a
field — update ARCHITECTURE.md with it), `art/manifest.json` (data only), `ARCHITECTURE.md`,
`LESSONS.md`.
**Out of scope:** using the assets in the game (P2+).

---

## Phase 2 — Game shell ✅

### [x] feat(shell): page, loading screen, Phaser boot, pixel-perfect zoom, tiers, bus, i18n

**Goal:** a page that paints instantly and boots Phaser lazily into a pixel-perfect canvas at the
right integer zoom on every screen, with the plumbing every later phase uses.

**Depends on:** P0 (uses P1 output when present; must boot with **zero failed requests** when
`public/game/` is empty). **Media:** none.

**Acceptance criteria**

- `src/pages/index.astro` + `src/components/` shell per ARCHITECTURE.md → _Runtime overview_:
  `#loading`, `#screen`, `#hud` (empty slots + prompt live region), `#panels`, `#menu`;
  `<html lang="es-419" data-lang="es">` (or the stored choice) set before first paint;
  `html, body { overflow: hidden; overscroll-behavior: none }`.
- `index.astro` reads `public/game/assets.json` at build time (`null` if missing) and inlines it
  as `<script type="application/json" id="assets">`; nothing fetches it at runtime.
- Fonts via `@fontsource/pixelify-sans` + `@fontsource-variable/inter` (the ADR already covers
  them — record the exact packages), latin + latin-ext, declared in `tokens.css`.
- Loading screen (DOM/CSS): the name and a pixel progress bar fed by `game:progress`; when the
  inlined manifest exists, also `panda-portrait` (integer-scaled, `image-rendering: pixelated`) and
  the walking runner via CSS `steps(<resolved frames>)`. Without a manifest: name + bar only.
- `src/game/boot.ts` (no Phaser import) dynamic-imports `./main` after first paint; `BootScene`
  loads the tier's assets from the inlined manifest; an empty `WorldScene` shows `navy-900` and the
  interim panda idle loop, or a code-drawn 64×64 placeholder when no manifest exists.
- `render/zoom.ts` implements the rendering contract (every ARCHITECTURE example as a unit case)
  and the Phaser scale recipe (Scale `NONE`, `resize()` then `setZoom(zoom / dpr)`, ResizeObserver +
  DPR listener). The canvas is crisp at 1280×720, 1366×657@1, 1440×900@1 and @2, 1536×730@1.25,
  1920×1080, 2560×1440, 390×844@3, 844×390@3; resize/orientation recompute without reload.
- `src/shared/layout-mode.ts`, `src/game/quality.ts` (tier rule, `?tier=` pins it, runtime FPS
  downgrade), `src/shared/motion.ts`, `src/shared/bus.ts` (events per ARCHITECTURE),
  `src/i18n/lang.ts` + `src/i18n/ui.ts` per ARCHITECTURE → _i18n_.
- In-world pixel-text technique prototyped on one label (preferred route in ARCHITECTURE) and
  recorded in DECISIONS.md.
- `?debug` overlay (fps, zoom, view size, tier, mode) + `window.__PORTFOLIO__` hook.
- Pauses the game loop when the tab is hidden.

**Tests:** unit — zoom math, layout mode, tier decision, lang default/persistence; e2e — no console
errors and no failed requests, both with the pipeline's manifest and with none (a second
Playwright project builds with `PORTFOLIO_NO_ASSETS=1`, which `index.astro` treats as a `null`
manifest; a unit test covers manifest → request list), canvas non-blank (screenshot
variance), `#loading` disappears, canvas `getBoundingClientRect()` × dpr within 0.1 px of an
integer multiple of the backing size (desktop + mobile).

**Manual check:** screenshots at the sizes above; zoom one ×4 — square pixel blocks, no blur.

**Files:** `src/pages/`, `src/components/`, `src/game/{boot,main,config,quality}.ts`,
`src/game/render/`, `src/game/scenes/`, `src/shared/`, `src/i18n/`, `src/styles/tokens.css`,
`package.json`, `tests/e2e/`, `DECISIONS.md`.
**Out of scope:** movement, world, UI content.

---

## Phase 3 — Panda controller ✅

### [x] feat(player): responsive platformer movement, animations, camera, keyboard + wheel

**Goal:** moving the panda feels great and never jitters.

**Depends on:** P1, P2. **Media:** wave A (interim frames until then).

**Acceptance criteria**

- Pure `player/logic.ts` `step()` per ARCHITECTURE.md → _Player_ (signature, states, timers,
  `jumpApex()`); constants and `PLAYER_BODY` in `config.ts`; arcade `fps` set to the display refresh.
- `PandaSprite` builds animations from the resolved `assets.json` frames, plays idle / walk / run
  (walk at run speed if `panda-run` is `missing`) / air frames **by state** / interact / wave,
  flips for left with `setVertexRoundMode('full')`, never changes the collision box with frames.
- Coyote time, jump buffer and jump cut work.
- Input per ARCHITECTURE.md → _Input_: keys via `addKey(code, false)` (← → A D, Shift, Space W ↑,
  E Enter, M Esc), `ui:modal` gating, wheel/trackpad walking (`deltaY` and `deltaX`, `deltaMode`,
  decay, `input:wheel` forwarding). Pure `input/merge.ts`.
- Camera per the rendering contract via pure `render/follow.ts` (integer scroll, dt-based
  smoothing with a deadzone, clamped) and bottom anchoring with
  `cam.setBounds(0, WORLD_H − viewH, WORLD_W, viewH)`.
- A temporary flat ground (placeholder floor) and one test platform; landing shows the `land`
  frame; no jitter between panda and ground at any zoom, facing either way, at 60 and 120 Hz.

**Tests:** unit — state transitions (idle→walk→run, coyote jump, buffered jump, jump cut, land,
head bump), `jumpApex(900, 330, 60) ≈ 57.75`, input merge incl. wheel decay and modal gating,
follow (integer output, deadzone, clamp); e2e — ArrowRight moves right, Space leaves the ground and
returns, wheel over the canvas walks, a focused DOM button still activates with Enter/Space.

**Manual check:** 60 fps in the debug overlay while running back and forth; ×4 screenshots of the
panda standing still facing left and right show no sub-pixel shimmer.

**Files:** `src/game/player/`, `src/game/input/`, `src/game/render/follow.ts`, `src/game/config.ts`,
`src/game/scenes/WorldScene.ts`, `tests/e2e/`.

---

## Phase 4 — World: layout, ground, sky, parallax ✅

### [x] feat(world): the level from data — ground, platforms, night→dawn sky, parallax

**Depends on:** P3. **Media:** wave B (placeholders until then).

**Acceptance criteria**

- `world/layout.ts` with every zone and canonical id in `GAME_DESIGN.md` (x-ranges, station slots,
  Reagent-lab platforms and block slots, prop slots) + pure `world/validate.ts` per ARCHITECTURE →
  _World model_ (incl. the jump-derived rules).
- Ground: `floor-plant` tiled across the world at y 432–464, `ink-900` fill 464–480; platforms from
  the `platforms` atlas as one-way static bodies.
- Sky in screen space, drawn in code from palette colors only: gradient keyframes by player x
  (night → darkest night → pre-dawn → sunrise), stars fading toward dawn, moon, sunrise sun; step
  through palette colors deliberately (ordered dithering allowed) — no banding jumps.
- Parallax: `bg-far`, `bg-mid` (+ `bg-fore` on the high tier when not `missing`), tiled seamlessly,
  bottom-aligned at `groundY`, scroll factors from the manifest; reduced motion lowers the
  differential.
- Zone ids in the debug overlay and on the bus (`zone:enter`).

**Tests:** unit — layout validation (passes on the real layout, fails on deliberately broken ones:
unreachable platform, block out of bump range, unknown id), sky interpolation; e2e — teleport to
each zone via the hook, screenshot, `zone:enter` fires.

**Files:** `src/game/world/`, `src/game/fx/{sky,parallax}.ts`, `WorldScene.ts`, `tests/e2e/`.

---

## Phase 5 — Stations & project panels ✅

### [x] feat(stations): project stations, prompts, DOM panels, visited, deep links

**Depends on:** P4. **Media:** the 6 project stations of wave C (placeholders until then).

**Acceptance criteria**

- Station objects for the 6 projects at their layout slots, trigger zones, and the prompt per
  ARCHITECTURE.md → _Stations & panels_ (pixel glyph above the prop + DOM live-region text,
  localized, input-aware).
- Panels pre-rendered at build from `src/content/projects.ts`, both languages
  (`lang="es-419"` / `lang="en"`): title, description, stack chips, platform note, live link
  (`target="_blank" rel="noopener noreferrer"`), and for Fiora an accessible screenshot gallery
  (thumbnails → full image, arrows, Esc).
- Open via interact, or click/tap the prop (click far away → basic walk-to-x, then open). While open:
  `ui:modal` open, game input paused, panda plays `interact`, focus trapped; Esc/close restores focus
  to the canvas; the panda never stays stuck in `interact`.
- Visited marks persisted; `/#<id>` deep links spawn at the station and open its panel; closing
  updates the hash.
- Panel style: pixel frame (CSS, palette tokens), Pixelify Sans headings, Inter body, AA contrast.

**Tests:** unit — trigger enter/leave, hash parsing, walk-to-x target; e2e — teleport to each
station, open, title text in ES and EN, close with Esc, deep link `/#japaniracer`, Fiora gallery,
Enter/Space activate links inside an open panel, Esc on an open panel closes it and the game doesn't
react to that key press.

**Files:** `src/game/stations/`, `src/game/travel/`, `src/components/panels/`, `src/ui/panels.ts`,
`tests/e2e/`.

---

## Phase 6 — Mobile: handheld mode & touch ✅

### [x] feat(mobile): handheld layout, touch pad, tap-to-interact

**Depends on:** P5. **Media:** none (controls are CSS/SVG).

**Acceptance criteria**

- `handheld` (portrait touch): game screen in the top 50 % of the visual viewport, pad below —
  D-pad ◀ ▶, **A** (jump), **B** (interact / close), START (menu) — styled as a pixel handheld with
  palette tokens; ≥ 48 px targets; multi-touch (hold ▶ + tap A); double-tap-and-hold ◀/▶ runs.
- `landscape-touch`: full-screen game with a translucent pad overlay; zoom recomputed.
- Tap a station on screen → walk there + open.
- No page scroll/zoom/pull-to-refresh/long-press menus inside the game; safe-area insets
  respected; optional `navigator.vibrate` tick on jump/interact (Android).
- Low tier on phones; ≥ 50 fps on a throttled mid-range profile.

**Tests:** e2e (mobile project + 360×740@3) — pad visible in portrait, touch ▶ moves, A jumps,
double-tap-hold ▶ reaches run speed, B opens a station and closes it, rotate to landscape keeps
playing, no horizontal page overflow.

**Files:** `src/ui/pad.ts`, `src/components/Pad.astro`, `src/game/input/touch.ts`, `tests/e2e/`.

---

## Phase 7 — Menu, fast travel, HUD & accessibility ✅

### [x] feat(ui): map/fast-travel menu, HUD, intro & contact panels, keyboard/screen-reader path

**Depends on:** P5.

**Acceptance criteria**

- Menu (M / Esc / HUD button / START, precedence per ARCHITECTURE → _Input_): every stop in world
  order plus the dossier sub-entries, mapped per `GAME_DESIGN.md` → _Canonical ids_, with visited ✓; choosing one auto-runs the panda there (fade-teleport if > 1.5 screens
  away), then opens its panel. Stops whose phase hasn't merged open a stub panel titled with the
  stop name. Pure `travel/plan.ts`.
- HUD per `GAME_DESIGN.md`: name badge (opens the `intro` panel: name, roles, tagline, summary,
  contact links), **Contact** (opens the `contact` panel — built here from `profile.contact` and
  `callToAction`, reused by P10's contact post), `ES · EN` toggle (instant, no reload, canvas text
  updates), sound toggle (state only until P11), menu button.
- First-visit controls hint (input-aware), hidden after first movement, remembered.
- Keyboard-only: every panel reachable from the menu; visible focus rings; logical tab order;
  panels are labelled dialogs; `prefers-reduced-motion` per ARCHITECTURE.
- Recruiter test: from page load, a project panel is open in ≤ 10 s using only the mouse, and
  using only the keyboard.

**Tests:** unit — travel planner; e2e — menu → each stop opens its panel (or stub); Esc on an
open panel closes it and the menu stays closed; language toggle
switches panel + HUD text; keyboard-only run-through; the recruiter test timed; an axe-core scan
(`@axe-core/playwright`, add with an ADR) has no serious violations.

**Files:** `src/ui/{menu,hud,hint}.ts`, `src/components/`, `src/game/travel/`, `src/i18n/ui.ts`.

---

## Phase 8 — Classified wing

### [ ] feat(confidential): vault door, redacted dossiers, NDA-safe panels

**Depends on:** P7. **Media:** confidential-vault, confidential-dossier, props-zones (placeholders
until then).

**Acceptance criteria**

- Fence panels and beacons from `props-zones`; `CLASIFICADO / CLASSIFIED` sign plate + text drawn
  in code; the vault `door` over the `wall` doorway rolls aside on interact (integer-pixel tween,
  instant under reduced motion, camera nudge off under reduced motion); wing light shifts toward
  scarlet; beacon blinks in code.
- Four dossier stations from `src/content/confidential.ts`; panels show exactly industry, role,
  stack, impact, duration, team size, with a CSS redaction-bar reveal. **Golden Rule 3.** Headings
  from `sectionCopy.confidential`.
- Scanner light sweep on the high tier only.

**Tests:** e2e — vault opens, each dossier panel renders only the allowed fields in both languages;
the content test still guards the data.

**Files:** `src/game/stations/`, `src/components/panels/`, `src/game/fx/`.

---

## Phase 9 — Reagent lab (stack)

### [ ] feat(skills): element blocks, periodic board, stack panel

**Depends on:** P7. **Media:** skill-block, props-zones (placeholders until then).

**Acceptance criteria**

- 8 category blocks at the layout's block slots (validated bump range); each block's `window`
  anchor filled with `SKILL_CATEGORY_COLOR` behind the sprite and the `skillCategorySymbols` symbol in
  pixel text; bump from below (head hits the block: `blockedUp`) or interact → `bump` → `used`
  (window `ink-600`); the category's skills pop out as element tiles (symbol + number in pixel
  text) and arc into the periodic board on the lab wall (drawn in code).
- Fume hood and lab shelves from `props-zones` dress the lab.
- Board completion → small celebration + the `stack` panel opens once (full accessible list:
  symbol, name, category, proficiency; heading from `sectionCopy.skills`); always reachable from
  the menu.
- Progress persisted; blocks reset only via a "reset lab" control in the panel.

**Tests:** unit — bump detection, board slot layout from skill numbers; e2e — bump all blocks via
the hook, board complete, panel lists all 34 skills in ES and EN.

**Files:** `src/game/stations/skills*.ts`, `src/components/panels/StackPanel.astro`.

---

## Phase 10 — Gate intro & sunrise contact

### [ ] feat(story): gate intro, contact post, finale, meta/OG basics

**Depends on:** P7. **Media:** station-spawn-gate, contact-post, props-misc crate (+ optional
panda-sleep, panda-celebrate).

**Acceptance criteria**

- Gate: name and roles in pixel text inside the `sign` anchor (localized; measure that three lines
  fit at the chosen pixel-font size — if not, report it so the sign art can grow); intro beat —
  panda asleep on the crate (`panda-sleep`, or idle if `missing`, with code-drawn "Z"s) → wakes →
  waves; skippable by any input; plays once per session.
- Contact post at the lookout: `idle` → `active` frame on approach; interact opens the `contact`
  panel from P7.
- Finale: arriving with "everything visited" (`GAME_DESIGN.md` → _Canonical ids_) →
  `panda-celebrate` (or wave if `missing`) + code particles + a "thanks" line + fast travel back.
- `<title>`, meta description, OG/Twitter tags, JSON-LD `Person` from `src/content/profile.ts`.

**Tests:** e2e — intro skippable, contact post opens the panel with the correct hrefs, meta tags
present; with the visited keys for the 6 projects, one dossier and `stack` seeded in
`localStorage`, arriving at the lookout plays the finale (visited keys are canonical ids, so this
works before P8/P9 merge).

**Files:** `src/game/stations/`, `src/pages/`, `src/components/`.

---

## Phase 11 — Ambience & audio

### [ ] feat(fx): desktop diorama ambience, lean mobile, optional audio

**Depends on:** P6, P7, P8, P9, P10. **Media:** wave D.

**Acceptance criteria**

- Tiered per `GAME_DESIGN.md` → _Ambience tiers_: steam/ember/star/dust particles (code-generated
  palette squares), animated props (flask, flare flame on the bg-far `flare` anchor, blinking
  lights), glow via `enableFilters()` + `filters.internal.addGlow()` and bloom via
  `Phaser.Actions.AddEffectBloom` on lamps, screens and the flare — **high tier only**; the low tier
  uses dithered halo textures generated at boot and stays within the mobile budget.
- Props from `props-misc` placed via layout data.
- Audio (ADR first): procedural SFX (jump, bump, open, close, vault) + optional ambient loop; off by
  default, remembered, unlocked on first user gesture; never autoplays.
- Runtime downgrade verified: forcing low fps on the high tier switches to low.

**Tests:** e2e — high vs low tier object counts via the hook; sound toggle persists; reduced motion
disables shake/flash.

**Files:** `src/game/fx/`, `src/game/audio/`, `DECISIONS.md`.

---

## Phase 12 — Launch

### [ ] chore(launch): budgets, polish, share assets, cross-device QA, go live

**Depends on:** everything.

**Acceptance criteria**

- Performance budgets in ARCHITECTURE.md met (numbers recorded in LESSONS.md); Lighthouse mobile
  ≥ 80 performance, ≥ 95 accessibility, 100 SEO/best practices.
- OG image captured from the game by a script (with `panda-portrait`); favicon set from the
  `panda-portrait` head crop (favicons only — **no web app manifest, no service worker**; the site
  must not be installable, see DECISIONS.md).
- Cross-device QA: Chrome/Safari/Firefox desktop, iOS Safari, Android Chrome; portrait +
  landscape; 60 Hz + 120 Hz displays; fractional DPR (1.25, 1.5).
- Optional: gamepad support; Phaser custom build if it saves ≥ 80 KB gzip.
- Merge `next` into `main` → Vercel production. (Until this phase `main` keeps serving the current
  site; see README → _Branching & deploy_.)

**Files:** various.
