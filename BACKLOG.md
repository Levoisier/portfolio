# BACKLOG.md

Ordered build backlog for the loop agent. Work top-to-bottom — each item builds on the last and the build must never break mid-item.

**Before starting any item:** read AGENTS.md (Golden Rules + verify gate).  
**Before checking an item done:** run `pnpm verify` and confirm it exits 0.

---

## Phase 1 — Foundation & Fonts

### [x] feat: self-hosted variable fonts

**Acceptance criteria:**

- Download DM Mono variable (`DMMono-VariableFont_wght.woff2`) and Inter variable (`Inter-VariableFont_opsz,wght.woff2`) — open-licensed, SIL OFL.
- Place both in `/public/fonts/`.
- Uncomment the `@font-face` blocks in `src/styles/global.css`.
- Verify text renders with the correct fonts in `pnpm dev` (DevTools → Fonts tab).
- Confirm `font-display: swap` is set (already scaffolded).
- `pnpm verify` passes.

**Files:** `public/fonts/`, `src/styles/global.css`

---

## Phase 2 — Hero Choreography

### [x] feat(hero): full entrance choreography polish

**Acceptance criteria:**

- Panda body image (`panda-hero.webp`) fades + slides up on load (already wired in hero.ts; verify it works once real asset is placed).
- Hero name ("Cristian Zapata Cartagena") char-stagger animation plays correctly — each character enters sequentially from left.
- Role line ("Full Stack Developer & Chemical Engineer") fades up after name completes.
- Scroll hint bob loop starts after role appears.
- Panda-head layer (`panda-head.webp`) moves upward at 0.4× scroll rate (parallax in `progress()`).
- Reduced-motion: all elements appear instantly at full opacity, no motion.
- Works on mobile (375px) and desktop (1440px).
- `pnpm verify` passes.

**Files:** `src/scripts/scroll/scenes/hero.ts`, `src/components/sections/Hero.astro`

---

## Phase 3 — Global Parallax Backdrop

### [x] feat(backdrop): global parallax scroll stage

**Acceptance criteria:**

- Create `src/scripts/scroll/scenes/backdrop.ts` implementing the global progress listener (`scroll:progress` event).
- Layer stack in `#scroll-stage`:
  - `#stage-atmosphere` — `atmosphere.webp`, opacity 1, parallax rate 0.05× (slowest)
  - `#stage-mid-glass` — `mid-glass.webp`, parallax rate 0.15×, subtle horizontal drift
  - `#stage-particles` — `particles.webp`, parallax rate 0.3× (fastest)
- As global progress 0→1, layers move upward at their respective rates.
- Transition: atmosphere darkens slightly mid-scroll (opacity 0.8 at progress 0.5).
- Images lazy-loaded via JS (not as `<img>` tags — set `background-image` in JS once asset is confirmed present; skip silently if 404).
- Reduced-motion: no parallax, layers static.
- `pnpm verify` passes.

**Files:** `src/scripts/scroll/scenes/backdrop.ts`, `src/layouts/Layout.astro`

---

## Phase 4 — Skills: Periodic Table Interactive

### [x] feat(skills): periodic table hover/tap interactions

**Acceptance criteria:**

- Create `src/scripts/scroll/scenes/skills.ts` replacing `revealPlaceholder` for the skills section.
- On enter: tiles stagger-reveal in reading order (top-left → bottom-right), 30ms between tiles.
- On hover/focus (`:hover`, `:focus-visible`):
  - Tile scales to 1.08×.
  - Category badge (bottom-right) fades in.
  - A small proficiency bar extends along the bottom border (height 2px, filled scarlet).
  - Neighbouring tiles dim to 70% opacity.
- On leave: all return to rest state.
- Proficiency data lives in the `elements` array in `Skills.astro` — add a `proficiency: number` (0–100) field per element.
- Touch: tap toggles the hover state (tap away to dismiss).
- Reduced-motion: no scale/opacity changes; category badge toggles via CSS only.
- `pnpm verify` passes.

**Files:** `src/scripts/scroll/scenes/skills.ts`, `src/components/sections/Skills.astro`, `src/scripts/scroll/controller.ts` (registry entry)

---

## Phase 5 — Projects: Scroll Reveal + Hover

### [x] feat(projects): card scroll-reveal and hover treatment

**Acceptance criteria:**

- Create `src/scripts/scroll/scenes/projects.ts`.
- On enter: cards stagger-reveal with 100ms offset between cards (slide up 30px + fade).
- On hover: card border transitions from `--glass-border` to `--scarlet` over 200ms.
- Screenshot slot: on hover, image opacity transitions from 0.4 → 0.7 (already has `group-hover:opacity-60` — replace with JS-controlled value for consistency).
- Panda-coding accent image (`panda-coding.webp`) parallaxes within the section at 0.2× rate.
- Reduced-motion: instant reveal on enter; no hover motion (border colour only).
- `pnpm verify` passes.

**Files:** `src/scripts/scroll/scenes/projects.ts`, `src/components/sections/Projects.astro`, controller registry

---

## Phase 6 — Confidential: Redacted Card Treatment

### [x] feat(confidential): blueprint card animation + redaction

**Acceptance criteria:**

- Create `src/scripts/scroll/scenes/confidential.ts`.
- On enter: cards reveal with a "scan-line" effect — a horizontal scarlet line sweeps top → bottom over 600ms, then card content fades in.
- Blueprint grid background (already `.blueprint-grid` CSS class) pulses subtly in opacity (0.6 ↔ 1.0, 4s loop).
- Redacted header bars have a faint shimmer animation (linear-gradient sweep, 3s loop).
- Corner accent brackets animate in (draw from corner outward).
- Reduced-motion: instant reveal, no shimmer, no scan-line.
- `pnpm verify` passes.

**Files:** `src/scripts/scroll/scenes/confidential.ts`, `src/components/sections/ConfidentialProjects.astro`, controller registry

---

## Phase 7 — Contact Section

### [x] feat(contact): contact section animation + flourish

**Acceptance criteria:**

- Create `src/scripts/scroll/scenes/contact.ts`.
- On enter: heading stagger-reveal (word-by-word), then contact links fade up sequentially.
- Panda-wave image (`panda-wave.webp`) enters from bottom-right, parallaxes slightly on scroll.
- Light-leak texture (`lightleak.webp`) fades in at 0.2 opacity.
- Closing line fades in last.
- Reduced-motion: instant reveal.
- `pnpm verify` passes.

**Files:** `src/scripts/scroll/scenes/contact.ts`, `src/components/sections/Contact.astro`, controller registry

---

## Phase 8 — Responsive Passes

### [x] fix(responsive): mobile layout pass (375px–767px)

**Acceptance criteria:**

- Hero: panda scales to 60% width, name font scales via fluid `var(--text-hero)` (verify no overflow).
- Skills: tile grid wraps correctly; min tile width 56px.
- Projects: cards stack to 1-col below 768px (already `md:grid-cols-2` — verify).
- Confidential: cards stack to 1-col; blueprint grid visible.
- Contact: links stack vertically (already flex-col below md — verify).
- No horizontal scroll at any viewport width.
- `pnpm verify` passes.

**Files:** All section components, `src/styles/global.css` if needed

### [x] fix(responsive): tablet/large-desktop polish (768px–2560px)

**Acceptance criteria:**

- Periodic table grid flows to a natural 6–8 columns at 1024px+.
- Project cards hit 3-col at 1280px (already `lg:grid-cols-3` — verify).
- Hero panda is centered and does not clip on ultra-wide (2560px).
- Scroll stage backdrop layers are `background-size: cover` and don't show seams at any ratio.
- `pnpm verify` passes.

**Files:** Section components, Layout.astro, global.css

---

## Phase 9 — Reduced-Motion Audit

### [x] fix(a11y): reduced-motion global audit

**Acceptance criteria:**

- Enable DevTools → Rendering → "Emulate CSS media feature: prefers-reduced-motion: reduce".
- Every section reveals instantly at full opacity — no translate, scale, or rotate motion.
- No loops running (bob animation, shimmer, scan-line all stopped).
- Periodic table hover: category badge appears via CSS `:hover` (opacity 0→1) only — no JS motion.
- Hero name readable immediately (chars already visible at opacity 1).
- Document any deviations found in LESSONS.md.
- `pnpm verify` passes.

**Files:** All scene files, `src/styles/global.css` @media block

---

## Phase 10 — Performance & Lighthouse

### [ ] perf: Lighthouse audit pass

**Acceptance criteria:**

- Run Lighthouse against `pnpm preview` on localhost.
- Performance ≥ 90 (desktop), ≥ 80 (mobile).
- Accessibility ≥ 95.
- Best Practices = 100.
- SEO ≥ 90.
- Identified issues: add missing `alt` text, check colour contrast ratios for scarlet-on-navy, verify font-display:swap is active.
- LCP ≤ 2.5s: ensure panda-hero.webp has `loading="eager"` and is properly sized.
- No CLS: all images have explicit `width` and `height` attributes.
- GSAP bundle: verify it tree-shakes — only `ScrollTrigger` is imported, not the full GSDevTools or other plugins.
- Document findings in LESSONS.md.
- `pnpm verify` passes.

**Files:** All section components, Layout.astro, potentially GSAP imports in scenes

### [ ] perf: image optimisation pass

**Acceptance criteria:**

- All webp assets are at correct dimensions per ASSETS.md (Cristian supplies finals via Nano Banana).
- Backdrop images: lazy-loaded via JS (not `<img>` tags).
- Panda-hero and panda-head: `loading="eager"` (above the fold, already set).
- All other images: `loading="lazy"` (already set).
- `decoding="async"` on all images (already set).
- Verify no images load that aren't visible in the initial viewport.
- `pnpm verify` passes.

**Files:** All section components

## Handoff

Stopped during `perf: Lighthouse audit pass` with the build green but the item intentionally unchecked because one acceptance criterion is not met yet.

Done in this pass:

- Desktop Lighthouse: Performance 99, Accessibility 100, Best Practices 100, SEO 100.
- Mobile Lighthouse: Performance 88, Accessibility 100, Best Practices 100, SEO 100.
- Cleared console/favicon failure, colour contrast, font-display, render-blocking, modern format, responsive image, and total-byte-weight audits.
- Added responsive generated WebP derivatives for `/media/panda/panda-hero.png` and kept the canonical PNG as the fallback/source path.
- Deferred non-critical media and the GSAP controller so the static hero can paint first.

Still open:

- Default mobile Lighthouse reports LCP at 3.2s (`panda-hero-320.webp`) against the backlog target of <=2.5s. The image transfer is already small; the remaining delay is Lighthouse mobile render timing/FCP under throttling.
- When Cristian replaces `/media/panda/panda-hero.png`, regenerate `/media/panda/generated/panda-hero-320.webp`, `panda-hero-480.webp`, and `panda-hero-800.webp` from the new source.
