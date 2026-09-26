# LESSONS.md — Engineering log

Append-only. One entry per gotcha, dead end, or non-obvious fix, newest last. The previous
scroll site's log (GSAP, ScrollSmoother, LCP work) is in git history at `51bbf3c`.

Template:

```
## YYYY-MM-DD — <short title>
**Context:** what you were doing.
**Problem:** what went wrong / what was surprising.
**Fix / finding:** what worked, with numbers if any.
**Rule of thumb:** the one line the next agent should remember.
```

---

## 2026-09-26 — The AI concept sheet is "fake" pixel art

**Context:** Evaluating `art/reference/panda-sheet-v1.png` (1536×1024, AI-generated) as a
sprite source.
**Problem:** 101 026 unique colors, horizontal color runs of 1 px (no real pixel grid; each
"pixel" is ~3.3 source px and blurred), RGB with no alpha on a flat black background while
the panda's fur is also near-black, baked ground-shadow ellipses under every pose, and frames of
different sizes (84–105 × 103–114 px) that are not on a uniform grid.
**Fix / finding:** A prototype that (1) flood-fills the background from the image borders
where max(R,G,B) ≤ 14, (2) takes connected components as frames, (3) resamples to the target
height with an area/lanczos kernel, (4) quantizes without dithering and (5) binarizes alpha at
~110/255 produces a recognizable 48 px panda. Flood-fill (not global keying) is what keeps
the black fur — but it only works because the fur is slightly lighter than the background,
which is fragile. The frame boxes are recorded in `art/reference/panda-sheet-v1.slices.json`.
**Rule of thumb:** Request pure `#00FF00` backgrounds (or transparent PNGs), slice by connected
components rather than a grid, scale a whole strip by one factor, and align frames bottom-centre.

## 2026-09-26 — Nano Banana cannot output transparency

**Context:** Choosing the delivery format for AI-generated sprites.
**Problem:** Gemini image models (Nano Banana / Pro) return flat RGB; "transparent background"
prompts give a solid or checkerboard fill. Dark backgrounds with dark outlines make keying
unsolvable; anti-aliasing bakes the background color into edge pixels.
**Fix / finding:** Solid `#00FF00` background with explicit "no gradient / no shadow / no
texture" wording, keyed in HSV (hue ≈ 120° ± 22°, saturation and value > 0.3), then edge
cleanup; slice by content, not by a uniform grid, because the model does not keep a grid.
Sources: https://roboticape.com/2026/03/07/generating-game-sprites-with-gemini-image-generation-nano-banana-pro-lessons-learned/ ·
https://ruky.me/nano-banana/
**Rule of thumb:** Never key black or white for sprites; green screen + HSV + palette snap.

## 2026-09-26 — Playwright version must match the container's browsers

**Context:** Setting up e2e tests in the cloud agent container.
**Problem:** The container ships Chromium build 1194 in `/opt/pw-browsers`
(`PLAYWRIGHT_BROWSERS_PATH`) and must not run `playwright install`; newer `@playwright/test`
versions expect a newer browser build.
**Fix / finding:** `@playwright/test` is pinned to 1.56.1, which uses that build. Local machines
run `pnpm exec playwright install chromium` once.
**Rule of thumb:** Upgrade Playwright only together with the browsers it expects.

## 2026-09-26 — `panda-portrait` keys cleanly only with a tight black threshold

**Context:** Converting Cristian's front-view portrait (`art/raw/panda-portrait.png`, 1254×1254,
AI pixel-art style on black) into a true pixel sprite.
**Problem:** With a flood-fill threshold of max(R,G,B) ≤ 20 the legs and arms came out hollow:
the leg fur sits at 16–19 in places and is connected to the background along the silhouette.
**Fix / finding:** The background is pure 0–3 and the fur never goes below 12, so a threshold of
**6** keeps all the fur. The art was drawn at ~9.5 source px per "pixel", i.e. a native size of
~77×100 px; downsampling to 100 px tall (lanczos) + OKLab palette snap + alpha ≥ 50 % recovers it
almost losslessly, and 48 px tall still reads well in-game. 45 705 source colors → 29.
**Rule of thumb:** Derive the black-key threshold from the border's own max channel (+4), unless
the source declares a `backgroundThreshold`; never a fixed "dark enough" constant — measure fur
darkness before choosing. (The ~110/255 alpha cut above was a prototype value; the spec is ≥ 50 %.)

## 2026-09-26 — Foundation review: traps an implementer would have hit

**Context:** Four agents dry-ran Phases 1–3 and the media spec against the installed tools.
**Problem / finding (all verified in the container):**

- Phaser 4.2.1: `Scale.zoom` is CSS px per game px and ignores DPR; `resize()` then `setZoom()` —
  the reverse order leaves a stale CSS size. `camera.startFollow()` resets the camera's
  `roundPixels` to false and scrolls fractionally. A flipped sprite is not vertex-rounded under
  the default `safeAuto` (use `setVertexRoundMode('full')`). `addKey()` captures keys on `window`
  and `preventDefault`s them (use `addKey(code, false)`). A view taller than the camera bounds is
  pinned to the top (use `setBounds(0, WORLD_H − viewH, …)`). Importing `phaser` in Node throws
  `window is not defined`. Arcade's real jump apex at 60 Hz is 57.75 px for v0 = 330, g = 900.
- sharp `png({ palette: true })` re-quantizes with libimagequant: with `colours ≤ 32` or
  `effort < 10` it writes off-palette colors. Only `colours: 256, quality: 100, effort: 10,
dither: 0` round-tripped exactly — verify by reading the file back.
- Node 22.22 runs `.ts` natively, but JSON imports need `with { type: 'json' }`.
- pnpm pre/post scripts ran in this container but depend on version/config
  (`enable-pre-post-scripts`); chain `pnpm assets && …` explicitly instead.
- Nano Banana copies the aspect ratio of the last attached image; PixelLab animation canvases are
  64×64 with references ≤ 256×256.
- The sheet's RIGHT directional sprite needs `backgroundThreshold` 8 (14 punches holes in its
  darker back fur); it is recorded per sprite in the slices file.
  **Rule of thumb:** Read ARCHITECTURE.md's Phaser recipe before writing any scene code; verify
  image output by reading it back, not by trusting encoder options.

## 2026-09-26 — Phase 1 pipeline: native detection, rulers and fills

**Context:** Building `pnpm assets` and its fixtures.
**Problem / finding:**

- A flat-color synthetic fixture (a hard-edged box) has ≤ 64 colors and a run GCD of 2, so the
  pipeline reads it as native pixel art and divides it by 2 instead of resampling it — the `fill`
  test then got half the expected width. Blur fixtures meant to be "fake" art; the pipeline now
  warns when a native item cannot reach its `fill` width exactly.
- The ruler frame exists only on green-screen deliveries. Dropping the leftmost frame of a
  transparent (native) strip deleted a real frame; the ruler drop is tied to the green background.
- Binarizing alpha after resize can clear the lowest row, leaving art 1 px above the baseline;
  re-trim after binarizing, before packing.
- Loop-point search must start from `Infinity`, not the full width, or a strip whose best loop is
  the whole width never matches.
  **Rule of thumb:** Classify a source (native vs. fake, green vs. transparent) once, up front, and
  make every later step depend on that classification instead of re-guessing.

## 2026-09-26 — Phase 2 shell: hidden, emulated DPR, fonts

**Context:** Building the loading screen, zoom and pixel text.
**Problem / finding:**

- A component rule like `.loading { display: grid }` beats the UA `[hidden] { display: none }`:
  the loading screen stayed visible with `hidden` set. `shell.css` now has
  `[hidden] { display: none !important }`.
- Under emulated DPR (Playwright `deviceScaleFactor`, DevTools), ResizeObserver's
  `devicePixelContentBoxSize` reports CSS px, so a 390×844@3 phone got zoom 1. Trust it only when
  it matches `contentBoxSize × devicePixelRatio`; otherwise use `floor(css × dpr)`.
- Pixelify Sans at its nominal 11 px is blurry (outlines are off the pixel grid by ~0.66 px, and
  canvas `fillText` snaps sub-pixel offsets so you cannot shift it). Render at 88 px and
  downsample by cells with a detected phase. Its Z and C really do look like that — compare with
  a large render before "fixing" glyphs.
- Phaser already pauses its loop on `visibilitychange` (`Game#onHidden` → `loop.pause()`); listen
  to `Phaser.Core.Events.HIDDEN/VISIBLE` for state instead of adding a second handler.
- `Bus.once(…, { replay: true })` must not call `on()` and then `off()` inside the handler —
  the replay runs synchronously before `off` exists (TDZ error).
  **Rule of thumb:** Verify DPR-dependent code at a real emulated DPR, not only at @1, and check
  `hidden` elements are actually invisible in a screenshot.

## 2026-09-26 — Phaser 4.2.1 does not queue window keydowns until its next step

**Context:** Building `input/keyboard-state.ts` / `input/keyboard.ts` (modal gating: a key event
stamped before `ui:modal { open: false }` closes must not fire after the close).
**Problem:** ARCHITECTURE.md's Input → Modal gating section used to say "Phaser queues window
keydowns until its next step", implying a `resetKeys()` call made during the same tick as a closing
keydown would always win the race. Reading `KeyboardManager`'s source (Phaser 4.2.1) shows the
opposite: its `window` keydown/keyup listener pushes the event and synchronously emits
`MANAGER_PROCESS` — a `Key`'s `down`/`up` fire during DOM dispatch, not on the engine's next step.
Worse, each later key event in the same frame **replays the whole queue**, which is only cleared at
`POST_STEP`; a key released and then pressed again in the same frame gets a second `down`/`up` from
the replay.
**Fix / finding:** A timestamp cutoff is required, not just a safety net: `KeyboardState.reset()`
records the closing event's `timeStamp`, and every key event stamped at or before it
(`timeStamp <= cutoff`, not `<` — browsers coarsen timestamps, and an event stamped in the same
millisecond as the close belonged to the UI) is ignored, including ones replayed later in the same
frame. Two more edge cases fall out of the same replay behavior: a key **held through** the reset
needs its next auto-repeat (`event.repeat`) to count as a fresh press, or "held through close needs
a fresh down" silently breaks after ~500 ms (the OS repeat delay); and a Ctrl/Meta/Alt chord
(`modified`) must be ignored outright, because macOS drops the `keyup` of a key pressed with Meta
held, which would otherwise leave an input source stuck reporting that key as down forever.
**Rule of thumb:** Never assume an input library batches or queues browser events for you — read
its source for the version you actually depend on, and gate on wall-clock timestamps when the
question is "did this happen before or after the close," not on delivery order.

## 2026-09-26 — Phase 3 integration: scene step order decides who reads what, when

**Context:** Wiring `player/logic.ts` + `PandaSprite` + `render/follow.ts` into `WorldScene`, per
ARCHITECTURE.md's rule that the camera applies in `POST_UPDATE`, after Arcade has synced the
sprite.
**Problem:** Phaser's `Scene.Systems#step` fires, in order, `PRE_UPDATE`, `UPDATE` (the Arcade
plugin's own listener runs `world.update()` here — the physics step for the frame), _then_ the
scene's own `update()` method, _then_ `POST_UPDATE` (Arcade's own listener there runs
`world.postUpdate()`, which copies each body's position onto its Game Object). So inside the
scene's own `update()`, `sprite.x` is still last frame's value — read it there for the camera and
the follow lags by one frame, which reads as stutter under fast motion. Also,
`world.stepsLastFrame` (needed for `follow()`'s physics-time `dtMs`) is reset to 0 inside
`world.postUpdate()`, i.e. _before_ a listener on the scene's own `POST_UPDATE` gets to read it.
**Fix / finding:** Read/act on `sprite.x` only from a `POST_UPDATE` listener registered in
`create()` (the physics plugin subscribes when the scene boots, so ours, registered later, fires
after it — `EventEmitter` calls listeners in registration order). Snapshot `world.stepsLastFrame`
at the end of the scene's own `update()`, before `postUpdate()` clears it, and use that stored
value in the `POST_UPDATE` handler.
**Rule of thumb:** Know exactly which scene-loop phase you're in before reading a synced transform
or a step count: `update()` sees last frame's transform and this frame's still-unconsumed step
count; `POST_UPDATE` sees the opposite.

## 2026-09-26 — A visual/e2e check must wait for the loading screen too, not just `ready`

**Context:** Writing a Playwright script to screenshot the panda for the Phase 3 manual check.
**Problem:** `getState().ready === true` flips as soon as `WorldScene.create()` returns, but
`#loading` (portrait + walking-runner + progress bar) is a separate DOM overlay that fades out on
its own schedule and can still be on top of the canvas at that moment. A screenshot taken right
after `waitForGame()` showed what looked like a second, floating panda in the sky — actually the
loading screen's own portrait/runner, composited into the shot because `locator.screenshot()`
captures whatever is visually on top of that element's box, not an isolated render of the canvas's
own draw buffer.
**Fix / finding:** Also `await page.locator('#loading').waitFor({ state: 'hidden' })` (as
`shell.spec.ts`'s first test already does) before taking any screenshot meant to show only the
game.
**Rule of thumb:** `ready` means the scene finished `create()`, not that the loading screen is
gone — wait for both before trusting a screenshot.

## 2026-09-26 — Re-wire every field the old code set when replacing it with an adapter

**Context:** Replacing `WorldScene`'s inline "pick the panda texture" helper with `PandaSprite`.
**Problem:** The old helper's last line was `this.ctx.pandaTexture = …`, read by
`window.__PORTFOLIO__.getState()` and asserted by `shell.spec.ts`'s "boots the game" test. Moving
texture selection into `PandaSprite`'s constructor dropped that assignment entirely; `pnpm verify`
and the unit tests stayed green (nothing there touches `ctx.pandaTexture`), and the regression only
showed up in `pnpm test:e2e`.
**Fix / finding:** Added a `textureKey` getter to `PandaSprite` and set `ctx.pandaTexture` from it
in `WorldScene.create()`.
**Rule of thumb:** When deleting a scene method that sets shared/debug state, grep for every reader
of that state (`ctx.*`, the debug hook, e2e specs) first, not just its callers — a unit-tested pure
module regressing here would still pass `pnpm verify` and only fail e2e.

## 2026-09-26 — Phase 4: a mood "transition" spanning a whole zone reads as no mood at all

**Context:** Building the night→dawn sky (`fx/sky.ts`) from `world/layout.ts`'s zones, each
tagged with one `SkyMood`.
**Problem:** The first version put one stop per mood **zone** and blended linearly between
consecutive stops (one keyframe per zone). Since only 4 of the 10 zones actually change mood (the
6 project stations all share `night`), each mood-changing zone's **entire width** became the blend
bracket: at the classified wing's own midpoint (400 px into its 800 px), the sky was already a
50/50 dither between "darkest night" and "pre-dawn" — the wing's "total blackout" beat never read
as pure black except right at its front edge. The unit tests all passed throughout (they only
checked the interpolation math in isolation, which was correct); a screenshot of the actual build
is what caught it.
**Fix / finding:** Blend only in a fixed, narrow window (240 px) straddling each **mood change**
(not each zone) — `skyStopsFromZones()` pushes a `[from, to]` pair around every boundary and a flat
stop everywhere else, so most of a zone reads as a flat, "pure" mood.
**Rule of thumb:** For a "value that changes with position" system, unit-test the interpolation
math, but also screenshot a few real in-between points — a bug in how keyframes are _placed_ hides
behind entirely correct interpolation code.

## 2026-09-26 — Phase 4 world model: a few TS/lint/test traps

**Problem / finding (all verified in this container):**

- `erasableSyntaxOnly` rejects constructor **parameter properties**
  (`constructor(private readonly scene: Phaser.Scene, …)`), even in a file that's on the
  Phaser-import allow-list. Declare the field and assign it in the constructor body instead — or,
  if the value is only needed inside the constructor itself (true of most "receive the scene and
  use it" builders, which never read `scene` again after building their objects), don't store it
  as a field at all.
- `no hardcoded colors` (`palette.test.ts`) scans **every** non-test `.ts` file for `0x`/`#`
  literals, including a Phaser fill call's default color — `0x000000` for a placeholder rect trips
  it exactly like a CSS hex would. Use `num('ink-900')` even for a throwaway placeholder fill.
- Re-exporting `world/layout.ts`'s `WORLD_W`/`WORLD_H`/`GROUND_Y` from `config.ts`
  (`export { … } from './world/layout'`) only avoids a circular import because `layout.ts` never
  imports those constants back from `config.ts` — it declares them itself. The data owner must
  never import from a module that only re-exports it; a `const` read across a real cycle risks a
  TDZ error depending on which module happens to load first.

## 2026-09-26 — Phase 5: a `rgba()` backdrop trips `no hardcoded colors` even off the palette

**Context:** Styling the panel/lightbox dimmed backdrop in `components/panels/Panels.astro`.
**Problem:** `background: rgb(7 15 31 / 0.72)` (navy-950 with alpha) failed `palette.test.ts`'s
scan — the regex flags any `rgba?(`/`hsla?(` call, full stop, regardless of whether the numbers
inside happen to match a palette entry. There is no "translucent palette color" primitive.
**Fix / finding:** `color-mix(in srgb, var(--c-navy-950) 72%, transparent)` — a real CSS function
name the scanner does not match, reading the color from the token and mixing in the alpha.
**Rule of thumb:** Need a palette color at partial opacity in CSS? Reach for `color-mix()` over
`var(--c-x)` — never re-derive the color's numbers as a literal, even inside `rgb()`.

## 2026-09-26 — Phase 5: closing a modal via a real Esc keypress needs no `stopPropagation()`

**Context:** `src/ui/panels.ts`'s Esc handler closing an open panel; ARCHITECTURE.md's Input
section (written ahead of this phase) said the UI would call `event.stopPropagation()`.
**Problem:** It doesn't need to, and testing that assumption first would have wasted the effort.
Phaser's `KeyboardManager` listens on `window`, one step later than `document` in the bubble
phase; the fix that already existed for this (Phase 3 — `KeyboardState`'s wall-clock `cutoff`,
see the entry above from 2026-09-26) does not care whether the event still reaches `window` at
all, because it re-checks `this.modal` and the timestamp at the moment Phaser's listener actually
runs — by which point the `document`-level handler that closed the panel (earlier in the same
bubble phase) has already flipped `ui:modal` to `false` and recorded the cutoff.
**Fix / finding:** Left `stopPropagation()` out; `tests/e2e/stations.spec.ts`'s "Esc closes … and
the game does not react to that same key press" (a real `page.keyboard.press('Escape')`, not the
debug hook's `emit`) passes without it. Corrected ARCHITECTURE.md's Input section to match.
**Rule of thumb:** Before adding `stopPropagation()`/`preventDefault()` to satisfy an existing
doc's description, write the test the doc implies first — an already-solved race (bubble order +
a wall-clock cutoff, here) can make the "obvious" extra call redundant.

## 2026-09-26 — Phase 5: a click-to-world-x test needs the real zoom/camera math, not a guess

**Context:** Manually verifying click/tap-to-open (walk-to-x then open) against the running
preview with a throwaway Playwright script, converting a station's world (art-px) x/y into a CSS
click position.
**Problem:** First attempt used `canvasBox.x + (worldX - scrollX) * zoom / dpr` for x (correct)
but guessed the y as a flat fraction of the canvas's CSS height (`0.55`), and picked a `worldX`
900+ art px from the current camera position. Both silently missed the target: (1) the visible
viewport is only `backingW` **art px** wide (e.g. 720 at zoom 2 on a 1440-wide desktop) — a world
x more than half that away from `camera.scrollX` is off-screen, so the computed CSS x lands
outside the canvas or on the wrong object entirely; (2) `GROUND_Y` (432) sits near the **bottom**
of the view, not its middle — `computeViewport`'s `backingH = floor(heightDev / zoom)` and
`scrollY = WORLD_H - backingH` place the ground line at art-y `GROUND_Y - scrollY` from the top of
the view, e.g. 402 of 450, so a fraction like `0.55` clicks the empty sky above the prop.
**Fix / finding:** Teleport near the target first (a few hundred art px away, not across zones),
and compute the y from the same `GROUND_Y - scrollY` art-y (minus a margin for the prop's height),
not a guessed fraction.
**Rule of thumb:** A click-by-world-coordinate test/tool must replicate `render/zoom.ts`'s actual
formulas (`computeViewport`) for both axes — "it's roughly centered" is not true of either one.
