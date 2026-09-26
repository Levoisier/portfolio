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
