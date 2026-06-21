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

## Carry-forward constraints (must not regress)

Live facts every v3 phase must respect.

- **LCP guard.** The hero panda (`panda-body`, `panda-hero.png`) is the LCP element. Never set startup opacity/transform on it; its frame at scroll progress `0` must equal the static painted state. Any v3 hero change keeps this. (LESSONS 2026-06-20.)
- **Mobile LCP is still open** (~3.2s vs ≤2.5s target). Do not make it worse — desktop-gate heavy effects, keep mobile lean.
- **Existing media only.** No new media can be generated right now. Build everything from the assets already in `/public/media` — the **four panda poses** (`panda-hero`, `panda-head`, `panda-coding`, `panda-wave`), the backdrop layers, the lab `.webp`s, and the textures. Reuse poses creatively (CSS transforms, flip, crop, filters); never reference a media path that does not exist.
- **Derivative regen.** When `/media/panda/panda-hero.png` is replaced, regenerate `panda-hero-{320,480,800}.webp`.
- **Engine intact.** Smooth scroll + the `[data-scene]` → `SCENE_REGISTRY` pattern stay as-is; add scenes via one registry line, never edit the controller core (ScrollSmoother infra is the sole exception, already in place).
- **Standing gate for every phase:** `pnpm verify` exits 0 · reduced-motion fallback correct (no pin/scrub/loops/cursor-tracking; instant reveal) · no hardcoded colors outside `tokens.css` · no horizontal scroll / no CLS at 375–2560px · Lighthouse stays ≥ desktop 90 / mobile 80 / A11y 95.

---

# v3 — Narrative & Character

**Vision:** lead with the work, carry it with a character. The page is reordered to open on the **projects**, move through **confidential** work, reveal the **stack** (periodic table) as the toolkit behind it all, and close at **contact**. A single panda "engineer" threads the whole page — present in the hero, presenting the projects, guarding the classified lab, standing by the reagents, waving goodbye — reacting to scroll and cursor. Everything is built from the **four existing panda poses** (no new art) plus the existing lab/backdrop/texture media.

**Target section order:** Hero → **Projects** → **Confidential** → **Skills (Stack)** → Contact.

**Tooling (locked):** GSAP + ScrollSmoother only (no three.js / framer-motion / React). Heavy effects desktop-gated via `gsap.matchMedia()`; mobile stays a lean vertical reveal. Existing media only.

Each phase below ends with a **Manual test (dev)** block — the exact things to check in a running `pnpm dev`. The build must pass `pnpm verify` and be committed before moving on.

---

## Phase 17 — Reorder: lead with the work

### [x] refactor(layout): reorder sections to projects-first

**Acceptance criteria:**

- `src/pages/index.astro` order becomes: `Hero`, `Projects`, `ConfidentialProjects`, `Skills`, `Contact`.
- Every scene still registers and fires after the reorder (controller queries `[data-scene]` in DOM order; pin/refresh order follows automatically). No console errors.
- Smooth scroll, the backdrop stage, and the hero pin still behave; no positional jump introduced by the new order.
- No hardcoded colors; no layout break at any viewport.
- `pnpm verify` passes.

**Manual test (dev):** Scroll top→bottom — order is Hero → Projects → Confidential → Stack → Contact. Each section’s animation still triggers; backdrop stays continuous; no console errors; no sideways scrollbar.

**Files:** `src/pages/index.astro`

---

## Phase 18 — Hero: open the story

### [x] feat(hero): premise story-open + drop the wave crossfade

**Acceptance criteria:**

- Add a short **premise/story kicker** to the hero that frames the narrative (e.g. a one-line lead above or below the name). Copy only — colors/spacing via tokens. Must stay legible over the backdrop.
- **Drop** the hero scroll crossfade into `panda-wave` (the wave belongs to the Contact goodbye). The hero centerpiece stays `panda-hero` (the flask) throughout.
- Replace the crossfade with a subtle **“reaction begins” beat** on the flask — a gentle, transforms/opacity-only life (e.g. soft glow/scale pulse or a scrub-driven intensification). No layout thrash; 60fps.
- Keep the pinned depth scrub (atmosphere darken/scale, particles push) — it works.
- **LCP guard (blocking):** the panda paints immediately and is identical to the static hero at scroll 0; never hidden/transformed at startup.
- Reduced motion: instant, static, premise copy visible, no pulse.
- `pnpm verify` passes.

**Manual test (dev):** Hero shows the premise line; the panda no longer morphs into the waving panda on scroll; the flask has a subtle life (still under reduced motion); the panda is fully painted and unmoved at the very top.

**Files:** `src/components/sections/Hero.astro`, `src/scripts/scroll/scenes/hero.ts`

---

## Phase 19 — Projects: creative “experiment log” (no cards)

### [x] feat(projects): card-less creative project presentation

**Acceptance criteria:**

- **Remove the classic card grid / horizontal gallery.** Present the three real projects (Le Parche, Maison Cielare, Orquestia) as an editorial, non-card layout — e.g. large numbered entries (`01–03`), oversized project name, the stack rendered as an inline “formula” of element-style chips, a one-line description, and a `Live →` link. Strong typography, generous space, scarlet accents — all via tokens.
- `panda-coding` returns as a **recurring “builder” accent** that reacts (parallax and/or hover), desktop-gated.
- Desktop: one cohesive cinematic reveal (scrub or pinned step-through) that feels like _presenting results_ — smooth under ScrollSmoother, last entry never clipped. Mobile: lean vertical reveal.
- Accessibility: each project is a semantic heading + content with a keyboard-reachable link (`target="_blank"` + `rel="noopener noreferrer"`); meaningful order.
- Remove dead code from the old card/gallery scene that no longer applies (keep `projects.ts` building cleanly).
- Reduced motion: static, instant, fully readable. No horizontal page scroll; no CLS.
- `pnpm verify` passes.

**Manual test (dev):** Projects reads as a creative experiment log, **not** cards; the 3 real projects show with working Live links; desktop has a smooth reveal, mobile stacks cleanly, reduced-motion is instant/static; `panda-coding` accent present on desktop; no sideways scrollbar.

**Files:** `src/components/sections/Projects.astro`, `src/scripts/scroll/scenes/projects.ts`, `src/styles/global.css`

---

## Phase 20 — Panda companion (existing poses) + cursor reactivity

### [x] feat(companion): scroll/cursor-aware panda companion

**Acceptance criteria:**

- Add a persistent **desktop** panda companion that changes pose per section using the existing four poses (sensible mapping, e.g. Projects → `panda-coding`, Confidential → `panda-head` redacted/silhouette, Stack → `panda-hero`, Contact → `panda-wave`; the hero keeps its own centerpiece so the companion can fade in after it).
- The companion **tilts/looks toward the cursor** (subtle rotation/translation) and **cross-fades pose** as sections change. Fixed position, behind content, `pointer-events: none`, `aria-hidden`.
- Implement as a new scene `src/scripts/scroll/scenes/companion.ts` registered with **one** line in `SCENE_REGISTRY`, driven by a fixed `data-scene="companion"` element that lives **outside `#smooth-wrapper`** (like `#scroll-stage`) so it stays truly fixed. Pose cross-fade driven by `scroll:progress` or per-section ScrollTriggers — no double-driving.
- Pose images lazy-loaded + `decoding="async"`; transforms/opacity only; desktop-gated.
- Mobile: no fixed companion (lean); reduced motion: a single static pose (or none), no cursor tracking, no cross-fade.
- `pnpm verify` passes.

**Manual test (dev):** On desktop a panda sits in a corner, looks toward the cursor, and changes pose as you scroll between sections; it never blocks clicks or text; on mobile it’s absent; under reduced motion it’s a single static pose with no tracking.

**Files:** `src/scripts/scroll/scenes/companion.ts`, `src/scripts/scroll/controller.ts` (one registry line), `src/layouts/Layout.astro`, `src/styles/global.css`, `ASSETS.md`

---

## Phase 21 — Confidential: redacted-lab treatment + peek

### [x] feat(confidential): classified-lab creative pass

**Acceptance criteria:**

- **Golden Rule 5 holds:** no client/employer names, no screenshots, no repo/demo links. Allowed: industry, role, stack, abstracted impact, duration, team size.
- Lean further into the “classified lab files” aesthetic (redaction bars, blueprint grid, scan lines already exist). Add a **redacted panda “peek”** using an existing pose with a silhouette/redaction CSS treatment (e.g. brightness-0 filter) so it reads as a stealth panda behind the files.
- Micro-interaction: hovering/focusing a file gives a subtle reaction (existing scan-line/sheen + a small panda or accent response). Keyboard accessible.
- Reduced motion: content readable, motion-only decor hidden (per existing LESSON), redacted panda static.
- `pnpm verify` passes.

**Manual test (dev):** Confidential reads as classified files with a redacted panda peeking; hovering/focusing a file has a subtle reaction; no client-identifying info anywhere; reduced motion is calm and readable.

**Files:** `src/components/sections/ConfidentialProjects.astro`, `src/scripts/scroll/scenes/confidential.ts`

---

## Phase 22 — Stack (periodic table) refresh, below Confidential

### [x] feat(skills): refresh the reagent stack in its new position

**Acceptance criteria:**

- Periodic-table tiles + the hover/focus interaction (scale 1.08, category badge, proficiency bar, neighbour dim to 70%) + the scrubbed assemble are **preserved**.
- Reframe for its new spot after the work: copy/label tuned (e.g. “The Reagents” / “toolkit behind the builds”) so it reads as the toolkit, not a generic stack.
- Re-introduce **one tasteful lab accent** (a single existing glassware/molecule) deliberately placed — low opacity, behind content, no overflow, no clutter (do not repeat the reverted over-placement). Reduced-motion static.
- Responsive: grid wraps cleanly 375–2560px, min tile width 56px, no overflow.
- Reduced motion: instant full-opacity grid; hover badge CSS-only.
- `pnpm verify` passes.

**Manual test (dev):** Stack sits below Confidential; tiles still assemble on scroll and the hover interaction is intact; the reframed copy reads as a toolkit; a single tasteful glassware accent sits behind it with no overflow/clutter; reduced motion shows the full grid instantly.

**Files:** `src/components/sections/Skills.astro`, `src/scripts/scroll/scenes/skills.ts`

---

## Phase 23 — Narrative connective copy + lab through-line

### [x] feat(narrative): thread the sections into one arc

**Acceptance criteria:**

- Add short story/connective copy (kickers, section leads, a closing line at Contact) so reading top→bottom feels like one arc led by the panda-engineer, consistent with the new order. Tokens only; no client info in/near Confidential.
- Re-introduce the molecule motif as a **subtle** through-line only where it earns its place (e.g. one molecule drifting via `data-speed` in 1–2 spots), deliberately placed, low opacity, behind content; reduced-motion static. Avoid the prior over-placement.
- Contact: keep `panda-wave` + lightleak; ensure the close reads as the end of the arc.
- No horizontal scroll / no CLS at any viewport.
- `pnpm verify` passes.

**Manual test (dev):** Reading the whole page feels like one continuous story; a subtle molecule motif appears in a spot or two without clutter; the contact close lands as an ending; nothing overflows.

**Files:** section components, `ASSETS.md`, optional small scene in `src/scripts/scroll/scenes/`

---

## Phase 24 — v3 audit (motion · a11y · perf)

### [x] chore(v3): full cinematic + accessibility + performance audit

**Acceptance criteria:**

- Full **reduced-motion sweep** across every v3 change: no pin/scrub/loops/companion motion/cursor-tracking running; every section reveals instantly and is readable.
- No horizontal scroll and no CLS at 375–2560px.
- **Lighthouse:** desktop ≥90, mobile ≥80, A11y ≥95, Best Practices / SEO maintained; record the numbers in `LESSONS.md`. Confirm the LCP guard is intact and mobile LCP is not worse than baseline.
- Remove any dead code/markup left from the removed card system; update `ARCHITECTURE.md` (companion + new section order) and append `LESSONS.md` entries for anything non-obvious.
- Check off Phases 17–24.
- `pnpm verify` passes.

**Manual test (dev):** Toggle reduced motion and scroll the whole page — everything is instant/static, nothing janky; resize 375→2560 with no sideways scroll or jumps; the page reads as one story end-to-end.

**Files:** various, `LESSONS.md`, `ARCHITECTURE.md`, `BACKLOG.md`
