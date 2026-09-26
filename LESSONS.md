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
**Rule of thumb:** Derive the black-key threshold from the border's own max channel (+3), never a
fixed "dark enough" constant; measure fur darkness before choosing.
