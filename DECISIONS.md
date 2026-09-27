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

**Status:** Accepted (installed in Phase 2: `@fontsource/pixelify-sans` 5.3.0 → `400.css`,
`@fontsource-variable/inter` 5.3.0 → `wght.css`, imported by `tokens.css`)
**Why:** Pixelify Sans (OFL, Google Fonts, latin + latin-ext → Spanish accents) matches the
pixel look for headings/UI; Inter (OFL) keeps long panel text readable. Self-hosted: no
third-party font request.
**Trade-off:** Two font families to load. Both CSS files declare every subset with a
`unicode-range`, so the browser downloads only latin (and latin-ext when used); the other subset
files ship in `dist/` but are never requested. (Fontsource's `latin-400.css` alone has no
`unicode-range`, so combining it with `latin-ext-400.css` would let the latin-ext face shadow
basic Latin.)

## In-world pixel text: rasterized Pixelify Sans as a BitmapText font

**Status:** Accepted (Phase 2 prototype: the name label in the empty world)
**Why:** Canvas text must be binary-alpha and crisp at every zoom. Pixelify Sans has 11 design px
per em, but its outlines are offset ~0.66 px from the pen and chamfered, so drawing at 11 px
blurs every stem across two pixels. `game/text/` renders each glyph at 88 px (8 px per design
pixel), finds the grid phase once on a sample, turns each 8×8 cell into one pixel (coverage
≥ 50 %), packs a white atlas with `textures.createCanvas` and registers it with
`cache.bitmapFont.add`. Glyphs: printable ASCII, Latin-1 (á é í ó ú ü ñ ¿ ¡) and — – … ’ “ ”.
It is rebuilt after `fonts:ready` in about the time of one frame.
**Rejected:** Phaser `Text` (anti-aliased); `RetroFont` (fixed-width grid); a prebuilt BMFont
file (one more asset and a second font source of truth).
**Trade-off:** One size (11 px, cap height 7); larger in-world text would need a second
registration at a multiple.

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

## Panel links: Space activates them too, not just Enter

**Status:** Accepted (2026-09-26)
**Why:** BACKLOG.md Phase 5 asks that Enter _and_ Space activate the controls inside an open
panel. A real `<a href>` only answers to Enter by default (Space is a button-only convention);
every other control in a panel (close, gallery thumbnails, gallery nav) is a real `<button>`, so
without this a project's live link would be the one control in the panel that behaves
differently. `src/ui/panels.ts`'s single keydown listener adds `e.preventDefault()` +
`el.click()` for Space on any `a[href]` inside the open panel — a normal, transient-activation
safe pattern (the synthetic click still runs inside the trusted keydown handler), so `target=
"_blank"` still opens a new tab under a popup blocker.
**Trade-off:** A screen reader that already announces "link" for that control now also responds
to a key screen-reader users don't expect a link to answer to; scoped to panel content only
(`section.contains(link)`), so it never changes how links behave anywhere else on the page.

## The pad outranks panels and the menu; a handheld dialog stays in the screen's own box

**Status:** Accepted (2026-09-27, BACKLOG.md Phase 6)
**Why:** GAME_DESIGN.md's control table promises `B` closes the topmost open panel or menu, the
same as Esc. A panel's backdrop is `position: fixed; inset: 0`, so with the pad's original
`--z-pad: 20` (below `--z-panel: 30`) an open panel fully covered the physical D-pad/A/B/START —
reachable to a keyboard's Esc, unreachable to a touch visitor's actual finger. `--z-pad` moved
above `--z-panel`/`--z-menu` (still below `--z-loading`), and `shell.css` constrains a handheld
dialog (`section[data-panel]`, `.panel`) to the screen's own top-half box instead of the full
viewport, so it never visually fights the pad for the same pixels. `landscape-touch` panels stay
full-viewport (its pad is a slim translucent strip, not a solid half-screen block).
**Trade-off:** A handheld panel's usable height is capped at roughly half the viewport (it already
scrolls internally past that, `.panel`'s existing `overflow-y: auto`); the gallery lightbox (a
second, nested modal `B` still closes first, same as Esc) was left visually unconstrained to the
same box, since its own z-index already sits below the pad — only a cosmetic overlap in the rare
case its enlarged image reaches the very bottom of a short viewport.
