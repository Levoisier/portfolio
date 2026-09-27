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

## 2026-09-27 — `waitForGame` alone is not enough for a real pointer/click test either

**Context:** Writing `tests/e2e/pad.spec.ts`'s first pointer-hold tests (Phase 6): move the mouse
onto a pad button, `page.mouse.down()`, then poll the debug hook for movement.
**Problem:** Every one of them timed out with `vx` stuck at 0 — no `pointerdown` ever reached the
button. `document.elementFromPoint()` at the button's own centre returned `#loading`
(`data-state="leaving"`), not the button: the loading overlay had already faded to `opacity: 0`
(its CSS transition) but was still `position: fixed; inset: 0` and had not yet received the
`hidden` attribute (`display: none`), so it still intercepted the click. The existing LESSONS
entry above ("A visual/e2e check must wait for the loading screen too, not just ready") was about
screenshots compositing the overlay's own art on top of the canvas; the exact same half-finished
state also **blocks pointer hit-testing** on anything underneath it, which a keyboard- or
debug-hook-driven test (every prior spec) never touches.
**Fix / finding:** `tests/e2e/helpers.ts`'s `waitForGame` now also
`await page.locator('#loading').waitFor({ state: 'hidden' })` after the ready poll, so every spec
gets this for free instead of each new coordinate-based test re-discovering it.
**Rule of thumb:** Any test that dispatches a **real, coordinate-based** pointer/mouse/touch event
(not the debug hook, not `page.keyboard`) needs the loading screen actually gone first, not just
`ready`.

## 2026-09-27 — `page.mouse` works fine for a real pointerdown/up under `hasTouch: true`

**Context:** Testing the pad's D-pad hold-to-walk and A-to-jump (Phase 6) under Playwright's
`mobile` project (`isMobile: true, hasTouch: true`), which has no public "hold a touch point"
API (only `page.touchscreen.tap()`, a quick down+up).
**Finding:** `page.mouse.move(x, y)` + `page.mouse.down()` / `.up()` dispatches real, trusted
`pointerdown`/`pointerup` events (`pointerType: 'mouse'`) regardless of `hasTouch`/`isMobile` —
exactly what `src/ui/pad.ts`'s listeners need, since they never filter by `pointerType`. A
**dispatched synthetic** `PointerEvent` (`locator.dispatchEvent('pointerdown', { pointerId: 1 })`)
is not equivalent: it has no OS-recognized active pointer, so `el.setPointerCapture(e.pointerId)`
throws — which is exactly why that call is wrapped in `try/catch` in `pad.ts` (robustness for a
real finger sliding off a button, not just a testing nicety).
**Rule of thumb:** Prefer `page.mouse` over a dispatched synthetic `PointerEvent` for anything that
needs a sustained press (hold, drag) on a pointer-event listener, touch-emulated context or not;
save synthetic dispatch for one-shot edges where no capture is involved.

## 2026-09-27 — A child's z-index cannot escape a parent that is itself a stacking context

**Context:** Raising `--z-pad` above `--z-panel`/`--z-menu` (Phase 6, DECISIONS.md) so the pad
stays reachable under an open panel. The `?debug` overlay (`.debug-overlay`, appended inside
`#hud`) started rendering **behind** the pad in `landscape-touch`, its own z-index (bumped to
`calc(var(--z-pad) + 1)`) notwithstanding.
**Problem:** `#hud` itself carries `z-index: var(--z-hud)` (10), which — being a positioned element
with a specified z-index — establishes its own stacking context. Every descendant's z-index,
however large, is compared only against its **siblings inside that same context**; it cannot lift
the whole subtree above a sibling of `#hud` (here, `#pad`, at 45) that outranks `#hud` itself.
Bumping `.debug-overlay`'s own z-index was consequently a no-op — confirmed by reading the
generated CSS (correct) and then a screenshot (still wrong): the fix has to break the **ancestor**
chain, not the leaf's declared value.
**Fix / finding:** `mountDebugOverlay` now always mounts onto `document.body` (dropping the
`hud ?? document.body` fallback in favor of always `document.body`), a sibling of `#hud`/`#pad` at
the page root, where its own z-index is finally compared against the right elements.
**Rule of thumb:** Before raising a leaf element's z-index to fix a stacking bug, check whether any
ancestor between it and the root already sets a z-index (or `opacity`/`transform`/`filter` —
anything that creates a stacking context) — that ancestor's position among _its_ siblings is the
real ceiling, and no descendant value can lift it.

## 2026-09-27 — Menu fast travel silently didn't move the panda: `pose: 'interact'` zeroes `moveX`

**Context:** Wiring the menu's fast travel (Phase 7): `ui:modal` stays `true` the whole time a
selection runs/fades to its target (`merge.ts` already documented this: "an active travel source
replaces everything, even while a modal is open"), so `WorldScene.update()` still called
`this.panda.update(intent, delta, this.modalOpen ? 'interact' : null)` exactly as it did before —
`modalOpen` was `true`, so the pose was always `'interact'`.
**Problem:** `player/logic.ts`'s `step()` has `const posed = grounded && pose !== null; const
moveX = posed ? 0 : clampMove(intent.moveX);` — a non-null pose zeroes `moveX` outright, on the
theory that a posed panda (playing `panda-interact` while a panel is open) should never also
slide around. That is exactly right when the game is genuinely paused, and exactly wrong during a
fast-travel run: the intent's `moveX`/`run` were correct (`mergeIntents` already lets an active
`travel` source through the modal gate), but the pose then discarded them a step later — the
panda stood still playing `panda-interact` while its x silently ticked toward the target with
`vx: 0` (an e2e test's `≤ 10s` recruiter timing check caught it as "the panel just never opens",
not as an obviously-wrong pose; only logging `player.state`/`vx` mid-travel showed the panda
never actually moved).
**Fix / finding:** Pose only when the game is genuinely idle-paused: `this.modalOpen &&
!this.fastTravel ? 'interact' : null`. A fade-teleport never sets `this.fastTravel` (it teleports
in one jumpcut, not frame-by-frame), so it is unaffected either way.
**Rule of thumb:** `modalOpen`/`ui:modal` answers "is a panel or the menu open"; it does not mean
"nothing is currently allowed to move the panda" — an active `travel` source is a second,
independent reason movement can happen while it's `true`, and BOTH the intent merge AND the pose
computation need to agree on that, not just the one you're actively touching.

## 2026-09-27 — Naming a helper `rgb`/`rgba` trips the "no hardcoded colors" scanner even as code

**Context:** Adding `palette.ts`'s channel-splitting helper for `Camera.fadeOut`/`fadeIn`
(Phase 7's fade-teleport), first named `rgb`.
**Problem:** `palette.test.ts`'s "no hardcoded colors" scanner matches `\brgba?\(` against every
source line, full stop — it has no idea `rgb('ink-900')` is a call to this codebase's own helper
rather than a literal CSS `rgb(...)` function, and correctly has no way to tell the two apart from
text alone. The JSDoc comment explaining the rename tripped the same regex the first time it was
worded with a literal `rgb(` inside it, too.
**Fix / finding:** Renamed to `rgbChannels`; reworded the comment to describe the scanner without
spelling out the pattern it matches.
**Rule of thumb:** Never name a helper (or word a comment) so it contains `rgb(`/`rgba(`/`hsl(`/
`hsla(`/a bare `0xRRGGBB` — the palette scanner is deliberately dumb text matching, not an AST
check, and it does not special-case your own module.

## 2026-09-27 — A wall-clock UX budget assertion needs its own, longer Playwright wait

**Context:** The recruiter test's "a project panel opens in ≤ 10 s" (Phase 7), measured with
`Date.now()` around `await expect(locator).toBeVisible()`.
**Problem:** Under two parallel Playwright workers, the fast-travel run/fade animation this
assertion waits on can take noticeably longer in wall-clock time than it does running alone (CPU/
GPU contention, `WebGL` software-fallback warnings in the container) — enough, intermittently, to
exceed Playwright's own default `expect` retry timeout (5000 ms) even while comfortably inside the
actual 10 s business budget the test is supposed to enforce. The test then failed on a Playwright
timeout that had nothing to do with the thing it was asserting.
**Fix / finding:** Gave both `toBeVisible()` calls in that test `{ timeout: 15_000 }` — generous
headroom over the 10 s the `Date.now()` diff actually gates. If the real operation ever takes
longer than 10 s, the `Date.now()` check still fails it correctly; the Playwright-level wait no
longer fails it for an unrelated reason first.
**Rule of thumb:** When a test's own assertion is "this took ≤ N", give the Playwright locator
wait it depends on more than N — otherwise a slow-but-passing run can fail on the wrong check, and
a flake there reads as a business-rule regression instead of infrastructure noise.

## 2026-09-27 — A stop's canonical id and its panel's id can differ; alias once, on the way in

**Context:** GAME_DESIGN.md → Canonical ids: `gate` → `intro` (the menu/deep-link/finale id is
`gate`; the actual panel content — name, roles, tagline — lives under `intro`, opened directly by
the HUD badge too).
**Problem:** The menu's `gate` entry travels to the gate station and emits `station:open { id:
'gate' }`, same as any other stop; naively looking up `[data-panel="gate"]` finds nothing (the
markup is `data-panel="intro"`), so the entry silently failed to open anything, and — if the
alias were instead applied only at the DOM-lookup call site — visited marks and the hash would
have been keyed by whichever id happened to reach `openPanel` first (`gate` via the menu, `intro`
via the badge), splitting one stop's visited state into two.
**Fix / finding:** `src/ui/panels.ts` exports `panelIdFor(stopId)` (a small `Record`, today just
`{ gate: 'intro' }`) and resolves it once, at the top of `openPanel`, before anything — including
`openId` itself — is assigned from it, so the DOM lookup, the hash and the visited mark all agree
regardless of which route (badge, menu, deep link) opened it. `src/ui/menu.ts` imports the same
function to check a menu entry's visited mark.
**Rule of thumb:** When a canonical id and its content's id can differ, resolve the alias in
exactly one place, before the resolved id is stored anywhere — never at each call site, and never
after the id has already been used as a key for something else (visited, the hash, a Set).

## 2026-09-27 — Never `pnpm build` while a `pnpm test:e2e`/manual preview is serving `dist/`

**Context:** Re-verifying a small CSS fix (Phase 7) with a throwaway screenshot script while a
full `pnpm test:e2e` run was already in progress in the background.
**Problem:** `pnpm test:e2e`'s own `webServer` runs `astro build` once, then serves that `dist/`
for the rest of the run; a manual `pnpm preview` pointed at the same `dist/` does the same. Running
`pnpm build` again while either is still serving requests overwrites files on disk mid-response —
two mobile `shell.spec.ts` checks (canvas backing size, "boots the game") failed with no code
change of their own, then passed cleanly the moment they were re-run in isolation with no build
racing them.
**Fix / finding:** Confirmed by re-running just those two tests alone (clean pass) and then a full,
untouched `pnpm test:e2e` (own build, nothing else running) — 0 failures. Treated the first
failure as a real regression signal only after ruling this out, not before.
**Rule of thumb:** Before rebuilding for any reason (a manual preview, a screenshot script, `pnpm
build` itself), check whether an e2e run or another preview is already serving `dist/`
(`pgrep -af "preview --host"`) — let it finish, or point the new build at nothing that's currently
being read from.

## 2026-09-27 — A prompt-text e2e assertion must not hardcode `E —` (Phase 8)

**Context:** Two new Phase 8 e2e tests asserted `[data-slot="prompt"]` equals the literal string
`E — Ala clasificada` (and a dossier's `E — <industry>`).
**Problem:** Both passed on the `desktop` Playwright project and failed on `mobile`, which runs
with `hasTouch: true` (Layout modes → `shared/layout-mode.ts` reads `pointer: coarse`) and so
shows `ui.stationPromptTouch` (`Toca — …`) instead of `ui.stationPromptKey` (`E — …`) — a fact the
new tests had nothing to do with (that prefix logic is Phase 5/6's, already covered elsewhere) but
still broke on.
**Fix / finding:** Switched both assertions from `toHaveText` to `toContainText(title)`, checking
only the part the phase actually added (the title resolving at all for a vault/dossier id, not
just a project) and staying silent on the E/Toca prefix.
**Rule of thumb:** A new e2e assertion on `[data-slot="prompt"]` (or anything else that reads
`shared/layout-mode.ts`) must run — or at least be written to tolerate — both the `desktop` and
`mobile` Playwright projects; assert only the specific thing the change under test added.

## 2026-09-27 — Phase 12 budget measurement (placeholder art)

**Context:** `pnpm build`, gzip sizes measured with `gzip -c | wc -c`.
**Finding:** HTML 9.8 KB (budget 60) · page entry JS 11.4 KB + game code ≈ 17 KB inside the
400 KB engine chunk (Phaser ≈ 383 KB; app budget 80) · CSS 7.7 KB · game assets 29.8 KB per tier
with placeholders (budget 1.2 / 0.7 MB — re-measure once the real art lands; no `tier: "high"`
asset has art yet, so both tiers load the same files).
**Rule of thumb:** Re-run the measurement after every media wave; the art, not the code, is what
can blow the mobile budget.

## 2026-09-27 — "Transparent" AI images are a painted checkerboard

**Context:** Cristian's terrain, bridge and tree PNGs looked transparent in the chat preview.
**Finding:** They were RGB with no alpha at all: the grey/white checkerboard (plus faint grid lines)
is painted into the pixels, and a baked glow tints it near a lantern. `detectBackground` rejected
them as `unknown`. Now detected as `checker` (≥ 60 % light near-neutral border — lower than the
95 % of the other kinds because a bridge's terrain ends run off the canvas) and keyed by a border
flood-fill plus enclosed strictly-grey holes ≥ 16 px (canopy gaps), then a 2-px erosion.
**Rule of thumb:** Always check `metadata().hasAlpha` on a delivery before trusting its
"transparency"; if a new generator paints a different checker, tune `isCheckerLike` against the
real file, not a synthetic one.

## 2026-09-27 — Pre-existing e2e failures seen during the visual refresh

**Context:** full `pnpm test:e2e` run.
**Finding:** `menu.spec.ts` → "a stub panel is titled…" expects a `lab` stub panel that Phase 9
replaced with `stack`; and "recruiter test…" is flaky under parallel load — on the untouched base
commit it failed 2 of 4 repeats, once with the panda having run _past_ Fiora to Transcolombia
(the fast-travel run can overshoot its target at low frame rates). Both reproduce on the base
commit, so neither was caused by this change.
**Rule of thumb:** Before blaming a change for a red e2e, run the same spec with
`--repeat-each=4` on the base commit in a `git worktree`.

## 2026-09-27 — Budget re-measured with the first painted scenery

**Finding:** `public/game/` is 260 KB in all (the two backdrops ≈ 180 KB, both loaded on every
tier; terrain, bridge and trees ≈ 38 KB) — well inside 0.7 MB. Loading only the backdrop for
the current aspect would save ~45–135 KB if the budget ever gets tight.
