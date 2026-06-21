# ARCHITECTURE.md

Technical reference for the portfolio codebase. Read this when adding a section, scene, token, or asset.

---

## Stack

| Layer       | Choice                        | Notes                                                        |
| ----------- | ----------------------------- | ------------------------------------------------------------ |
| Framework   | Astro 5, static output        | Zero client JS by default; GSAP loaded as a client module    |
| Animation   | GSAP 3 + ScrollTrigger        | Free after Webflow acquisition; vanilla TS, no React islands |
| Styling     | Tailwind 3 + CSS custom props | Tailwind for layout/spacing; tokens.css for all colors       |
| Language    | TypeScript strict             | `noUncheckedIndexedAccess` on                                |
| Deploy      | Vercel static                 | `vercel.json` at root; no adapter needed                     |
| Package mgr | pnpm                          | `pnpm-workspace.yaml` approves esbuild + sharp builds        |

---

## Folder Map

```
src/
  styles/
    tokens.css          ← SINGLE SOURCE OF TRUTH — all CSS custom properties
    global.css          ← Tailwind directives + font-face + scroll-stage CSS
  layouts/
    Layout.astro        ← HTML shell, fixed #scroll-stage, imports controller
  pages/
    index.astro         ← Assembles all 5 sections in narrative order
  components/
    sections/           ← One file per section (Hero, Skills, Projects, Confidential, Contact)
    ui/                 ← Shared primitives (empty for now — add as needed)
  scripts/
    scroll/
      types.ts          ← Scene interface, SceneFactory, RegistryEntry
      controller.ts     ← GSAP engine; add scenes via SCENE_REGISTRY only
      scenes/
        hero.ts         ← REFERENCE scene — fully working choreography
        revealPlaceholder.ts ← Generic fallback reveal for all other sections

public/
  fonts/                ← Self-hosted variable woff2 files
  media/
    panda/              ← Panda images (see ASSETS.md for exact paths + dims)
    backdrop/           ← Full-bleed parallax layers
    lab/                ← Lab/chemical decor elements
    texture/            ← Blueprint paper, light-leak overlay

scripts/
  verify.sh             ← pnpm verify entry point
```

---

## Design Tokens

**File:** `src/styles/tokens.css`  
**Rule:** Every color, font, spacing rhythm, easing value, and z-index is a CSS custom property in this file. Never write a hex/rgb/hsl value anywhere else in the codebase.

### Color palette

| Token            | Value                  | Use                                    |
| ---------------- | ---------------------- | -------------------------------------- |
| `--scarlet`      | `#E11D2A`              | Primary accent, CTAs, category accents |
| `--scarlet-soft` | `#F07A82`              | Hover states, muted accents            |
| `--scarlet-dim`  | `rgba(225,29,42,0.12)` | Background washes                      |
| `--navy`         | `#0F2342`              | Dark surface, confidential section bg  |
| `--navy-soft`    | `#1E3A6E`              | Lighter navy surface                   |
| `--ink`          | `#0A0A0A`              | Near-black base                        |
| `--paper`        | `#F5F3EE`              | Warm off-white foreground text         |

### Periodic table category colors (`--cat-*`)

Defined in `tokens.css`. Each maps to a GSAP-animated skill category. Add new categories here only.

### Easing scale

| Token                | Curve                               | Use                        |
| -------------------- | ----------------------------------- | -------------------------- |
| `--ease-out-expo`    | `cubic-bezier(0.16, 1, 0.3, 1)`     | Main reveal easing         |
| `--ease-in-out-circ` | `cubic-bezier(0.85, 0, 0.15, 1)`    | Transitions between states |
| `--ease-spring`      | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Elastic bounce effects     |

In GSAP use `'expo.out'` which matches the out-expo curve natively.

---

## Typography

**Display font:** DM Mono (variable weight)  
— Technical, geometric, monospaced. Used for: section headings, hero name, element symbols, labels, code-adjacent text.  
— File to add: `/public/fonts/DMMono-VariableFont_wght.woff2`

**Body font:** Inter (variable weight + optical size)  
— Clean neutral sans. Used for: body copy, descriptions, metadata.  
— File to add: `/public/fonts/Inter-VariableFont_opsz,wght.woff2`

**Status:** Font-face declarations are scaffolded in `global.css` (commented out). System-ui fallback renders until woff2 files are placed. See BACKLOG item `feat: self-hosted fonts`.

**Rationale:** Both are open-licensed (SIL OFL), variable-weight for a single HTTP request, and convey the technical precision of the identity. See DECISIONS.md.

---

## GSAP Scene Pattern

### The Scene interface (`src/scripts/scroll/types.ts`)

```typescript
interface Scene {
  init(el: Element): void; // called once; set up initial GSAP state
  enter(): void; // section enters viewport
  leave(): void; // section leaves viewport
  progress(p: number): void; // 0→1 while section is pinned/active
  destroy(): void; // cleanup (kill tweens, revert state)
}
```

### How to add a new scene

1. **Create** `src/scripts/scroll/scenes/<name>.ts`
2. **Implement** the Scene interface and export a factory:
   ```typescript
   import type { Scene } from '../types';
   const myScene = (el: Element): Scene => ({
     init(_el) {
       /* gsap.set() initial state */
     },
     enter() {
       /* gsap.to() reveal */
     },
     leave() {
       /* pause loops, etc. */
     },
     progress(p) {
       /* per-frame parallax */
     },
     destroy() {
       /* tl.kill() */
     },
   });
   export default myScene;
   ```
3. **Register** in `controller.ts` — two lines only:
   ```typescript
   // In imports section:
   import mySceneFactory from './scenes/myScene';
   // In SCENE_REGISTRY:
   'my-section-id': mySceneFactory,
   ```
4. **Add** `data-scene="my-section-id"` to the section element in the Astro component.
5. **Never** modify the controller core logic (below the registry).

### Worked example

`src/scripts/scroll/scenes/hero.ts` — the reference scene. Covers:

- `splitChars()` for manual char splitting (no SplitText dependency)
- Timeline sequencing with GSAP `timeline.to()` and stagger
- `progress(p)` for per-frame parallax (panda-head layer)
- Bob loop on scroll hint
- Full reduced-motion branch

### Global scroll progress signal

The controller emits `CustomEvent('scroll:progress', { detail: { progress } })` on every ScrollTrigger tick. Listen for it in any module that needs to react to page-level scroll position (e.g., the backdrop stage parallax scene once implemented):

```typescript
window.addEventListener('scroll:progress', (e) => {
  const { progress } = (e as CustomEvent<{ progress: number }>).detail;
  // drive backdrop layers here
});
```

---

## Smooth scroll (ScrollSmoother) — sanctioned controller exception

The page is scrolled by **GSAP ScrollSmoother**, not the native scrollbar alone. This is the **one sanctioned edit to the controller core** (Golden Rule 3 protects scene-_adding_; smooth-scroll is engine infra, kept minimal and fenced in `controller.ts` under the "Smooth scroll" comment band).

**DOM contract (`Layout.astro`):**

```
body
├─ #scroll-stage        ← fixed parallax stage, SIBLING OUTSIDE the wrapper (stays truly fixed)
└─ #smooth-wrapper      ← ScrollSmoother applies its styles here
   └─ #smooth-content   ← ScrollSmoother transforms this; all page content lives inside
      └─ main#scroll-content > <slot/>
```

`#scroll-stage` **must** stay outside `#smooth-wrapper` — otherwise the smoother's transform would drag the "fixed" backdrop with the content.

**Controller wiring:** `gsap.registerPlugin(ScrollTrigger, ScrollSmoother)`, then `initSmoothScroll()` runs **before** scenes mount, calling `ScrollSmoother.create({ wrapper, content, smooth: 1.2, effects: true, smoothTouch: 0 })`. `effects: true` enables `data-speed` / `data-lag` for later phases. The global `scroll:progress` event and every scene ScrollTrigger work unchanged — they read the smoothed scroll position automatically (no `scrollerProxy` needed; ScrollSmoother is GSAP-native).

**Reduced motion:** `initSmoothScroll()` returns early — `ScrollSmoother.create()` is skipped entirely, leaving native scroll. CSS `scroll-behavior` is `auto` (never `smooth`) so it cannot fight the smoother.

## How to add a new section

1. Create `src/components/sections/MySection.astro` with `data-scene="my-section"`.
2. Import and place it in `src/pages/index.astro` at the correct narrative position.
3. Add a scene (or reuse `revealPlaceholder`) per the Scene Pattern above.
4. Add any new asset paths to `ASSETS.md` before using them.
5. Add any new design token to `src/styles/tokens.css` before using it.
6. Add a BACKLOG item for its animation choreography if not done immediately.
