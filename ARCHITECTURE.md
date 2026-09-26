# ARCHITECTURE.md

Technical reference for the game portfolio. `GAME_DESIGN.md` is the _what_; this is the _how_.
Anything marked **(Phase N)** does not exist yet — BACKLOG.md phase N builds it. Everything else
exists today.

---

## Stack

| Layer          | Choice                          | Notes                                                                |
| -------------- | ------------------------------- | -------------------------------------------------------------------- |
| Shell          | Astro 5, `output: 'static'`     | HTML shell, meta/OG, pre-rendered DOM panels, bundles TS via Vite    |
| Game engine    | Phaser **4.2.x** (MIT)          | Arcade physics, animations, input, loader, particles, filters        |
| Language       | TypeScript strict               | `noUncheckedIndexedAccess`, `erasableSyntaxOnly`; Phaser ships types |
| Unit tests     | Vitest (`environment: 'node'`)  | Pure logic, content, palette, manifest, pipeline                     |
| E2E tests      | Playwright (`@playwright/test`) | Pinned to 1.56.1 to match the container's preinstalled Chromium      |
| Asset pipeline | Node ≥ 22.18 + sharp            | TypeScript run natively by Node (type stripping); `pnpm assets`      |
| Package mgr    | pnpm                            | Use the lockfile; never npm/yarn                                     |
| Deploy         | Vercel static                   | `vercel.json` at root; the site is **not installable** (no PWA)      |

No other runtime dependency without an ADR in DECISIONS.md (bundle budget below).

**Phaser 4 vs your Phaser 3 memory.** Phaser 4 (stable since April 2026) keeps most of the v3 API,
but: custom WebGL pipelines became render nodes; FX + masks became **Filters** — call
`obj.enableFilters()` first (WebGL only; `obj.filters` is `null` before that), then e.g.
`obj.filters.internal.addGlow(color, outer, inner)`; cameras have `camera.filters.internal/external`
ready; **bloom is not a filter** — use `Phaser.Actions.AddEffectBloom(cameraOrObjects, config)`.
`setTintFill()` became `setTint()` + `setTintMode()`, `Geom.Point` → `Vector2`, `Mesh`/`Plane` are
gone, lighting is `sprite.setLighting(true)`. Trust `node_modules/phaser/types/phaser.d.ts` over
memory — `pnpm check` rejects v3-only calls. Source: https://phaser.io/news/2026/05/phaser-3-vs-phaser-4

---

## Folder map

```
art/                          ← media SOURCES (never served directly)
  manifest.json               ← asset registry: every media id + geometry (exists)
  raw/                        ← Cristian's deliveries, named <id>.png (user-owned; agents never edit)
  reference/                  ← concept sheet + slicing map + helper references (exists; `pnpm references`)
scripts/
  verify.sh                   ← the gate (exists)
  make-references.ts          ← generates art/reference helpers (exists)
  assets/                     ← asset pipeline: cli.ts, pipeline.ts, lib/ + tests (exists)
src/
  content/                    ← ALL portfolio content, bilingual, typed + tested (exists)
  design/palette.{json,ts}    ← the only color definitions (exists)
  styles/tokens.css           ← CSS mirror of the palette + fonts/z-index/spacing (exists)
  assets/registry.ts          ← typed view of art/manifest.json (exists)
  assets/runtime.ts           ← types of public/game/assets.json — pipeline ↔ game contract (exists)
  policy/                     ← repo-policy tests, e.g. not-a-PWA (exists)
  i18n/                       ← lang.ts (default/persistence) + ui.ts (UI strings) (exists)
  shared/                     ← bus, motion preference, layout-mode, debug hook types (exists)
  game/                       ← everything Phaser (shell exists; Phase 3+ adds the rest)
    boot.ts                   ← NO static import of phaser (or anything importing it); after first
                                paint runs `const { startGame } = await import('./main')`
    main.ts                   ← the only entry that statically imports phaser + scenes; creates the game
    config.ts                 ← plain constants (physics, camera, body box); `import type` only
    render/zoom.ts            ← pure zoom/viewport math (unit-tested)
    render/follow.ts          ← pure integer camera follow (unit-tested)
    quality.ts                ← tier detection + runtime downgrade
    context.ts                ← session state shared by main.ts and the scenes (registry `ctx`)
    load-plan.ts              ← inlined manifest + tier → exact loader calls (pure, unit-tested)
    text/                     ← pixel-font.ts (pure rasterizer) + bitmap-font.ts (registers it)
    render/viewport.ts        ← watches #screen in device px + DPR changes
    scenes/                   ← BootScene (load), WorldScene (play)
    player/                   ← logic.ts (pure state machine) + PandaSprite.ts
    input/                    ← intent sources: keyboard, wheel, pointer, touch pad, travel; merge.ts (pure)
    world/                    ← layout.ts (data) + validate.ts (pure) + builders
    stations/                 ← station objects, triggers, prompts
    fx/                       ← sky, parallax, particles, filters (tiered)
    travel/                   ← plan.ts (pure) + auto-walk (Phase 5/7)
  ui/                         ← DOM: main.ts (page entry), loading, fonts, debug overlay; later HUD, panels, menu, pad
  components/                 ← Astro components: Loading, Hud (exists); pre-rendered panels (Phase 5+)
  pages/index.astro           ← the single page
public/
  media/projects/…            ← content media (Fiora screenshots) — referenced from src/content
  game/                       ← GENERATED by `pnpm assets` (gitignored — never edit, never commit)
tests/e2e/                    ← Playwright specs
```

---

## Runtime overview

```
index.astro (static HTML)
 ├─ <head> meta, OG, JSON-LD Person, fonts
 ├─ <script type="application/json" id="assets">  public/game/assets.json inlined AT BUILD TIME
 ├─ #loading   DOM loading screen (portrait + name + progress + walking runner)   ← paints first
 ├─ #screen    <canvas> mount (the game)                                           ← Phaser
 ├─ #hud       DOM: name badge, Contact, ES·EN, sound, menu, prompt live region
 ├─ #pad       DOM touch controls (handheld / landscape-touch only)
 ├─ #panels    pre-rendered <section data-panel="…" hidden> for EVERY panel, both languages
 └─ #menu      DOM map / fast-travel list
       ▲                    │
       │   typed event bus  │   src/shared/bus.ts — the ONLY game↔UI channel
       └────────────────────┘
```

1. `index.astro` reads `public/game/assets.json` with Node `fs` at build time (`null` if the
   pipeline has not run) and inlines it. Nothing fetches the manifest at runtime, and the page
   requests only files listed in it — **zero failed requests**, even with an empty `public/game/`.
2. The HTML paints the loading screen immediately; `src/game/boot.ts` then dynamic-imports
   `./main` (Phaser ~353 KB gzip) after first paint, so the engine never blocks it.
3. `BootScene` reads the inlined manifest, loads only the active tier's assets, reports progress
   on the bus, then starts `WorldScene`. With no manifest it draws code placeholders.
4. `WorldScene` builds the level from `world/layout.ts`, spawns the panda (or at a `/#<id>` deep
   link) and runs the loop.
5. The UI listens on the bus and emits intents back. The game never touches DOM; the UI never
   touches Phaser objects.

**Bus contract:** `src/shared/bus.ts` exports a typed emitter keyed by an `Events` map;
adding an event = adding a key with its payload type. Known events: `game:progress`, `game:ready`,
`zone:enter`, `station:enter`, `station:leave`, `station:open`, `panel:closed`, `ui:modal`
`{ open: boolean }`, `menu:open`, `travel:to`, `travel:arrived`, `lang:change`, `sound:toggle`,
`input:wheel`, `fonts:ready`, `tier:change`, `debug:stats`. No `window` custom events for game↔UI
traffic. The bus remembers each event's last payload: `on(event, fn, { replay: true })` also
receives it immediately (the lazy game chunk subscribes after `fonts:ready` and the initial
`lang:change` have already fired).

**Entry points:** `src/ui/main.ts` is the page's only script. It reads the inlined manifest, sets
`html[data-mode]`, mounts the loading screen, loads the fonts, emits the initial `lang:change`
and calls `boot({ parent: #screen, manifest, debug })`. The game receives the mount element
and the manifest as arguments; it never queries the DOM. `main.ts` may style its own canvas
(offset) because Phaser owns that element.

---

## Rendering contract (pixel-perfect)

- **Art pixel** = one pixel of the art as drawn. Grid = **16** art px. Character cell = **64×64**;
  the panda is **~48 art px** tall and stands on **baseline y = 60**: the lowest opaque row of every
  frame is row 59, rows 60–63 are empty, and the physics body's bottom edge maps to cell y = 60.
- The canvas backing store is **low resolution** (art px) and is upscaled by the browser by an
  **integer factor in device pixels** with `image-rendering: pixelated`. No non-integer scaling of
  art anywhere, ever.
- **Zoom math** (`src/game/render/zoom.ts`, pure, unit-tested), with `screen*_dev` the screen
  rectangle in device px (`ResizeObserver` `devicePixelContentBoxSize` where supported, else
  `floor(css × dpr)`):
  - `zoom = max(1, min(floor(screenH_dev / targetViewHeight), floor(screenW_dev / 200)))` (device
    px per art px — the 200 px minimum width is met by lowering zoom, never by widening the canvas
    past its screen);
  - backing = `min(960, floor(screenW_dev / zoom))` × `floor(screenH_dev / zoom)` art px;
  - CSS size = `backing × zoom / dpr`; the remainder is letterboxed in `--c-ink-900` and the canvas
    offset is a whole number of **device** px (`round(remainder_dev / 2) / dpr`).
- Target view heights: **desktop 360**, **handheld 240**, **landscape-touch 240**. Unit-test at
  least: 1920×1080@1 → zoom 3 → 640×360 · 1440×900@1 → 2 → 720×450 · 1440×900@2 → 5 → 576×360 ·
  1366×657@1 → 1 → 960×657 · 1536×730@1.25 → 2 → 960×456 · handheld 390×420@3 → 5 → 234×252 ·
  handheld 390×506@3 → 5 → 234×303 (the width rule lowers zoom from 6).
- **Phaser config:** `type: Phaser.AUTO` (WebGL; filters and lighting are WebGL-only),
  `pixelArt: true` (implies `roundPixels`, `antialias: false`, `image-rendering` on the canvas),
  `scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER }`, game size = backing
  size. Phaser's Scale Manager ignores `devicePixelRatio`; its `zoom` is **CSS px per game px**. On
  every change call, in this order, `game.scale.resize(backingW, backingH)` then
  `game.scale.setZoom(zoom / dpr)` (non-integer is fine, e.g. 5/3). Never the reverse (`resize()`
  only rewrites the CSS size when zoom ≠ 1). Never use `FIT`/`RESIZE`/`EXPAND`, never
  `camera.setZoom()` (camera zoom ≠ 1 disables vertex rounding). Recompute on a `ResizeObserver`
  of `#screen` plus a `matchMedia('(resolution: <dpr>dppx)')` listener (moving the window to
  another monitor fires no resize). `devicePixelContentBoxSize` is trusted only when it agrees with CSS size ×
  DPR (emulated DPR in DevTools/Playwright reports CSS px there).
- **Rounding:** Phaser 4 rounds vertices per object (`vertexRoundMode`, default `safeAuto`: only
  when the object's matrix is a pure translation). A flip counts as a −1 scale, so call
  `setVertexRoundMode('full')` on the panda and every sprite that flips. Never `setScale` art;
  squash and stretch come from frames.
- **Camera:** follow is ours, not Phaser's: `render/follow.ts` (pure) takes the panda x, dt,
  deadzone and view width and returns an **integer** `scrollX` (dt-based smoothing
  `1 − exp(−dt / τ)`, then `Math.round`), clamped to `[0, WORLD_W − viewW]`; the scene applies it
  in `POST_UPDATE`. Do not use `camera.startFollow()` (it resets the camera's `roundPixels` to
  false and scrolls fractionally, per rendered frame). **Vertically bottom-anchored:** on every
  resize call `cam.setBounds(0, WORLD_H − viewH, WORLD_W, viewH)` so `scrollY = WORLD_H − viewH`
  (may be negative) — with bounds of height 480 alone, Phaser pins a taller view to the top. View
  height is usually ≤ 719 art px on desktop and 240–479 on touch, but can be larger when the 200 px
  width rule lowers zoom (390×1000@1 → 390×1000): screen-space layers size to the actual view,
  never to a constant. No vertical follow.
- **World:** height **480**; ground top **y = 432**; the floor strip spans 432–464 and the game
  fills 464–480 with `ink-900`. Everything positions on integer art px. The sky gradient, stars,
  moon and sun are **screen-space** (`setScrollFactor(0)`) and fill the whole view; `bg-*` layers
  are bottom-aligned at `groundY` behind the floor; nothing is drawn in world space above y = 0.
- **Anchors:** where text or an effect sits on art — the gate `sign`, the skill-block `window`
  (union across its frames), the vault wall's `doorway` (a set-item anchor), the bg-far `flare`
  tip — its position is **data**: `anchors` in the manifest (placeholder geometry) and the resolved
  values in `assets.json`. Never hard-code offsets.
- **In-world text** (sign, station labels, element symbols, prompt glyphs) is drawn in canvas in
  a pixel font and must be crisp (binary alpha) at every zoom; long text is DOM only. Preferred
  route: after the UI has loaded the font (`document.fonts.load`, then `fonts:ready` on the bus),
  rasterize Pixelify Sans at the size where one design pixel = 1 px into a canvas, threshold alpha
  at 50 %, register it with `textures.addCanvas` + `cache.bitmapFont.add` and draw with
  `BitmapText`. Glyphs cover Latin-1 incl. á é í ó ú ü ñ Ñ ¿ ¡. (Phaser `Text` is anti-aliased;
  `RetroFont` needs a fixed-width grid.) Implemented in `game/text/` — see DECISIONS.md →
  _In-world pixel text_: Pixelify Sans is rendered at 88 px (8 px per design pixel), the grid
  phase is detected and each 8×8 cell becomes one binary pixel; `add.bitmapText(x, y,
PIXEL_FONT, text, PIXEL_FONT_SIZE)` at integer positions, tinted with a palette color.

## Layout modes

`src/shared/layout-mode.ts` (pure, from matchMedia inputs) is read by the game (zoom screen
rectangle) and the UI (pad). Touch = `matchMedia('(pointer: coarse)').matches` — the primary
pointer, so a touchscreen laptop with a mouse stays `desktop` (never `'ontouchstart' in window`,
which is false under Playwright touch emulation); portrait = `(orientation: portrait)`.

| Mode              | When              | Screen                                              | Controls                |
| ----------------- | ----------------- | --------------------------------------------------- | ----------------------- |
| `desktop`         | not touch         | full viewport                                       | keyboard, wheel, click  |
| `handheld`        | touch + portrait  | top 50 % of the visual viewport (390×844 → 390×420) | DOM D-pad, A, B, START  |
| `landscape-touch` | touch + landscape | full viewport                                       | translucent pad overlay |

Mode is recomputed on resize/orientation change. Respect `env(safe-area-inset-*)`.
`html, body { overflow: hidden; overscroll-behavior: none }` — the page itself never scrolls.

## Quality tiers

`src/game/quality.ts` is the single source of truth for ambience decisions.

- `high` when `(pointer: fine)` and `innerWidth ≥ 1024` CSS px and not `connection?.saveData`
  (declare a local `NavigatorWithConnection` type; the API is Chromium-only, absent = false);
  otherwise `low`. `?tier=high|low` pins the tier and disables the runtime downgrade.
- Runtime guard: if the high tier averages < 50 fps for 3 s, downgrade to `low` for the session.
- The tier returns flags (`parallaxLayers`, `particleScale`, `filters`, `animatedPropRadius`, …)
  that fx/world builders read. Manifest assets with `tier: "high"` load only on `high`.

## Motion preference

`src/shared/motion.ts` exposes `prefersReducedMotion()` + a change listener. Under reduce: no
camera shake, no screen flashes, parallax differential ×0.3, particles minimal, travel uses fades
and door/vault tweens are instant. Player movement stays.

## World model **(Phase 4)**

`src/game/world/layout.ts` is plain typed data (no Phaser import): `width`, `height`, `groundY`,
`zones[]` (id, x-range, sky keyframe), `platforms[]`, `stations[]`, `props[]`, `sky[]`.
`validate.ts` (pure, unit-tested) checks: stations inside their zone; every station id resolves to
a project, confidential or skill-category id in `src/content`, or to `gate | classified | lab |
contact` (`GAME_DESIGN.md` → _Canonical ids_); no overlapping triggers; props on the ground or a
platform; and the jump rules below.

**Jump-derived layout rules** (from `config.ts` via `jumpApex()`): a one-way platform's top is
≤ apex − 4 (≈ 53 px) above the surface it is jumped from; a skill block's bottom edge is between
max(bodyH + 2, PANDA_ART_H + 1) (= 49 px — the panda, ears included, walks under it) and
bodyH + apex − 4 (≈ 97 px — the head reaches it) above the surface beneath it. `config.ts` exports
`PANDA_ART_H = 48`. One-way platforms: static bodies with
`checkCollision.down = left = right = false`.

## Player **(Phase 3)**

- `player/logic.ts` — a **pure**
  `step(prev: PlayerState, intent: Intent, dt: number, body: { grounded: boolean; vy: number; blockedUp: boolean })`
  returning `{ state: PlayerState; vx: number; vy: number | null /* null = leave to physics */; anim: string; frame?: string; flipX: boolean }`;
  `PlayerState` carries the state name (`idle | walk | run | air | land | interact | wave`) and the
  coyote/buffer/land timers. Unit-tested without Phaser.
- Constants (`config.ts`, tune by feel): gravity 900 px/s², walk 90, run 150, jump velocity −330,
  coyote 90 ms, jump buffer 120 ms, jump-cut ×0.5 on early release. Arcade integrates
  semi-implicitly at a fixed step, so the real apex at 60 Hz is **57.75 px** (not v²/2g = 60.5);
  `logic.ts` exports `jumpApex(gravity, v0, stepHz)` and layout validation uses it at 60 Hz. Set
  the arcade `fps` to the measured display refresh (`world.setFPS`) so 120/144 Hz screens don't
  move the body only on alternate frames.
- Body: fixed box `PLAYER_BODY = { w: 20, h: 44 }` (`config.ts`), bottom-centre on the cell
  baseline (offset (22, 16) in the 64×64 cell), so frames never change collision.
- Animations are built from the resolved `frames` in `assets.json`, never from
  `art/manifest.json`. `panda-air` frames are chosen by state, not played by fps: `takeoff` for
  60 ms after a jump, `rise` while vy < −60, `apex` while |vy| ≤ 60, `fall` while vy > 60, `land`
  for 80 ms after touchdown (cancelled by input); `crouch` is unused (no pre-jump delay). If
  `panda-run` resolves to `missing`, the walk animation plays at run speed.

## Input **(Phase 3 / 5 / 6 / 7)**

Every source writes into one per-frame `Intent` (`moveX ∈ [−1, 1]`, `run`, `jumpPressed`,
`jumpHeld`, `interactPressed`, `menuPressed`); merging is pure (`input/merge.ts`) and unit-tested.

- **Keyboard (P3):** register keys with `addKey(code, false)` — **no capture**. Phaser's default
  capture calls `preventDefault` globally on `window` and breaks DOM focus/activation.
- **Modal gating:** while the UI reports `ui:modal { open: true }` (a panel or the menu is open)
  the game ignores keyboard and wheel intents, so Enter/Space/Esc keep their DOM meaning. Gating is
  decided when the key event is **dispatched**, not when Phaser processes it (Phaser queues window
  keydowns until its next step): the UI handles Esc/Enter/Space inside an open panel or the menu on
  keydown and calls `event.stopPropagation()`, and on `ui:modal { open: false }` the game calls
  `this.input.keyboard.resetKeys()` and drops keys pressed before the close — one Esc press never
  both closes a panel and opens the menu.
- **Esc precedence:** Esc (and **B** on the pad) closes the topmost open panel or the menu. Only
  when nothing is open do Esc/M/START open the menu and B/E/Enter interact.
- **Wheel (P3):** `deltaY > 0` (scroll down) walks right, `deltaX` walks too (horizontal swipes),
  normalized for `deltaMode` (lines × 16 px), with a short decay so a flick walks a few steps. HUD
  and letterbox wheel events are forwarded on the bus (`input:wheel`).
- **Pointer / tap (P5):** click or tap a station → the panda walks to it, then opens it (basic
  walk-to-x). **Travel (P7)** adds menu fast-travel and fade-teleport, overriding other sources
  while active.
- **Touch pad (P6):** DOM D-pad ◀ ▶, A (jump), B (interact), START (menu); double-tap-hold ◀/▶ runs.

## Stations & panels **(Phase 5)**

- A station = layout entry (`id`, `kind`, `x`, `asset`, `trigger` width) + a panel id.
- **Prompt:** entering a trigger shows a small pixel key glyph above the prop (canvas, no words)
  and the localized prompt bottom-centre in `#hud` (DOM, `aria-live="polite"`, e.g. `E — Fiora`,
  `B — Fiora`, `Toca — Fiora`).
- **Panels** are Astro components rendered at build time from `src/content`, once per language
  (`<div lang="es-419">` / `<div lang="en">`, visibility from `html[data-lang]`), inside
  `<section data-panel="<id>" hidden>`. The UI un-hides, traps focus, emits `ui:modal`, handles
  `Esc`/close, restores focus and emits `panel:closed`. Search engines and screen readers get all
  content as plain HTML.
- Visited state + language + sound live in `localStorage` (wrapped in try/catch).

## i18n

`src/i18n/lang.ts`: initial language = stored choice → otherwise **ES** (no browser detection; see
DECISIONS.md → _Languages_). Setting a language
updates `html[lang]` (`es-419` or `en`), `html[data-lang]` (`es` or `en`), storage, and emits
`lang:change` (canvas text re-renders). `src/i18n/ui.ts` holds UI strings (`Localized`); content
strings stay in `src/content`.

## Asset pipeline

`pnpm assets` = `node scripts/assets/cli.ts` (TypeScript run natively by Node ≥ 22.18: erasable
syntax only, relative imports with `.ts` extensions, JSON imports `with { type: 'json' }`; it
reuses `ASSET_MANIFEST` and `PALETTE` from `src/`). `pnpm dev` and `pnpm build` chain it
explicitly (`pnpm assets && astro …`) — don't rely on `pre*` lifecycle scripts.

**Sources**, in order: (1) `art/raw/<id>.png`; (2) reference slices
(`art/reference/*.slices.json`); (3) for **required** assets only, a generated placeholder.
Optional assets with no raw file and no slices resolve to `source: 'missing'` (no file) and the
game applies its documented fallback.

**Background detection** from the image border: transparent source = ≥ 95 % of border pixels have
alpha < 128; else green (hue 120° ± 22°, s and v > 0.3) for ≥ 95 % → HSV chroma key; else black
(max channel ≤ 16) for ≥ 95 % → flood-fill from the borders (4-connected) with threshold = the
source's declared `backgroundThreshold` (slices file, or the manifest entry's override) if present, else
(max channel of the outer border) + 4 — **never** a global black key (the fur is black too);
anything else is rejected with a warning.

**Edge cleanup** (green sources): after the key, erode the opaque mask by
`max(1, round(sourcePx / 3))` source px (`sourcePx` = source px per art px) and clear any pixel
within 2 px of the key boundary whose G exceeds max(R, B) + 24 — otherwise scarlet/green blends
snap to khaki.

**Frames & items:**

- Reference sources use the slices boxes in **array order** (no sorting); frames = boxes; baked
  ground shadows are stripped (`shadow` params in the slices file), then frames are re-trimmed.
- Raw sources: components are grouped into rows by vertical overlap and read **row-major** (grids
  from PixelLab work). Frames = the N largest components, where N = manifest frames (+1 ruler) or
  the item count; for loops, frame candidates are the components ≥ 30 % of the largest (the ruler
  included), N = candidates − ruler, at least 2. Every other component ≥ 0.5 % of the median frame
  area merges into the frame with the nearest bbox (paws, scarf tails); smaller specks are
  dropped. The **ruler** (leftmost frame) is dropped — and used for scaling — only when background
  detection returned **green** and the entry has `ruler: true`; transparent sources never carry
  one. A strip with `frameNames` needs the exact count; otherwise the raw file is rejected with a
  warning and the next source is used.

**Scaling** (one factor per strip; see sets below): native pixel art (≤ 64 unique opaque colors) is never
resampled — if every run is a multiple of an integer k > 1 it is an upscaled export and is
downscaled by exactly 1/k with nearest. Fake pixel art is resampled with `kernel: 'lanczos3'` (or
premultiplied box filtering) by a factor from: the ruler frame scaled to 48 px (green-screen
strips with `ruler: true`), frame 1 (state strips, `fps: 0`), the slices file's `scale` (reference
sheet), or the tallest frame → `targetHeight` (everything else). The report warns when a frame is
taller than `targetHeight` + 2. Sprites are fitted inside `maxSize[0]` × `targetHeight`, preserving
aspect. **Sets:** free items share one factor — the tightest fit of any free item into its `size`
(they're drawn at the same scale) — and are bottom-centred; `fill` items (platforms, fence panels)
are scaled on their own to exactly `size[0]` wide and aligned `top`/`bottom` in their box, with a
warning if the aspect differs by more than 10 % (native fill items warn when their width differs).

**Per pixel:** snap to `src/design/palette.json` (nearest in OKLab, no dithering) → alpha ≥ 50 % →
remove 1-px orphan islands.

**Packing:** strip frames go bottom-up onto the entry's `baseline` (lowest opaque row =
baseline − 1), centred on the centroid x of the opaque pixels in their lowest 25 % of rows (the
feet), rounded down. Sprites are written tightly trimmed. Sets become one Phaser JSON-hash atlas
(`/game/<id>.png` + `/game/<id>.json`, frame keys = item names), each item bottom-centred in its
`size`.

**Layers and tile-strips:** key → trim → (seamless) find the loop point: the column c in the right
30 % of the content whose column best matches column 0 (mean OKLab ΔE; warn when it exceeds 0.05),
crop to [0, c) → scale uniformly to width `size[0]` → place into `size[1]`: layers bottom-aligned,
tile-strips top-aligned; overflowing rows are cropped with a warning. (Repeat-period detection by
autocorrelation for tile-strips is a possible refinement, not implemented.)

**Anchors:** for delivered art, detect rect anchors — the largest solid `navy-900`/`navy-950`
rectangle for `sign`, the largest enclosed transparent hole for `window` (per frame, united), the
largest `navy-950` rectangle for a set item's `doorway` — and write them to `assets.json`; point
anchors (`flare`) are measured by an agent when the art lands and written to the manifest (a
data-only change). Placeholders draw them: `window` punched transparent, `doorway` `navy-950`,
`sign` `navy-900`, a point anchor as a 4-px `navy-900` stack from the ground up to it.

**Placeholders** (no text): strips → per frame an `ink-700` rounded box of targetHeight ×
round(targetHeight × 0.7) with a 1-px `ink-900` outline and a `scarlet-500` dot whose x moves with
the frame index, on the baseline; sprites → `maxSize[0]` × targetHeight box in `navy-700` with a
`navy-400` outline; set items → their `size` box; tile-strip → `ink-700` with a 2-px `paper-500`
top edge; layers → transparent canvas with seamless flat skyline blocks (`bg-far` `navy-900`,
`bg-mid` `navy-700`) covering at most the bottom 60 %.

**Output:** PNGs via
`sharp(...).png({ palette: true, colours: 256, quality: 100, effort: 10, dither: 0 })`, then read
back: every pixel with alpha > 0 must be exactly a palette color and alpha ∈ {0, 255}, else rewrite
as RGBA `png({ palette: false, compressionLevel: 9 })` (lower settings silently re-quantize to
off-palette colors). Writes `public/game/assets.json` per `src/assets/runtime.ts` and a console
report: frames found vs expected, clipping, mean and p95 OKLab ΔE of the palette snap (warn if
p95 > 0.12), seam error, anchors. Deterministic; cached in
`node_modules/.cache/portfolio-assets/<id>.json`, keyed by sha256 of the source bytes, the manifest
entry, `palette.json`, the slices file and the pipeline's own source files.

**Exit codes:** `pnpm assets` fails only for an invalid `art/manifest.json` or an internal error —
never for art quality (a bad delivery falls back and warns, so it cannot take the deploy down).
`pnpm assets --strict` turns warnings into failures for manual/CI runs.

Known source traits are logged in LESSONS.md (AI "fake pixel art": ~100 k colors, no grid, uneven
frame sizes, baked shadows, black-on-black fur).

## Testing strategy

- **Unit (Vitest):** co-located `*.test.ts`. Required for every pure module (content, palette,
  manifest, zoom, follow, quality decisions, layout mode, input merge, player logic, layout
  validation, travel planning, pipeline steps with small fixture images — e.g. a scarlet disc
  anti-aliased onto `#00FF00` must produce no `paper-700` edge pixels).
- **Phaser import boundary:** only `src/game/main.ts`, `scenes/**`, `player/PandaSprite.ts`,
  `stations/**` and `fx/**` may import `phaser` at runtime; everything else (incl. `.astro`,
  `src/ui`, `src/shared`, `src/i18n`, pure modules) may use top-level `import type … from 'phaser'`
  only — never inline `{ type X }` (with `verbatimModuleSyntax` it leaves a runtime
  `import {} from 'phaser'`), and never import an allow-listed module either. Phaser throws
  `window is not defined` in Node, which breaks `astro build` and Vitest. ESLint enforces all of
  it; `boot.ts` loads `main.ts` with `import()`, which the rule allows. World builders and input
  sources receive the scene and use it (`scene.physics.add.staticGroup()`,
  `scene.input.keyboard.addKey('SPACE', false)`) instead of importing Phaser.
- **E2E (Playwright):** `tests/e2e/*.spec.ts`; `pnpm test:e2e` builds and serves its own preview on
  port **4323** (never reuses a server), projects `desktop` (1440×900) and `mobile` (390×844,
  touch). Baseline (smoke spec): no console errors, no failed requests or HTTP ≥ 400, not
  installable. The no-manifest case is covered by building with `PORTFOLIO_NO_ASSETS=1`, which makes
  `index.astro` treat the manifest as `null` and builds into `dist-no-assets/` (projects `no-assets`
  and `no-assets-mobile`, served on port 4324, run the smoke and shell specs). Shell spec: canvas
  non-blank via `locator('canvas').screenshot()` pixel variance (the WebGL drawing buffer is not
  preserved), `#loading` disappears, `getBoundingClientRect()` × dpr within 0.1 px of an integer
  multiple of the backing size. Each phase adds specs; move the mouse onto the canvas before
  `page.mouse.wheel`.
- **Debug/test hook:** with `?debug` (or in dev), `window.__PORTFOLIO__` exposes `getState()`
  (ready, paused, tier, mode, zoom, dpr, backing size, fps, lang, pixelFont, pandaTexture) and
  `setTier(t)`, plus an FPS/zoom/tier/mode overlay (`debug:stats` on the bus); Phase 3 adds
  `teleport(x)`, Phase 5 `openStation(id)` (types in `src/shared/debug.ts`).
  E2E uses it instead of simulating long walks.
- Visual checks: specs save screenshots to `test-results/`; review them before claiming a visual
  acceptance criterion.

## Performance budgets

| Budget                              | Target                                     |
| ----------------------------------- | ------------------------------------------ |
| HTML + inline CSS (gzip)            | ≤ 60 KB                                    |
| App JS excluding Phaser (gzip)      | ≤ 80 KB                                    |
| Phaser chunk (gzip)                 | ~383 KB measured in P2 (custom build opt.) |
| Game assets, high tier / low tier   | ≤ 1.2 MB / ≤ 0.7 MB                        |
| Loading screen visible (mobile, 4G) | ≤ 1.5 s                                    |
| Playable (mobile, 4G)               | ≤ 4 s                                      |
| Frame rate                          | 60 fps desktop, ≥ 50 fps mid-range phone   |

## SEO & sharing **(Phase 10/12)**

Title/description from `src/content/profile.ts`, OG + Twitter card with a 1200×630 image captured
from the game by a script, JSON-LD `Person`, `robots.txt`, favicon set generated from
`panda-portrait` (head crop). All panel content is in the static HTML.

**Not installable.** The site is deliberately not a PWA: no web app manifest, no service worker,
no `apple-mobile-web-app-capable` / `mobile-web-app-capable` meta, no install prompt. Favicons
(`favicon.ico`, PNG sizes, `apple-touch-icon` as a bookmark icon) are fine.
`src/policy/no-pwa.test.ts` and the e2e smoke test enforce this.
