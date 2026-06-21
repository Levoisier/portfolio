# BACKLOG.md

Ordered build backlog for the loop agent. Work top-to-bottom — each item builds on the last and the build must never break mid-item.

**Before starting any item:** read AGENTS.md (Golden Rules + verify gate).
**Before checking an item done:** run `pnpm verify` and confirm it exits 0.

---

## Shipped — v1 (foundation)

Phases 1–10 are complete and live in the codebase. Behaviour is documented in `ARCHITECTURE.md` / `ASSETS.md`, not re-stated here. This is a **one-line orientation ledger only — do not re-implement these.** The v2 cinematic restructure (below) intentionally supersedes several of them; tags say which.

- Self-hosted variable fonts (DM Mono + Inter).
- Hero entrance choreography — panda layers, char-stagger name, role, scroll-hint, head parallax. **→ Superseded by Phase 12** (pinned depth intro).
- Global 3-layer parallax backdrop stage driven by the `scroll:progress` event. **→ Extended by Phases 11–12.**
- Skills periodic-table hover/tap interactions + proficiency bars. **→ Layout reframed by Phase 14; interaction kept.**
- Projects scroll-reveal + hover treatment. **→ Superseded by Phase 15** (horizontal pinned gallery).
- Confidential redacted / scan-line / blueprint treatment. **→ Kept as-is.**
- Contact section animation + flourish. **→ Kept; extended by Phase 16.**
- Responsive passes (375px–2560px) + global reduced-motion audit.
- Lighthouse baseline: desktop 99 / mobile 88; A11y, Best Practices, SEO 100.

---

## Carry-forward constraints (must not regress)

These are live facts from the v1 build that every v2 phase must respect.

- **LCP guard.** `panda-body` (hero) is the LCP element. Never set startup opacity/transform on it; its frame at scroll progress `0` must equal the static painted state. (See LESSONS 2026-06-20 "LCP images should not be hidden or animated by scene startup.")
- **Mobile LCP is still open.** It measured ~3.2s under Lighthouse mobile throttling against a ≤2.5s target. The restructure must not make it worse.
- **Derivative regen.** When `/media/panda/panda-hero.png` is replaced, regenerate `panda-hero-{320,480,800}.webp` in `/media/panda/generated/`.
- **Standing gate for every phase below:** `pnpm verify` exits 0 · reduced-motion fallback correct (no pin/scrub/loops; instant reveal) · no hardcoded colors outside `tokens.css` · Lighthouse stays ≥ desktop 90 / mobile 80 / A11y 95.

---

# v2 — Cinematic Restructure

**Vision:** one continuous narrative — _raw elements → reaction → product_. Atmosphere settles, the panda (engineer) appears, the periodic-table "elements" are pulled off the shelf, glassware and molecules react in the background, and the reaction outputs _projects_. Contact = the compound is finished.

**Tooling decisions (locked):** GSAP **ScrollSmoother** for pacing; **GSAP-only** (no three.js, no framer-motion / React islands). Heavy effects (pin, horizontal scroll, depth intro) are **desktop-gated via `gsap.matchMedia()`**; mobile keeps lean vertical reveals to protect the LCP budget.

---

## Phase 11 — Smooth-scroll foundation (ScrollSmoother)

### [x] feat(controller): integrate GSAP ScrollSmoother

**Acceptance criteria:**

- Restructure `Layout.astro` to the ScrollSmoother DOM contract: `#smooth-wrapper > #smooth-content` around the page slot.
- `#scroll-stage` stays a **fixed sibling OUTSIDE `#smooth-wrapper`** — it must remain truly fixed, `pointer-events: none`, behind content.
- In `controller.ts`, after `gsap.registerPlugin(ScrollTrigger, ScrollSmoother)`, call `ScrollSmoother.create({ wrapper, content, smooth: ~1.2, effects: true, smoothTouch: 0 })` before mounting scenes. `effects: true` is required so `data-speed` / `data-lag` work in later phases.
- **This is the one sanctioned controller-core edit** (Golden Rule 3 covers adding _scenes_; smooth-scroll is infra). Keep it minimal and clearly fenced above the scene-wiring logic.
- Reduced-motion: skip `ScrollSmoother.create()` entirely — native scroll only.
- The global `scroll:progress` event still fires, and every existing scene (hero/skills/projects/confidential/contact) still triggers correctly under smooth scroll.
- In-page anchors / `scroll-behavior` do not fight ScrollSmoother (it owns scrolling now).
- Document it: add a "Smooth scroll" subsection to `ARCHITECTURE.md` noting the controller exception, and a `LESSONS.md` entry.
- Re-run Lighthouse; confirm the standing gate holds.
- `pnpm verify` passes.

**Files:** `src/layouts/Layout.astro`, `src/scripts/scroll/controller.ts`, `src/styles/global.css`, `ARCHITECTURE.md`, `LESSONS.md`

---

## Phase 12 — Hero pinned depth intro

### [x] feat(hero): pinned scrub depth-intro choreography

**Acceptance criteria:**

- Pin the hero for ~120–150vh of scroll on desktop, scrubbed.
- **LCP guard (blocking):** the frame at scrub progress `0` is identical to today's static painted hero. No opacity/transform writes to `panda-body` before the user scrolls.
- As scrub 0→1: `atmosphere` recedes (slight scale-down) and darkens, `mid-glass` drifts laterally, `particles` push toward the viewer (scale up + translate), `panda-head` separates upward from `panda-body`, name stays legible throughout.
- `molecule-a` / `molecule-b` drift within the particle depth during the intro.
- The hero scene drives the stage layers **during the pin only**, then cleanly releases to the existing global parallax for the rest of the page — no double-driving and no positional jump at the handoff.
- Desktop-gated via `gsap.matchMedia()`; below 768px keep the current (v1) entrance choreography, no pin.
- Reduced-motion: no pin, no scrub; instant reveal exactly as v1.
- Mobile LCP not worse than baseline.
- `pnpm verify` passes.

**Files:** `src/scripts/scroll/scenes/hero.ts`, `src/scripts/scroll/scenes/backdrop.ts`, `src/components/sections/Hero.astro`, `src/layouts/Layout.astro` (only if stage markup changes)

---

## Phase 13 — Molecular atmosphere thread (lab assets)

### [x] feat(lab): wire the unused lab assets as a continuity thread

**Acceptance criteria:**

- Introduce the 5 lab assets as decorative parallax, preferring ScrollSmoother `data-speed` / `data-lag` over per-frame scene math:
  - `molecule-a` + `molecule-b` — drift slowly across the page hero→contact at different speeds (the continuity thread).
  - `flask-round` / `beaker-reaction` — rise on the hero→skills handoff.
  - `flask-erlenmeyer` — skills-bench / projects-divider accent.
- All instances: `aria-hidden`, `pointer-events: none`, low opacity, behind content.
- Lazy-loaded, `decoding="async"`; large/heavy instances desktop-gated.
- Add usage notes/rows to `ASSETS.md` for the new placements.
- Reduced-motion: static, low opacity, no drift.
- No CLS, no horizontal scroll at any viewport (375px–2560px).
- `pnpm verify` passes.

**Files:** relevant section components, `ASSETS.md`, optional small lab scene in `src/scripts/scroll/scenes/`

---

## Phase 14 — Skills reframe → "reagent shelf"

### [ ] feat(skills): reagent-shelf layout + scrubbed assembly

**Acceptance criteria:**

- Replace the centered flex-blob + "Stack" heading with an asymmetric layout: a vertical display label (e.g. "REAGENTS" / "STACK"), the tile grid anchored to one side, glassware sitting on a bench line.
- Tiles **assemble into formation on scrub** (scrubbed reveal) rather than the v1 stagger-on-enter.
- The existing hover/focus interaction is **preserved unchanged**: scale 1.08×, category badge, proficiency bar, neighbour dim to 70%.
- Optional flourish: SVG bond-lines connect 2–3 tiles into a "molecule" as the section settles.
- Category legend retained.
- Responsive: grid wraps cleanly 375px–2560px; min tile width 56px; no overflow.
- Reduced-motion: instant full-opacity grid, no assemble motion; hover badge via CSS only (as v1).
- `pnpm verify` passes.

**Files:** `src/components/sections/Skills.astro`, `src/scripts/scroll/scenes/skills.ts`

---

## Phase 15 — Projects horizontal pinned gallery

### [ ] feat(projects): pinned horizontal scroll gallery

**Acceptance criteria:**

- Desktop (≥1024px via `gsap.matchMedia()`): pin the projects section; the card track translates horizontally on scrub, traversing every card before unpinning.
- Tablet/mobile (<1024px): keep the v1 vertical stack reveal — no pin, no horizontal motion.
- `panda-coding` accent parallax retained; border/hover treatment preserved.
- End-of-track and pin release are smooth: last card never clipped; end position recalculated on resize (`ScrollTrigger.refresh`).
- Reduced-motion: static vertical stack, instant reveal.
- Note (not a blocker): cards still use the `panda-coding` placeholder image — flag real project screenshots as an asset dependency in `ASSETS.md`.
- `pnpm verify` passes.

**Files:** `src/components/sections/Projects.astro`, `src/scripts/scroll/scenes/projects.ts`, `ASSETS.md`

---

## Phase 16 — Close the reaction + global cinematic audit

### [ ] feat(contact): compound-formed close + full v2 audit

**Acceptance criteria:**

- The molecule thread resolves at contact (settles into a final "compound" composition); `panda-wave` + `lightleak` retained.
- Cross-section transitions feel continuous under smooth scroll — no abrupt jumps between pinned sections (hero ↔ skills ↔ projects).
- Full reduced-motion sweep across all v2 phases: no pin/scrub/loops running; every section reveals instantly.
- Final Lighthouse: desktop ≥90, mobile ≥80, A11y ≥95, Best Practices / SEO maintained; record numbers in `LESSONS.md`.
- No horizontal scroll and no CLS introduced by the new decor at any viewport.
- `pnpm verify` passes; check off Phases 11–16.

**Files:** `src/components/sections/Contact.astro`, `src/scripts/scroll/scenes/contact.ts`, `LESSONS.md`, `BACKLOG.md`
