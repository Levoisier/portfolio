# BACKLOG.md

Ordered build backlog for the loop agent. Work top-to-bottom — each item builds on the last and the build must never break mid-item.

**Before starting any item:** read AGENTS.md (Golden Rules + verify gate).
**Before checking an item done:** run `pnpm verify` and confirm it exits 0.

---

## Shipped — v1 (foundation)

Phases 1–10. One-line orientation ledger only — **do not re-implement.**

- Self-hosted variable fonts (DM Mono + Inter).
- Hero entrance choreography. **→ Superseded by v2/v3.**
- Global 3-layer parallax backdrop stage (`scroll:progress`).
- Skills periodic-table hover/tap + proficiency bars.
- Projects scroll-reveal + hover. **→ Superseded by v2, then v3.**
- Confidential redacted / scan-line / blueprint treatment.
- Contact section animation + flourish.
- Responsive passes (375px–2560px) + reduced-motion audit.
- Lighthouse baseline: desktop 99 / mobile 88; A11y, Best Practices, SEO 100.

---

## Shipped — v2 (cinematic restructure)

Phases 11–16. One-line orientation ledger only — **do not re-implement.** v3 (below) intentionally supersedes several; tags say which.

- **ScrollSmoother** smooth-scroll foundation — the one sanctioned controller-core edit; `effects: true` enables `data-speed`/`data-lag`. Skipped under reduced motion. (ARCHITECTURE “Smooth scroll”.)
- **Hero pinned depth scrub intro** — pinned ~140vh; `panda-hero`→`panda-wave` crossfade; atmosphere darkens/scales, particles push forward; depth runs on an inner `.stage-depth` channel so the backdrop parallax never fights it. **→ Reworked by v3 Phase 18 (story-open; crossfade dropped).**
- **Backdrop stage** kept (atmosphere / mid-glass / particles), outer-layer parallax + inner depth channel.
- **Skills reagent-shelf** — asymmetric vertical label + anchored grid + scrubbed tile assemble; hover/focus interaction preserved. **→ Moves below Confidential + refreshed by v3 Phase 22.**
- **Projects horizontal pinned gallery** (classic cards). **→ Superseded by v3 Phase 19 (creative, card-less).**
- **Lab-asset continuity thread** — built then **reverted** (poorly placed); lab `.webp`s kept on disk for deliberate re-placement in v3.

---

## Shipped — v3 (narrative & character)

Phases 17–24. One-line orientation ledger only — **do not re-implement.** v4 (below) refines several; tags say which.

- **Reordered to work-first:** Hero → Projects → Confidential → Skills → Contact.
- **Hero story-open** — premise kicker + a non-LCP flask reaction glow on the pinned depth scrub; the hero `panda-hero`→`panda-wave` crossfade was dropped. (LCP panda untouched.) **→ De-centered by v4 Phase 26.**
- **Projects experiment-log** — card-less editorial entries, formula-style stack chips, live links, pinned reveal. **→ Refined by v4 Phase 27 (numbering, liquid-glass legibility, livelier reveal).**
- **Panda companion** — fixed desktop companion, cursor-aware, pose cross-fade driven by **raw page progress**, parked on the right edge. **→ Reworked by v4 Phases 28–29 (per-section/per-item driver, right↔left route).**
- **Confidential** — classified redacted-lab treatment (blueprint grid, scan-line, redaction bars).
- **Skills (Stack)** — reagent periodic-table refreshed in its post-Confidential slot.
- **Narrative connective copy** + subtle molecule through-line; Contact `panda-wave` + lightleak close.
- **v3 audit** — reduced-motion / a11y / static-perf sweep (real Lighthouse/CLS left as a human-dev follow-up; see LESSONS 2026-06-21).

---

## Carry-forward constraints (must not regress)

Live facts every v3 and v4 phase must respect.

- **LCP guard.** The hero panda (`panda-body`, `panda-hero.png`) is the LCP element. Never set startup opacity/transform on it; its frame at scroll progress `0` must equal the static painted state. Any hero change keeps this. (LESSONS 2026-06-20.)
- **Mobile LCP is still open** (~3.2s vs ≤2.5s target). Do not make it worse — desktop-gate heavy effects (incl. `backdrop-filter`), keep mobile lean.
- **Existing media only.** No new media can be generated right now. Build everything from the assets already in `/public/media` — the **five panda images** (`panda-hero`, `panda-head`, `panda-coding`, `panda-wave`, `panda-master`; `panda-head` is still unused), the backdrop layers, the lab `.webp`s, and the textures. Reuse poses creatively (CSS transforms, flip, crop, filters); never reference a media path that does not exist.
- **Derivative regen.** When `/media/panda/panda-hero.png` is replaced, regenerate `panda-hero-{320,480,800}.webp`.
- **Engine intact.** Smooth scroll + the `[data-scene]` → `SCENE_REGISTRY` pattern stay as-is; add scenes via one registry line, never edit the controller core (ScrollSmoother infra is the sole exception, already in place).
- **Standing gate for every phase:** `pnpm verify` exits 0 · reduced-motion fallback correct (no pin/scrub/loops/cursor-tracking/route; instant reveal) · no hardcoded colors outside `tokens.css` · no horizontal scroll / no CLS at 375–2560px · Lighthouse stays ≥ desktop 90 / mobile 80 / A11y 95.

---

# v4 — Liquid Glass & The Companion’s Journey

**Vision:** take the finished v3 narrative and make it _impressive and effortless to read_. Three moves: (1) a reusable **liquid-glass** material so copy reads cleanly over the backdrop without muting the art; (2) a **de-centered hero** that plays with space; (3) a companion that actually **journeys** — a clear right↔left route across the page, moving per-item through the busy sections, with smoother pose/position transitions and more of the wave.

**Locked design decisions (from the v4 brainstorm):**

- **Companion route:** _zig-zag_ at the section level (Hero handoff → **left**, Confidential → **right**, Skills → **left**, Contact → **center**, then waves) **plus per-element movement inside Projects and Confidential** — it tracks the active item, so it moves more where the items are many. Driven by **per-section / per-item ScrollTriggers**, never raw page progress.
- **Hero (desktop):** **panda left, text right-aligned** asymmetric split; **mobile keeps the centered stack**; LCP panda + pinned depth scrub preserved.
- **Readability:** a **reusable liquid-glass surface** — translucent, subtly refractive, tokenized — applied to over-backdrop copy (Hero, Projects, Skills). **Not** a flat frosted card; the backdrop art must stay visible.

**Tooling (locked):** GSAP + ScrollSmoother only (no three.js / framer-motion / React). Heavy effects desktop-gated via `gsap.matchMedia()` / `@supports`; mobile stays lean. Existing media only. No new colors outside `tokens.css`.

Each phase ends with a **Manual test (dev)** block — the exact things to check in a running `pnpm dev`. The build must pass `pnpm verify` and be committed before moving on. The **Standing gate** (carry-forward, above) applies to every phase.

---

## Phase 25 — Liquid-glass readability primitive

### [x] feat(ui): reusable liquid-glass surface + prove it on Skills

**Acceptance criteria:**

- Add **tokens** in `tokens.css` for the glass material (tint fill, light border/rim, specular-sheen color, blur radius, corner radius). No hardcoded colors anywhere.
- Build a **reusable** surface — a `.liquid-glass` utility (and/or a small `src/components/ui/GlassSurface.astro` wrapper) — that renders a translucent, subtly refractive material: `backdrop-filter` blur + saturate, a soft inner-top **specular highlight**, a 1px bright rim, a low-tint fill. The backdrop art stays visible through and around it; text on top meets **AA contrast**.
- **Not a flat frosted card:** include the liquid cues (a gradient sheen along the top edge, a slightly brighter rim) so it reads as glass — deliberate and light. Any sheen drift is decorative-only and **disabled under reduced motion**.
- **Performance:** gate `backdrop-filter` behind `@supports` + desktop; provide a lean fallback (solid low-opacity tint, no blur) on mobile / unsupported browsers so mobile LCP isn’t hurt.
- **Prove it on Skills:** wrap the Skills section heading/intro (the copy that currently rides the backdrop) in the glass surface so it reads cleanly. Tiles unchanged.
- Reduced motion: material renders statically (no sheen animation); text fully readable.
- `pnpm verify` passes.

**Manual test (dev):** the Skills heading sits on a translucent glass panel you can still see the backdrop through; text is crisp; toggling reduced motion stops any sheen; mobile shows the lean no-blur fallback with the same readability; no overflow at any width.

**Files:** `src/styles/tokens.css`, `src/styles/global.css`, optional `src/components/ui/GlassSurface.astro`, `src/components/sections/Skills.astro`, `ARCHITECTURE.md`

---

## Phase 26 — Hero: de-center (panda left / text right)

### [x] feat(hero): desktop asymmetric split + glass text block

**Acceptance criteria:**

- **Desktop:** a two-column asymmetric layout — panda anchored **left**, the premise / name / role block **right-aligned** in the right column, with deliberate negative space. **Mobile keeps the current centered stack.**
- Wrap the hero copy in the **liquid-glass** surface from Phase 25 so it reads over the atmosphere.
- **LCP guard (blocking):** `#panda-body` is still the LCP element — painted immediately, never given startup opacity/transform; its frame at scroll 0 equals the static painted state. The de-center is **pure CSS layout** (grid/flex placement), not a GSAP move. Reserve the panda box to avoid CLS.
- Keep the **pinned depth scrub** (atmosphere darken/scale, particles push, `#hero-reaction-glow`) working after the relayout; the reaction glow stays positioned over the flask in its new spot.
- Hero entrance choreography (premise → name chars → role → hint) still plays; reduced motion = instant, static, readable.
- No horizontal scroll; no CLS.
- `pnpm verify` passes.

**Manual test (dev):** on desktop the hero is an editorial split — panda left, text right — over a readable glass block; the panda paints instantly and doesn’t jump at scroll 0; the pin/scrub still runs; on mobile it’s the centered stack; reduced motion is static and readable.

**Files:** `src/components/sections/Hero.astro`, `src/scripts/scroll/scenes/hero.ts`, `src/styles/global.css`

---

## Phase 27 — Projects: alive & readable

### [x] feat(projects): numbered entries, livelier reveal, glass legibility

**Acceptance criteria:**

- Add the **01–03 numbering** (oversized index numerals per entry) the experiment-log concept called for.
- Put each entry’s copy on the **liquid-glass** surface (a glass strip behind the text column) so descriptions read cleanly over the backdrop — fixes the current low-contrast `color-mix` text.
- Make the reveal **more alive:** stagger title → description → formula chips (not just a single opacity lift), with the index numeral / accent rule drawing in; keep it one cohesive pinned reveal under ScrollSmoother; **last entry never clipped**.
- Add **per-entry scroll anchors** (e.g. `data-project-index` on each `[data-project-entry]`) so the companion can track them in Phase 29 — add them now so Phase 29 has stable hooks.
- Preserve the existing hover/focus reaction; keep semantic headings + keyboard-reachable live links (`target="_blank"` + `rel="noopener noreferrer"`).
- Mobile: lean vertical reveal. Reduced motion: static / instant / readable. No horizontal scroll; no CLS.
- `pnpm verify` passes.

**Manual test (dev):** Projects reads as a lively numbered experiment log with crisp text on glass; entries reveal with a staggered beat; live links work; per-entry anchors exist in the DOM; mobile stacks cleanly; reduced motion is instant.

**Files:** `src/components/sections/Projects.astro`, `src/scripts/scroll/scenes/projects.ts`, `src/styles/global.css`

---

## Phase 28 — Companion: real route engine

### [x] refactor(companion): per-section driver + zig-zag route + smooth motion

**Acceptance criteria:**

- **Replace the raw-progress driver.** The companion no longer reads `documentProgress()`. Instead each section drives it via **per-section ScrollTriggers** (enter/leave/progress → an authored waypoint), so pose **and** position track the _visible_ section (fixes the pin-distortion misalignment). This stays scene-local — the controller core and its single registry line are untouched.
- **Zig-zag route:** Hero handoff → fade in **left**; Confidential → **right**; Skills → **left**; Contact → **center**, then wave. The companion visibly travels right↔left and is **never parked on one edge**. (Projects & Confidential get per-item motion in Phase 29.)
- **Smoother transitions:** ease position with lag / `gsap.quickTo` (not `gsap.set` every frame); make the pose cross-fade longer and gentler (a slight scale/slide alongside the opacity) so swaps feel like the panda _turning_, not popping.
- **Pose per section + more wave:** sensible per-section mapping using existing poses; `panda-wave` used at the hero greeting/handoff **and** the contact goodbye (more than today’s last-10% cameo).
- Stays a fixed scene outside `#smooth-wrapper`, behind content, `pointer-events:none`, `aria-hidden`; the cursor look-toward is preserved.
- Mobile: no fixed companion. Reduced motion: a single static pose, no route, no cursor tracking, no cross-fade.
- `pnpm verify` passes.

**Manual test (dev):** scrolling desktop, the panda enters left at the hero, crosses to the right at Confidential, back left at Skills, and waves center at Contact — gliding smoothly and changing pose per section, never stuck on the right; mobile absent; reduced motion is one static pose.

**Files:** `src/scripts/scroll/scenes/companion.ts`, section components (add `data-companion-stop` waypoints if needed), `ASSETS.md`, `LESSONS.md`

---

## Phase 29 — Companion: per-element tracking + arrival reactions

### [x] feat(companion): item-level motion in Projects/Confidential + reactions

**Acceptance criteria:**

- **Per-element movement** inside Projects and Confidential: as each project entry / confidential card becomes active, the companion moves to sit beside **that item** (vertical tracking + a small lateral offset to the side opposite the text), using the Phase-27 `data-project-index` anchors and the existing `[data-confidential-card]` / `data-index`. The panda visibly “walks the list” where items are many — the back half is no longer static.
- **Arrival reactions** (the “more interactive” ask): a small beat when the companion reaches a stop — Confidential → swap to a **redacted `panda-head` peek** (brightness-0 silhouette) reading as a stealth panda guarding the files (finally uses the unused `head` pose); Contact → the companion’s wave **hands off** to the in-section `panda-wave` watermark with **no double panda / no overlap**.
- Reactions are transforms/opacity only, desktop-gated, 60fps; no layout thrash; no new media.
- Reduced motion: no per-item motion, no reactions — the single static pose from Phase 28.
- `pnpm verify` passes.

**Manual test (dev):** scrolling Projects/Confidential on desktop, the panda moves down alongside each item and reacts on arrival (redacted peek in Confidential); at Contact the companion wave resolves into the section’s wave watermark with no overlap; mobile / reduced motion unaffected.

**Files:** `src/scripts/scroll/scenes/companion.ts`, `src/components/sections/Projects.astro`, `src/components/sections/ConfidentialProjects.astro`, `src/components/sections/Contact.astro`, `ASSETS.md`

---

## Phase 30 — v4 audit (motion · a11y · perf · docs)

### [ ] chore(v4): full audit + condense docs

**Acceptance criteria:**

- **Reduced-motion sweep** across every v4 change: liquid-glass static (no sheen), hero static split readable, projects instant, companion a single static pose with no route / tracking / reactions.
- No horizontal scroll and no CLS at 375–2560px; the liquid-glass fallback verified on mobile / unsupported; **mobile LCP not worse than baseline**; LCP guard intact.
- **Lighthouse:** desktop ≥90, mobile ≥80, A11y ≥95, Best Practices / SEO maintained — record the numbers in `LESSONS.md`.
- Update `ARCHITECTURE.md` (liquid-glass primitive + companion route engine), `ASSETS.md` (`head` / `wave` usage), append `LESSONS.md` for anything non-obvious; condense v4 into a shipped ledger and check off Phases 25–30.
- `pnpm verify` passes.

**Manual test (dev):** toggle reduced motion and scroll end-to-end — glass static, companion a single pose, everything instant and readable; resize 375→2560 with no sideways scroll or jumps; the page reads as one impressive, legible story.

**Files:** various, `LESSONS.md`, `ARCHITECTURE.md`, `ASSETS.md`, `BACKLOG.md`
