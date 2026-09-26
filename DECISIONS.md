# DECISIONS.md — Architecture Decision Records

ADR-lite, newest last. Template:

```
## <decision>
**Status:** Accepted / Proposed / Superseded by <link>
**Why:** the reason.
**Trade-off:** what we give up.
```

The previous scroll-narrative site's ADRs (Astro + GSAP ScrollSmoother, glass UI, companion
panda) are superseded by this rebuild; read them in git history at `51bbf3c` if needed.

---

## Rebuild the portfolio as a game, from scratch

**Status:** Accepted (2026-09-26)
**Why:** The scroll site felt buggy and unsurprising; most bugs came from layered scroll
choreography. Cristian chose a playable 2D pixel-art side-scroller. Only the content survives:
projects, confidential work, stack and personal info (`src/content/`) plus the Fiora screenshots.
**Trade-off:** Months of prior visual work are discarded; the site is a game-first experience.

## No classic view — the recruiter path lives inside the game

**Status:** Accepted
**Why:** Cristian explicitly rejected a separate classic page. Instead, speed-to-content is
designed into the game: scroll-to-walk, click-to-travel, a fast-travel menu, an always-visible
Contact button, deep links (`/#fiora`), and all content as pre-rendered DOM panels.
**Trade-off:** Visitors who dislike games still enter the world; mitigated by the ≤ 10 s
recruiter test in Phase 7.

## Side-scroller, not top-down

**Status:** Accepted
**Why:** A single left→right path mirrors a narrative page, maps to the scroll wheel and a
two-button touch pad, and needs one walk direction of art (flipped), roughly half the sprite
work of a 4-direction top-down game.
**Trade-off:** Less free exploration.

## Phaser 4 as the engine

**Status:** Accepted
**Why:** Mature, MIT, TypeScript types in the package; built-in arcade physics, animation,
cameras, input (incl. multi-touch), loader, particles, and v4 Filters for the desktop
ambience. A battle-tested engine reduces the "buggy" risk for an agent-built codebase, and the
bundled types catch Phaser-3-only API use at compile time. 4.2.1 is the current stable
(first v4 stable: April 2026).
**Trade-off:** ~1.38 MB min / ~355 KB gzip, loaded lazily after first paint. A custom
Canvas2D engine would be ~10× smaller but means writing physics/animation/input ourselves;
KAPLAY is smaller but less proven. Revisit with a Phaser custom build in Phase 12.

## Astro static shell; canvas draws art, DOM holds text

**Status:** Accepted
**Why:** Astro renders the shell, meta and the content panels as static HTML (SEO, screen
readers, instant language switch, crisp text at any DPR) and bundles TS. Phaser only paints the
world. The two talk through one typed event bus.
**Trade-off:** Two rendering layers to keep in sync (positions of prompts, pause state).

## Level as typed data; geometry from strips and props, no tilesets

**Status:** Accepted
**Why:** Agents can read, diff and validate a TypeScript layout; a map editor (Tiled/LDtk)
needs a GUI. The world is mostly flat ground + a few platforms, so a seamless floor strip and
standalone platform/prop sprites cover it — and AI image tools handle standalone props far
better than seamless multi-tile tilesets.
**Trade-off:** No visual level editor; complex terrain would be awkward (not needed).

## Asset pipeline with global palette snapping

**Status:** Accepted
**Why:** AI-generated "pixel art" has no real grid, ~100 k colors, no alpha and inconsistent
frame sizes. Normalizing everything at build time (chroma key → grid → one palette → baseline)
makes art from different tools and sessions look like one game, and lets placeholders stand in
with final geometry so media never blocks code.
**Trade-off:** Pipeline complexity; some AI detail is lost in snapping.

## One 29-color palette derived from the brand

**Status:** Accepted
**Why:** Brand anchors scarlet `#E11D2A`, navy `#0F2342`, ink `#0A0A0A`, paper `#F5F3EE` expanded
into ink/navy/scarlet/paper/amber/dusk ramps for sprites, lights and the night→dawn sky. Green is
excluded (reserved for the chroma key; it also caused the old site's clash).
`src/design/palette.json` is canonical; `tokens.css` mirrors it; a test enforces both and bans
color literals elsewhere.
**Trade-off:** Art must live within 29 colors.

## Pixel-perfect rendering via low-res canvas + integer device-pixel zoom

**Status:** Accepted
**Why:** Integer scaling in **device** pixels keeps every art pixel square on 1×, 2× and 3×
screens; a low-resolution backing store is also cheap on phones. Target view height 360 (desktop)
/ 240 (touch) with variable width shows more world on wider screens instead of stretching.
**Trade-off:** Camera moves in whole art pixels (authentic, slightly steppier parallax).

## Two quality tiers

**Status:** Accepted
**Why:** Cristian wants more ambience on desktop than on mobile. One module decides the tier
(`high` / `low`) plus a runtime FPS downgrade, so no scene invents its own device checks.
**Trade-off:** Two configurations to test.

## Fonts: Pixelify Sans + Inter

**Status:** Accepted (installation in Phase 2)
**Why:** Pixelify Sans (OFL, Google Fonts, latin + latin-ext → Spanish accents) matches the
pixel look for headings/UI; Inter (OFL) keeps long panel text readable.
**Trade-off:** Two font families to load; subset both.

## Languages: ES + EN, Spanish by default

**Status:** Accepted (2026-09-26, confirmed by Cristian)
**Why:** Content exists in both languages. Spanish is the default (as on the old site,
`html lang="es-419"`); the stored `ES · EN` toggle always wins. No browser-language detection.
**Trade-off:** International visitors land in Spanish and switch with one tap.

## Testing: Vitest + Playwright 1.56.1

**Status:** Accepted
**Why:** Vitest for pure logic (fast, no browser). Playwright for the real canvas and DOM.
`@playwright/test` is pinned to 1.56.1 because that matches the Chromium preinstalled in the
cloud agent container (`/opt/pw-browsers`); locally run `pnpm exec playwright install chromium`.
`pnpm test:e2e` builds and serves its own preview on port 4323 and never reuses a running server,
so it can't silently test a dev server or a stale build.
**Trade-off:** Upgrading Playwright requires matching browsers.

## Not installable — no PWA

**Status:** Accepted (2026-09-26)
**Why:** Cristian does not want the portfolio installable; an app install prompt makes no sense
for a portfolio. The old site's `site.webmanifest` and Android install icons were removed in the
reset. No web app manifest, no service worker, no standalone-mode meta tags, no install prompt.
Favicons are allowed; the old ones were removed in the reset and Phase 12 regenerates them from
`panda-portrait`. `src/policy/no-pwa.test.ts` and the e2e smoke test fail if any of it returns.
**Trade-off:** No offline play and no home-screen app; visitors can still bookmark the site.

## Audio off by default, procedural SFX

**Status:** Proposed (decide in Phase 11)
**Why:** Autoplaying sound on a portfolio is hostile; procedural SFX (e.g. ZzFX, ~1 KB) avoid
shipping audio files.
**Trade-off:** Most visitors never hear it.
