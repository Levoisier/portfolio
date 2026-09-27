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
  shared/                     ← bus, motion preference, layout-mode, debug hook types, visited,
                                hint, sound (exists)
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
    world/                    ← layout.ts (data) + validate.ts / scenery.ts (pure) + builders
    stations/                 ← trigger.ts (pure) + Stations.ts (prop sprites, glyph, click)
    fx/                       ← scenery (backdrop, terrain, trees), sky, parallax, particles, filters
    travel/                   ← plan.ts (pure walk-to-x + fast-travel run/fade — Phase 7) +
                                deep-link.ts (pure hash parsing)
  ui/                         ← DOM: main.ts (page entry), loading, fonts, debug overlay, panels,
                                pad, menu, hud, hint (exist)
  components/                 ← Astro: Loading, Hud, Pad, Menu, panels/{Panels,IntroPanel,
                                ContactPanel,StubPanels,ContactLinks} (exist)
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
`input:wheel`, `input:pad`, `input:first-move`, `fonts:ready`, `tier:change`, `debug:stats`. No `window` custom events for game↔UI
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
- **Camera:** follow is ours, not Phaser's: `render/follow.ts` (pure) threads a `FollowState`
  (`{ exact, scrollX, screenX }`) across frames — `exact` is a dt-based smoothed chase
  (`1 − exp(−dt / τ)`) of a deadzone target, and `scrollX` is its **integer** projection, clamped
  to `[0, WORLD_W − viewW]`. Deriving `scrollX` from `exact` alone (`Math.round(exact)`) shimmers:
  it snaps on its own schedule while the panda is drawn at `Math.round(x)`, so the two disagree by
  a pixel on some frames. Instead `scrollX` rides the panda's own integer step — the panda's
  on-screen x (`screenX`) holds still — and only deviates once that would drift more than 1 px
  from `exact`, and never against the direction of travel. `snapFollow()` (no easing) seeds this
  state on spawn, teleport and fast-travel. `dtMs` is physics time (steps taken this frame × the
  fixed step), so a frame with no physics step leaves the camera untouched instead of sliding under
  a frozen panda; the scene applies the result in `POST_UPDATE`, after Arcade has synced the
  panda's sprite position from its body (registering the scene's own `POST_UPDATE` listener in
  `create()` runs it after the physics plugin's, which subscribes when the scene boots). Do not use
  `camera.startFollow()` (it resets the camera's `roundPixels` to false and scrolls fractionally,
  per rendered frame). **Refresh:** `render/refresh.ts`'s `RefreshMeter` (fed `game.loop.rawDelta`)
  reports the measured display refresh once; the scene calls `this.physics.world.setFPS(hz)` with
  it so Arcade steps once per rendered frame at 120/144 Hz too. **Vertically ground-anchored:** on
  every resize `WorldScene.layout()` sets `scrollY = cameraScrollY(mode, viewH, GROUND_Y)`
  (`world/scenery.ts`, pure) and `cam.setBounds(0, scrollY, WORLD_W, viewH)` — the ground's top
  edge sits `belowGround(mode, viewH)` px above the view's bottom: 64 on desktop, 72 in
  `landscape-touch`, and `max(96, 30 % of viewH)` in the full-screen `handheld` so the panda walks
  above the pad overlaid on the bottom of the screen. The view may extend past `WORLD_H` (the
  placeholder ground fill is deep enough; the painted terrain wall and the backdrop's lake show
  there). Screen-space layers size to the actual view, never to a constant. No vertical follow.
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

| Mode              | When              | Screen                                         | Controls                |
| ----------------- | ----------------- | ---------------------------------------------- | ----------------------- |
| `desktop`         | not touch         | full viewport                                  | keyboard, wheel, click  |
| `handheld`        | touch + portrait  | full viewport (390×844 → 234×506 art px at ×5) | translucent pad overlay |
| `landscape-touch` | touch + landscape | full viewport                                  | translucent pad overlay |

Mode is recomputed on resize/orientation change. Respect `env(safe-area-inset-*)`.
`html, body { overflow: hidden; overscroll-behavior: none }` — the page itself never scrolls.

**Both touch modes are full-screen** (DECISIONS.md → _Full-screen handheld_). `#screen` covers the
viewport (inside the side safe areas) and `components/Pad.astro` overlays the bottom edge: D-pad
◀ ▶ bottom-left, B and A bottom-right, on a translucent gradient strip whose box has
`pointer-events: none` (only the buttons take taps). There is no START — the HUD's Map button is
always on screen. `shell.css` sets `--pad-clearance` per touch mode; the HUD's hint/prompt column
and dialog content keep that much clear of the bottom edge.

**A handheld dialog is a full-screen sheet.** `section[data-panel]` and `#menu` fill the viewport
(`html[data-mode='handheld']` rules in the global `shell.css`, which out-specify `panel.css`'s
plain base rules thanks to the extra `html[…]` ancestor — never a scoped `<style>` in
`Panels.astro`, whose injected scope attribute would lose that fight only by source order). While
a dialog is open, `src/ui/main.ts` mirrors `ui:modal` onto `html[data-modal]` and the pad hides
everything but **B**, which still closes the dialog exactly like Esc; the sheet's bottom padding
(`--pad-clearance`) keeps its last lines clear of that button. This is also why `--z-pad`
(`tokens.css`) sits above `--z-panel`/`--z-menu`: a `position: fixed` descendant's z-index is
still capped by any ancestor that itself establishes a stacking context (a specified `z-index`) —
the `?debug` overlay used to render inside `#hud` and, however high its own z-index went, could
never paint above a sibling `#pad` outranking `#hud` itself, so `mountDebugOverlay` mounts
straight onto `document.body` (and moves under the HUD in touch modes, where the pad owns the
bottom edge).

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

## World model

`src/game/world/layout.ts` is plain typed data (no Phaser import) and the **owner** of the world's
dimensions: `WORLD_W`, `WORLD_H`, `GROUND_Y` are computed/declared there (`WORLD_W` from the last
zone's `x1`) and re-exported from `config.ts` for the rest of the game to keep importing from one
place. `WORLD_LAYOUT: WorldLayout` holds `width`, `height`, `groundY`, `zones[]` (id, x-range, a
`SkyMood`), `stations[]` (id, kind, x, y, asset id, trigger width — every project, the gate, the
vault, the 4 dossiers and the 8 skill-category blocks; a `block` station's `platformId` names the
platform it sits over), `platforms[]` (id, x, top-surface y, size `s | m | l` — currently the
Reagent lab's 8 one-way platforms), and `props[]` (decorative slots; positions only — the phase
that owns a prop renders it, e.g. Phase 8/9/10, so this starts near-empty). `zoneAt(x, zones?)`
returns the zone containing `x` (clamped to the world).

`validate.ts` (pure, unit-tested) checks: zones are ordered, contiguous and cover `[0, width)`;
every station's `x` falls inside some zone and its `id` resolves to a project, confidential-project
or `SKILL_CATEGORIES` id in `src/content`, or to `gate | classified | lab | contact`
(`GAME_DESIGN.md` → _Canonical ids_); no two stations' trigger spans overlap; every prop rests on
the ground or on a platform at that x; and the jump rules below. It reads platform widths from
`ASSET_MANIFEST` (`assets/registry.ts`) rather than duplicating them (Golden Rule 5).

**Jump-derived layout rules** (from `config.ts` via `jumpApex()`): a one-way platform's top is
≤ apex − 4 (≈ 53 px) above the surface it is jumped from; a skill block's bottom edge is between
max(bodyH + 2, PANDA_ART_H + 1) (= 49 px — the panda, ears included, walks under it) and
bodyH + apex − 4 (≈ 97 px — the head reaches it) above the surface beneath it. `config.ts` exports
`PANDA_ART_H = 48`. One-way platforms: static bodies with
`checkCollision.down = left = right = false`.

**Zone tracking:** `WorldScene` calls `zoneAt(panda.sprite.x)` from its `POST_UPDATE` handler (and
on teleport); a change updates `ctx.zone` (read by the debug hook's `getState().zone`) and emits
`zone:enter` on the bus. The `?debug` overlay appends the zone id to its stats line.

## Scenery

The level's look (GAME*DESIGN.md → \_Look*) is painted, not drawn in code: pure geometry in
`src/game/world/scenery.ts` (unit-tested), Phaser placement in `src/game/fx/scenery.ts`
(`Scenery`, type-only Phaser import). Every piece is optional — without it the code fallbacks
below (sky, parallax skyline, `floor-plant` strip) draw instead, so a no-assets build still works.

- **Backdrop** (`backdrop-landscape` 960×900, `backdrop-portrait` 288×900; manifest kind
  `backdrop`): one screen-space image (`setScrollFactor(0)`, depth −120). `pickBackdrop` chooses by
  aspect (taller than wide → portrait) on every resize. `backdropPlacement` puts the painting's
  `horizon` anchor (its lake line) a fixed distance under the ground line on screen (78 portrait,
  16 landscape), clamped so the image always covers the view — the pipeline padded its top with
  its own sky color for tall views — and pans it across its spare width over the whole level
  (`x = −spare × scrollX / (worldW − viewW)`): parallax without tiling, so there is never a seam.
  When a backdrop is present, `SkyRenderer` and `buildParallax` are not built at all. The pan is
  at most the painting's spare width (≤ 240 px desktop, ≤ 54 px portrait) over the whole 4 620 px
  level — already near-static — so it is the same under `prefers-reduced-motion`.
- **Dawn:** the painting is a night scene; a screen-space `amber-600` rectangle (depth −119,
  additive blend) fades in to 0.32 along `sky.ts`'s `sunAlphaAt(x)` — the same zone-driven curve
  the code sky's sun uses — so the lookout still reads as sunrise.
- **Terrain** (`terrain` sprite, anchors `surface` + `tile` detected by the pipeline): the ground
  is cut into spans by the bridge gaps (`terrainSpans`, the outer spans pushed past the world edges
  by the cap widths so rounded ends only show at a gap), and each span into a left cap, repeated
  `tile` columns (the last one cropped to fit) and a right cap (`terrainPieces`). Pieces are images
  of per-span texture frames, positioned so the `surface` row lands on `GROUND_Y` (depth −30).
- **Bridges** (`bridge` sprite, deck cropped out of its delivery with `sourceCrop`):
  `WORLD_LAYOUT.bridges` holds gap centres; each gap is the bridge width minus 6 px per side, so
  the posts rest on the caps (depth −29). **Visual only** — the ground collider stays one
  continuous body, so movement and every station are unaffected.
- **Trees** (`tree-start` at the gate, `tree-decor` in the wide gaps between stations;
  `WORLD_LAYOUT.trees`, optional `flip` with full vertex rounding): origin-(0, 0) images at
  integer x, rooted 4 px into the terrain lip, behind it (depth −35) and behind every station.

## Sky & parallax (fallback)

Drawn only when no backdrop was delivered (Scenery, above).

Screen-space (`setScrollFactor(0)`), drawn from palette colors only (ASSETS.md → _Drawn in code_);
built and updated by `src/game/fx/sky.ts`'s `SkyRenderer` and `src/game/fx/parallax.ts`'s
`buildParallax()`/`applyParallaxMotion()`. Both modules only ever call methods on the
`Phaser.Scene`/objects they are handed (`import type Phaser from 'phaser'`, never a runtime
import), so their pure functions load directly under Vitest.

- **Sky mood:** each zone carries a `SkyMood` (`deep-night | night | darkest-night | pre-dawn |
sunrise`); `sky.ts`'s `MOODS` maps each to a 4-color top→horizon ramp, a star density, and
  moon/sun visibility. `skyStopsFromZones()` turns the zones into stops: a flat stop at `x = 0`,
  a `[from, to]` pair straddling every mood **change** (not every zone), 240 px wide and centred on
  the change's x, and a flat closing stop at `worldW`. Consecutive same-mood zones (the 6 project
  stations) collapse into one flat run, and each zone keeps a flat, "pure" mood through its middle
  — only a 240 px window around a boundary blends, so e.g. the classified wing reads as genuinely
  "darkest night", not a slow fade across its whole 800 px.
- **`skyPhaseAt(x, stops)`** finds the bracket `[a, b]` around `x` and the blend `t ∈ [0, 1]`
  (`a === b` outside the world, at `t = 0`). `bandColorAt(x, stops, band)` steps the sky's 8
  screen-space rows (`SKY_BANDS`) through the palette: below a band's ordered-dither threshold
  (`BAND_ORDER`, a dispersed, not top-to-bottom, flip order) it shows mood `a`'s ramp color,
  above it mood `b`'s — so a mood change dithers in band by band across the transition's width
  instead of recoloring the whole sky in one "banding jump". `starDensityAt`/`moonAlphaAt`/
  `sunAlphaAt` interpolate linearly (an alpha/count, not a new color, so Golden Rule 4 still holds).
  Stars are a fixed, seeded field (`makeStarField`, deterministic — no `Math.random`): each has a
  screen-fraction position and a priority; it shows once density clears that priority, so stars
  fade in one at a time rather than all at once.
- **`SkyRenderer`** (Phaser adapter): builds `SKY_BANDS` rectangles, a star field sized by
  `tierFlags().particleScale` (capped further under `prefers-reduced-motion`), and a moon/sun
  circle, all `setScrollFactor(0)`. `resize(viewW, viewH)` re-slices the bands to the current view
  (called from `WorldScene.layout()`); `update(x)` repaints everything from the player's x (called
  from `POST_UPDATE`, alongside the camera and zone tracking).
- **Parallax:** `buildParallax()` reads `bg-far` / `bg-mid` / `bg-fore` from the resolved manifest
  (falling back to the documented flat-skyline placeholder — ARCHITECTURE.md → Asset pipeline —
  when a texture is missing), builds one `tileSprite` per active layer bottom-aligned at `groundY`
  in **world** space (normal `scrollFactorY`), and sets `scrollFactorX` to the manifest's
  `scrollFactor` (parallax is horizontal only). `tierFlags().parallaxLayers` (2 low / 3 high) picks
  how many layers load; an optional layer resolved to `missing` is skipped regardless. Depths
  stack sky (−100…−90) behind parallax (−80…−60) behind the floor/gameplay (0). Each tile sprite
  is sized generously wide (`worldW × max(1, scrollFactor) + a max viewport width`) so a
  faster-than-camera layer (`bg-fore`'s 1.25) never runs out of texture before either end of the
  level. `applyParallaxMotion(handle, reduced)` scales each layer's differential from 1 by ×0.3
  under `prefers-reduced-motion` instead of removing it (Motion preference: "parallax differential
  reduced").

## Player

- `player/logic.ts` — a **pure**
  `step(prev: PlayerState, intent: Intent, dt: number, body: { grounded: boolean; vy: number; blockedUp: boolean })`
  returning `{ state: PlayerState; vx: number; vy: number | null /* null = leave to physics */; anim: string; frame?: string; flipX: boolean }`;
  `PlayerState` carries the state name (`idle | walk | run | air | land | interact | wave`) and the
  coyote/buffer/land timers. Unit-tested without Phaser. `grounded` is
  `body.blocked.down && body.vy >= 0` (not `blocked.down` alone): on a frame where Arcade runs no
  physics step right after a jump fires, `blocked.down` still reads the previous step's `true`
  while `vy` is already the launch speed, and would otherwise wipe out the jump.
- **Rest pose:** whenever `step()` returns `idle`, `PandaSprite` stops the running animation
  and shows `panda-idle` frame 0 held still — every action (walk, run, landing, wave, interact)
  ends on the standing pose, never on whatever frame it was on. The idle strip loops (after
  2.5 s standing) only when it is a delivered `raw` strip; the interim frames cut from the
  concept sheet are mid-step poses and would read as the panda frozen mid-stride.
- Constants (`config.ts`, tune by feel): gravity 900 px/s², walk 90, run 150, jump velocity −330,
  coyote 90 ms, jump buffer 120 ms, jump-cut ×0.5 on early release. Arcade integrates
  semi-implicitly at a fixed step, so the real apex at 60 Hz is **57.75 px** (not v²/2g = 60.5);
  `logic.ts` exports `jumpApex(gravity, v0, stepHz)` and layout validation uses it at 60 Hz. Arcade
  physics is configured in `main.ts` (`default: 'arcade'`, `gravity: { x: 0, y: GRAVITY }`); the
  scene sets the arcade `fps` to the measured display refresh (`world.setFPS`, via
  `render/refresh.ts`) so 120/144 Hz screens don't move the body only on alternate frames.
- `player/PandaSprite.ts` is the Phaser adapter: it builds animations only from the resolved
  runtime manifest (`ctx.manifest`, never `art/manifest.json`), reads `BodyReport` from the Arcade
  body each frame, calls `logic.ts`'s `step()`, and copies its output back onto the body/sprite
  (`body.velocity.x` always, `body.velocity.y` only when not `null`, the anim/frame, `setFlipX`).
  Body: fixed box `PLAYER_BODY = { w: 20, h: 44 }` (`config.ts`), bottom-centre on the cell
  baseline (offset (22, 16) in the 64×64 cell); every strip's frame is the same 64×64 cell, so
  `setFrame`/`setTexture` never resizes the body, but `PandaSprite` still reasserts
  `body.setSize`/`setOffset` every frame as a guard. `setVertexRoundMode('full')` (a flipped sprite
  is not vertex-rounded under the default `safeAuto`).
- Animations are built from the resolved `frames` in `assets.json`, never from
  `art/manifest.json`. `panda-air` is never played by fps: it is `setFrame()`'d to the index
  `frameNames` (resolved manifest) gives the state's name (`takeoff`/`rise`/`apex`/`fall`/`land`;
  `crouch` is unused), falling back to indices 1..5 clamped to `frames − 1` when the strip has no
  (or an incomplete) `frameNames`. `takeoff` shows for 60 ms after a jump, `rise` while vy < −60,
  `apex` while |vy| ≤ 60, `fall` while vy > 60, `land` for 80 ms after touchdown (cancelled by
  input). If `panda-run` is `missing` or its texture is absent, `panda-walk` plays instead at
  `timeScale = RUN_SPEED / WALK_SPEED`. A strip whose texture is absent because there is no
  manifest at all falls back to a code-drawn 64×64 placeholder, with no animation.
- **Spawn / teleport:** Arcade reports `blocked.down = false` before its first physics step, which
  would otherwise show one stray air frame. `PandaSprite` forces `grounded = true` on the update
  right after construction and after `teleportTo()` (the debug hook's `teleport(x)`), which also
  zeroes velocity and resets the state machine.

## Input

Every source writes into one per-frame `Intent` (`moveX ∈ [−1, 1]`, `run`, `jumpPressed`,
`jumpHeld`, `interactPressed`, `menuPressed`); merging is pure (`input/merge.ts`) and unit-tested.

- **Keyboard (done):** register keys with `addKey(code, false)` — **no capture** (also
  `input: { keyboard: { capture: [] } }` in `main.ts`'s game config). Phaser's default capture
  calls `preventDefault` globally on `window` and breaks DOM focus/activation. `input/keyboard.ts`
  (adapter) feeds the pure `input/keyboard-state.ts` from Phaser's `Key` down/up events.
- **Modal gating:** while the UI reports `ui:modal { open: true }` (a panel or the menu is open)
  the game ignores keyboard and wheel intents, so Enter/Space/Esc keep their DOM meaning. Gating is
  decided when the key event is **dispatched**, not when Phaser processes it: in Phaser 4.2.1,
  `KeyboardManager`'s `window` listener pushes straight into its `Key` objects and emits
  synchronously (it does not queue until the next step — LESSONS.md has the details, including why
  a replayed event can resurrect an old press). `src/ui/panels.ts` handles Esc (close the topmost
  panel or its gallery lightbox), Tab (focus trap) and Space-on-a-link (button parity) with one
  `document`-level keydown listener — it never needs `stopPropagation()`: on `ui:modal { open:
false }` the game calls `this.input.keyboard.resetKeys()` and `KeyboardState` drops every key
  event stamped at or before that close (`timeStamp <= cutoff`, not `<`), so the very same Esc that
  closed a panel is ignored when Phaser's own `window` listener (later in the bubble phase) reports
  it a moment later — one Esc press never both closes a panel and opens the menu, and a key still
  held through the close needs a fresh `down` (its next auto-repeat) before it counts again.
- **Esc precedence:** Esc (and **B** on the pad) closes the topmost open panel or the menu. Only
  when nothing is open do Esc/M (or the HUD's Map button) open the menu and B/E/Enter interact. The pad's half of this
  is decided in `src/ui/pad.ts` itself, **before** a `B` press ever reaches the bus: it calls
  `PanelsApi.closeTopmost()` (returned by `mountPanels`) and only forwards the press as an ordinary
  `input:pad` event when nothing closed — so, unlike the keyboard's Esc (a real `KeyboardEvent`
  Phaser also sees and must be told to ignore via a wall-clock cutoff — see the entry above), the
  same physical press can never both close a panel and register as an interact: the DOM decides
  synchronously which one it is, and the game never sees the ones that closed something.
- **Wheel (done):** `deltaY > 0` (scroll down) walks right, `deltaX` walks too (horizontal swipes),
  normalized for `deltaMode` (lines × 16 px), with a short decay (`input/wheel.ts`'s `WheelWalker`)
  so a flick walks a few steps. `src/ui/wheel.ts` is the **single** wheel path: one passive
  `window` listener forwards every wheel event on the bus (`input:wheel`), canvas included, skipping
  only `#panels`/`#menu` (scrollable DOM) and `Ctrl`+wheel (browser/trackpad zoom). The game never
  listens to Phaser's own wheel events (Arcade's `MouseManager` still adds a non-passive canvas
  listener and calls `preventDefault` on it, but does not stop propagation, so ours still fires).
- **Pointer / tap:** click or tap a station's prop → already inside its trigger opens it right
  away; otherwise `game/travel/plan.ts`'s `planWalk`/`autoWalkStep` (pure) drive a plain walk
  toward it as an ordinary `pointer`-sourced intent (`WorldScene.update()`), opening it on arrival;
  any manual move/jump/interact cancels the plan.
- **Menu fast travel (Phase 7):** selecting a menu entry (`src/ui/menu.ts`) emits `travel:to { id
}`; `WorldScene.startFastTravel` resolves `id` to an x (`travel/plan.ts`'s `travelTargetX`: a
  station's own x, or — for a stop with no station yet, e.g. `lab` — the centre of its zone) and
  either runs there (`planFastTravel`/`autoWalkStep`, a `{ source: 'travel', active: true }`
  `SourcedIntent` that `mergeIntents` lets override every other source **even while `ui:modal` is
  still `true`** — the menu never flips it back to `false` on a selection, only on a genuine
  cancel, so the run plays with the game otherwise paused) or fade-teleports
  (`shouldFadeTravel`: farther than 1.5 view-widths, or `prefers-reduced-motion` — DECISIONS.md has
  the threshold's rationale) via `Camera.fadeOut`/`fadeIn` (`FADE_TRAVEL_MS`, `palette.ts`'s
  `rgbChannels('ink-900')`; skipped entirely — an instant cut — under reduced motion). Either way,
  arrival emits `travel:arrived { id }` then the ordinary `station:open { id }`. A fast travel in
  progress still poses/animates normally (`WorldScene` passes `pose: null` while `fastTravel` is
  set, even though `modalOpen` is `true` — only a genuinely idle paused game poses the panda
  `interact`).
- **Touch pad (done):** DOM D-pad ◀ ▶, A (jump), B (interact/close) — no START, the HUD's Map button is always on screen — `handheld` /
  `landscape-touch` only (Layout modes, below); 64 × 64 px targets (56 in `landscape-touch`), `pointer-events: none` on
  the pad's own box (only its buttons re-enable it), so a translucent `landscape-touch` overlay
  never eats a tap meant for the canvas underneath. `src/components/Pad.astro` is markup only;
  `src/ui/pad.ts` does the pointer handling and is the **only** emitter of `input:pad { button,
down, timeStamp }` (a `PadButton` — `'left' | 'right' | 'a' | 'b'`), the pad's
  equivalent of `ui/wheel.ts` forwarding `input:wheel`. Multi-touch (`hold ▶ + tap A`) falls out of
  each button owning an independent `Set<pointerId>` (`pointerdown`/`pointerup`/`pointercancel`,
  `setPointerCapture` so a finger sliding off a button still delivers its `pointerup`); a later
  pointer landing on an already-held button is not a second press. `game/input/touch.ts`'s
  `TouchPadState` (pure, unit-tested) is fed these events by `WorldScene` exactly like
  `WheelWalker` (`bus.on('input:pad', …)`, gated by the scene's own `modalOpen` and `reset()` on
  every `ui:modal` change — a finger still resting on a button across that boundary needs a fresh
  lift-and-press, the touch equivalent of `KeyboardSource.setModal`'s `resetKeys()`); double-tap
  detection (`DOUBLE_TAP_MS = 300`) tracks each direction's last release time, so a release-then-
  press within the window, held, runs — a lone tap, or a re-press outside the window, does not. An
  Android `navigator.vibrate(10)` tick fires on `A`/`B` (optional; iOS Safari has no Vibration API,
  and a blocked/thrown call is silently swallowed). `aria-label`s are applied client-side (like the
  HUD prompt), re-applied on `lang:change` — never baked into the static HTML, since the pad has no
  per-language DOM pair to key visibility off like panels do.

## Stations & panels

- **Station cards** (`stations/Stations.ts`): until a station's prop art is delivered (`source:
raw`), it renders as a card at its design size — `night-700` at 62 % opacity with a 1-px
  `night-400` edge, drawn in code so the backdrop shows through (the gate's card also gets its
  `sign` plate). A card ≥ 120 px wide shows the project title in pixel text at the top and, while
  the panda is in its trigger, the interact hint under it (`ui.stationHintKey` "Pulsa E…" on
  desktop, `ui.stationHintTouch` "Pulsa B…" in touch modes), redrawn on `fonts:ready`,
  `lang:change` and a layout-mode change. Narrower cards (dossier stands) keep only the glyph and
  the HUD prompt.

- A station = layout entry (`id`, `kind`, `x`, `asset`, `trigger` width) + (for a `kind` with a
  panel) a matching `data-panel` id. The 6 `project` stations and the 4 `dossier` stands have one;
  `gate`, `contact` and `lab` still open Phase 7's generic stand-in (`StubPanels.astro`) until
  Phase 9/10 add their real panels; `classified` (the vault) has **no panel of its own**
  (GAME_DESIGN.md → Canonical ids) — interacting with it rolls its door aside instead, a purely
  local game-side reaction (below); `block` (a skill category) is still Phase 9. Nothing here is
  project-specific — the mechanism is generic.
- **Trigger tracking:** `game/stations/trigger.ts`'s `stationAt(x, stations)` is pure (unit-tested)
  and only considers stations with a filter the caller applies (`WorldScene` passes the 6 project
  stations, the 4 dossier stands and the vault — `TRIGGER_STATIONS`); it is called from the same
  `POST_UPDATE`/teleport step that tracks the zone, emitting `station:enter`/`station:leave` only
  on a change.
- **Prompt:** entering a trigger shows a small pixel "interact here" badge above the prop
  (`game/stations/Stations.ts`'s `drawGlyph`, exported and reused as-is by `stations/Vault.ts`:
  flat `ink-900`/`amber-400` rects, no words, no rotation — crisp at any zoom) and the localized
  prompt bottom-centre in `#hud` (DOM, `aria-live="polite"`, e.g. `E — Fiora` on desktop,
  `Toca — Fiora` on a touch layout mode — read from `html[data-mode]`, set by
  `shared/layout-mode.ts`, never inspected ad hoc). `src/ui/panels.ts`'s `promptTitle(id, lang)`
  resolves the `{title}`: a project's fixed name, a dossier's localized `industry`, or the vault's
  own fixed label (`ui.menuClassified`) — a station kind with no title yet (gate/lab/contact/
  block) shows no prompt. Both prompt and glyph hide while a panel is open.
- **Opening:** interacting (`E`/Enter while inside a trigger) or clicking/tapping the station's
  prop (Pointer / tap, above) makes the game emit `station:open { id }` on the bus — nothing else;
  the UI (`src/ui/panels.ts`) resolves `id` through `panelIdFor` (a stop whose panel is filed under
  a different id — only `gate` → `intro` today, GAME_DESIGN.md → Canonical ids) and, if a matching
  `<section data-panel>` exists, un-hides it, traps focus and emits `ui:modal { open: true }`,
  which is what actually pauses game input and poses the panda (`WorldScene` passes `pose:
'interact'` to `panda.update()` while `modalOpen` **and not mid fast-travel** — see Input, above).
  An id with no panel yet (e.g. a skill block, still Phase 9) — or with no panel at all, ever (the
  vault) — is a silent no-op UI-side: Golden Rule 7, the UI's job here, the game never knows which
  ids have DOM content. `WorldScene.openStation(id)` is the one choke point every "the player
  reached/activated station `id`" path funnels through (interact, click, walk arrival, fast-travel
  arrival), so it is also where a station's own **local, game-side** reaction lives when it has
  one — today, only the vault's (Classified wing, below); the bus emission and that reaction are
  independent of each other.
- **Panels** are Astro components rendered at build time, both languages always in the DOM inside
  one `<section data-panel="<id>" hidden>`: a `<div lang="es-419">`/`<div lang="en">` pair, each its
  own `role="dialog" aria-modal="true" aria-labelledby aria-modal tabindex="-1"`; `shell.css`'s
  existing `html[data-lang]` rule shows only the active one — panels never re-implement language
  visibility. `components/panels/Panels.astro` builds the 6 project panels from
  `src/content/projects.ts` (a project with an empty `stack` — Transcolombia, until Cristian sends
  it — renders no stack heading or list at all; Fiora's screenshots become an accessible gallery: a
  thumbnail grid of `<button>`s opens a lightbox, arrows, a focus trap of its own via `inert` on the
  grid while it is open — Esc closes the lightbox first and only closes the panel on a second
  press). `IntroPanel.astro`/`ContactPanel.astro` (Phase 7) build `intro` (name, roles, tagline,
  summary) and `contact` (`profile.callToAction`) from `src/content/profile.ts`, both sharing one
  `ContactLinks.astro` partial for `profile.contact`. `ConfidentialPanel.astro` (Phase 8) builds
  the 4 dossier panels from `src/content/confidential.ts`: the industry is the title, and a
  `<dl>` of `role`/`stack`/`impact`/`duration`/`teamSize` is the only other content — **Golden
  Rule 3, absolute**. Each field's `<dd>` carries a `.dossier__redaction` bar (`styles/panel.css`)
  that scales away on open (a CSS animation, staggered per field; instant under
  `prefers-reduced-motion`) — "declassifying" the dossier; opening it again replays the animation,
  since a `[data-panel]` going from `hidden` (`display: none !important`, `shell.css`) to visible
  is a fresh box as far as CSS animations are concerned. `StubPanels.astro` (Phase 7) stands in
  for every stop whose own phase has not merged yet — only `lab` now (Phase 8 replaced its
  `classified` and 4-dossier entries with the vault's own behavior and `ConfidentialPanel.astro`,
  respectively) — titled with the stop's own name (`ui.menuLab`) over a generic `ui.stubBody`; a
  later phase replaces it with its real panel under the same id, so nothing else (visited marks,
  deep links, the menu) needs to change. Every one of these renders through the exact same
  `[data-panel]` shape, so `src/ui/panels.ts`'s open/close/focus-trap/visited logic (below) needed
  no changes to support them — Golden Rule 7 again: the mechanism is id-agnostic.
  All six components (`section[data-panel]`/`.panel`/`.panel__*`) share one chrome, defined once
  in the plain, unscoped `styles/panel.css` (DECISIONS.md has the "why not repeat it per
  component" ADR); `#menu` (below) reuses the same look.
- **Focus:** opening focuses the visible language `<div>` (its `aria-labelledby` announces the
  title immediately); Tab traps inside it (`focusablesIn` skips anything hidden or under
  `[inert]`); closing restores focus to the canvas (`tabIndex = -1`, focusable without joining the
  tab order) or, failing that, whatever had focus before opening. A real `<a href>` only activates
  on Enter by default; the same keydown listener also triggers it on Space (`e.preventDefault()` +
  `.click()`, a normal, transient-activation-safe pattern) so every panel control answers to both
  keys the same way.
- **Deep links:** `game/travel/deep-link.ts`'s `parseDeepLink(hash, validIds)` is pure; `WorldScene`
  reads `location.hash` once at `create()` to pick the spawn station (falling back to the usual
  spawn) and emits `station:open` for it after `game:ready`. Opening a panel (by any route) also
  sets `location.hash` to its id (`history.replaceState`, no navigation); closing clears it.
- Visited marks (`shared/visited.ts`, closing a panel marks `openId` — already resolved through
  `panelIdFor`, so `gate` and `intro` share one mark), language and sound live in `localStorage`
  (wrapped in try/catch, same pattern as `i18n/lang.ts`'s `initialLang`/`persistLang` — pure
  functions over an injected store, so they are unit-tested without a real browser).

## Classified wing

BACKLOG.md Phase 8. GAME_DESIGN.md → Classified wing: fence panels + a beacon, a code-drawn sign,
the vault door, and the 4 dossier panels (above).

- **`stations/Vault.ts`** is a different shape from `Stations.ts`'s generic single-`sprite`
  adapter — `confidential-vault` is a `set` asset (`wall` + `door` items, the wall's `doorway`
  anchor) — so it gets its own: the wall renders at the station's `x`/`groundY` like any other
  prop and owns the click/tap hit area; the door renders at `wallTopLeft + doorway.xy`, sized to
  the `door` item, exactly covering the doorway. Both resolve to the documented `set`-item
  placeholder when the pipeline hasn't run (`navy-700`/`navy-400` box; the doorway additionally
  punches a `navy-950` rect into the wall's placeholder, same convention as every other anchor
  placeholder). `Vault.open()` (idempotent — a second interact, or arriving again by menu/deep
  link, is a no-op) tweens the door's `x` past the wall's edge — an integer-pixel translation, so
  the default `vertexRoundMode: 'safeAuto'` already rounds it, no `setVertexRoundMode('full')`
  needed (that's only for flips) — instant under reduced motion; and gives the camera a small
  nudge via Phaser's own `camera.shake()` (orthogonal to `render/follow.ts`'s manual `scrollX`,
  which it offsets on top of — not a replacement for the custom follow), skipped entirely under
  reduced motion.
- **`WorldScene.openStation(id)`** is where `Vault.open()` is actually called: every "the player
  reached/activated station `id`" path funnels through it (Stations & panels, above), so the vault
  reacts identically whether the player interacted, clicked, walked up, or fast-travelled there
  from the menu (`classified`'s menu entry has no panel to open on arrival, GAME_DESIGN.md →
  Canonical ids, but the vault still opens) — a single choke point instead of four call sites each
  knowing about the vault.
- **`fx/classified.ts`**'s `ClassifiedWing` owns the wing's own ambience, all screen-agnostic
  world-space objects: the `CLASIFICADO / CLASSIFIED` sign (a code-drawn plate + `PIXEL_FONT`
  text, `ui.classifiedSign` — deliberately identical in both languages, a fixed bilingual placard,
  so unlike every other panel/HUD string it never re-renders on `lang:change`; drawn once
  `fonts:ready` fires, same pattern as `WorldScene.addLabel`), the wing's ambient light overlay
  (`shiftLightToScarlet()`, called from `openStation`'s vault branch — tweens toward a low-alpha
  scarlet tint over the whole zone, instant under reduced motion), and the sweeping scanner beam
  (`refresh(tier, reducedMotion)`: built only on the high tier and only without reduced motion —
  BACKLOG.md Phase 8 — torn down and rebuilt whenever either input changes, called from the
  `tier:change` bus handler and `onReducedMotionChange`). `blinkBeacons()` is a separate function,
  not a method: it just tweens the alpha of whichever images `world/props.ts` handed back whose id
  starts `classified-beacon`, regardless of tier (a single cheap tween each).
- **`world/props.ts`**'s `buildProps(scene, manifest, props)` is the generic decorative-prop
  renderer `world/layout.ts`'s `props[]` has needed since Phase 4 — one bottom-anchored image per
  prop from a named `set`-asset item, or the documented placeholder box, keyed by the prop's own
  id so a caller can attach extra behavior (the beacons' blink) by id. First used here, for the
  classified wing's own props (`WorldScene` filters `props[].id.startsWith('classified-')`); the
  gate's crate stays unrendered until Phase 10's wake beat actually needs it on screen, a later
  phase's own call to the same function.

## Menu, HUD & first-visit hint

- **The menu** (`components/Menu.astro` + `src/ui/menu.ts`, `#menu`) lists every stop in world
  order — `gate`, the 6 projects, `classified`, `lab`, `contact` — plus the 4 dossier ids as
  indented sub-entries under `classified`, each a real `<button data-menu-entry="<id>">` (both
  languages pre-rendered, same pair-of-`[lang]`-divs shape as a panel). Opening
  (`bus.on('menu:open', …)`, itself only ever emitted while nothing else is open — `intent
.menuPressed` is gated by `modalOpen` like every other keyboard/pad intent) shows it, traps focus
  (reusing `panels.ts`'s `focusablesIn`/`visibleLangEl`/`focusCanvas`) and emits `ui:modal { open:
true }`. Selecting an entry hides the menu **without** flipping `ui:modal` back to `false` — it
  emits `travel:to { id }` and lets the game's fast travel (Input, above) carry `ui:modal` through
  to the destination panel opening; a genuine cancel (Escape, the close button) is what actually
  emits `ui:modal { open: false }`. Visited ✓ marks are read from `shared/visited.ts` client-side
  (`localStorage` can change between page loads; a build-time mark would go stale) each time the
  menu opens, through the same `panelIdFor` alias `panels.ts` uses.
- **The HUD's interactive chrome** (`components/Hud.astro` + `src/ui/hud.ts`): the name badge
  (opens `intro`), Contact (opens `contact`), the ES · EN toggle (`i18n/lang.ts`'s `setLang` —
  instant, no reload; `html[data-lang]` alone highlights the active code, no JS needed for that
  part) and sound (`shared/sound.ts`, off by default, state only until Phase 11) and menu buttons.
  Every dynamic label (aria-labels, Contact/menu/sound text) is applied client-side and re-applied
  on `lang:change`, the same pattern `src/ui/pad.ts` already uses for its own buttons. The badge
  and Contact button call `src/ui/panels.ts`'s `open(id)` directly — a no-op while a panel or the
  menu is already open (Golden Rule: "from anywhere" means anywhere in the _world_, not on top of
  whatever else is open); the menu button shares the Esc/B precedence (close the topmost open
  panel/menu, else open the menu — `src/ui/main.ts` composes `panelsApi.closeTopmost()` and
  `menuApi.close()` into one `closeTopmost`, reused by the pad's `B` too).
- **First-visit hint** (`src/ui/hint.ts` + `shared/hint.ts`, `#hud`'s `.hud__hint`): shown once,
  input-aware (`html[data-mode]`: keys + "or just scroll" on desktop, "use the pad" on touch),
  hidden by the first manual move/jump/interact (`input:first-move`, emitted once by `WorldScene`
  off the same raw per-source booleans that already cancel an in-flight click-to-open walk) or by
  any panel/menu opening, and never shown again once dismissed (`localStorage`, same
  store-injection pattern as visited/lang/sound).

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
else light near-neutral pixels (HSV s ≤ 0.2, v ≥ 0.55) for ≥ 60 % → a **baked checkerboard** (an
image generator's fake transparency; a lower share because the art may run off the edge):
flood-fill those from the borders, clear enclosed strictly grey components (s ≤ 0.08, ≥ 16 px —
canopy holes; a lantern's warm pale core survives), then erode the silhouette by 2 source px to
drop the light fringe. Anything else is rejected with a warning.

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
remove 1-px orphan islands. An entry with `palette: "scenery"` snaps to the whole palette; every
other entry to the **core** ramps only (`palette.ts`'s `SCENERY_FAMILIES` / `isSceneryColor`), so a
character or UI sprite never picks up a moss green (DECISIONS.md → _Scenery palette_).

**Sprites** may declare `sourceCrop` (`[x, y, w, h]` in source px, applied after keying) to use
part of a delivery. Sprite anchors: `sign` → the navy panel (below); `surface` → the first row
where ≥ 85 % of the middle 80 % of columns are opaque (a terrain's walking line, under sparse
tufts), as a line `[0, y, w, 0]`; `tile` → the repeatable middle between the end caps: from the
darkest wall column near the left cap (a mortar joint) to the column in the right part that best
matches it.

**Backdrops** (kind `backdrop`, opaque paintings): lanczos to `size[0]` wide → palette → padded at
the top to `size[1]` with the most frequent color of the scaled image's top row (or cropped from
the top, with a warning). The `horizon` anchor is measured by an agent and written to the manifest.

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
  (ready, paused, tier, mode, zoom, dpr, backing size, fps, lang, pixelFont, pandaTexture, and —
  Phase 3 — `player` (x, y, vx, vy, state, anim, frame, flipX, grounded), `camera` (scrollX,
  scrollY), `physicsHz`), `setTier(t)`, `teleport(x)` (places the panda on the ground at `x`, zero
  velocity, camera snapped — `GameContext.teleport` is set by `WorldScene.create()` and called
  through it) and `emit(event, payload)` (a typed passthrough onto the bus, e.g.
  `emit('ui:modal', { open: true })`, so e2e can simulate a panel/menu opening without building
  one), `openStation(id)` (teleports to that station and opens it the same way interacting would —
  a no-op UI-side for an id with no panel yet), plus an FPS/zoom/tier/mode overlay (`debug:stats` on
  the bus; types in `src/shared/debug.ts`). E2E uses it instead of simulating long walks.
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
