# LESSONS.md — Engineering Log

**APPEND-ONLY.** Never edit or delete existing entries.  
When you hit a gotcha, a failed approach, or a non-obvious fix — add an entry.

**Template:**

```
### [YYYY-MM-DD] <short title>
**Context:** What were you trying to do?
**Problem/Dead-end:** What went wrong or why the first approach failed?
**Fix/Decision:** What actually worked, and why?
**Don't repeat:** One-line rule to prevent recurrence.
```

---

### [2026-06-20] Scaffold: pnpm approve-builds is interactive — use pnpm-workspace.yaml instead

**Context:** Setting up the project, running `pnpm install` for the first time with Astro 5.

**Problem/Dead-end:** `pnpm approve-builds` is interactive (requires TTY) and cannot be piped non-interactively. Running it in a non-TTY CI-like environment caused `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`.

**Fix/Decision:** Added `pnpm-workspace.yaml` with `onlyBuiltDependencies: [esbuild, sharp]`. This grants build-script permission declaratively without needing the interactive command. Re-ran `CI=true pnpm install` to force the install without TTY checks.

**Don't repeat:** Always use `pnpm-workspace.yaml` `onlyBuiltDependencies` for native build approvals; never rely on the interactive `approve-builds` command in agent contexts.

---

### [2026-06-20] Scaffold: create astro CLI requires interactive TTY

**Context:** Tried to scaffold Astro using `pnpm create astro@latest . --template minimal --no-install --no-git --typescript strict`.

**Problem/Dead-end:** The CLI animation runs but requires an interactive terminal to progress past the loading state. No files were created in the non-TTY agent environment.

**Fix/Decision:** Created `package.json`, `astro.config.mjs`, `tsconfig.json`, and all source files manually. This gives full control over file contents and is reproducible.

**Don't repeat:** In agent contexts, never use interactive CLI scaffolders (`create astro`, `create next-app`, etc.). Write configs directly.

---

### [2026-06-20] DM Mono upstream does not provide a variable WOFF2

**Context:** Implementing the self-hosted variable fonts backlog item.

**Problem/Dead-end:** The documented `DMMono-VariableFont_wght.woff2` file is not present in Google Fonts' `ofl/dmmono` upstream directory; the family currently ships static TTF faces. A transient `ttf2woff2` conversion also failed to parse the signed upstream TTF, and `fonteditor-cli` does not exist on npm.

**Fix/Decision:** Kept the documented public path for the site contract, declared the face as its real `truetype` format, and recorded the mismatch in DECISIONS.md so a future true variable WOFF2 can replace it without changing component code.

**Don't repeat:** Check upstream font manifests before assuming a variable font artifact exists just because the local filename says variable.

---

### [2026-06-20] Prettier must ignore read-only agent skill manuals

**Context:** Running `pnpm verify` before committing the self-hosted fonts item.

**Problem/Dead-end:** `pnpm format:check` scanned `.agents/skills/gsap-*` markdown files and failed formatting, but those files are mounted read-only in this workspace and cannot be rewritten even after `chmod u+w`.

**Fix/Decision:** Added `.agents/` to `.prettierignore` because skill manuals are external agent resources, not project source files.

**Don't repeat:** Keep read-only tool/skill mounts out of repo-wide format checks.

---

### [2026-06-20] Reduced-motion scenes must reveal during init

**Context:** Polishing the hero entrance choreography.

**Problem/Dead-end:** The scroll controller skips ScrollTrigger setup when `prefers-reduced-motion: reduce` is active, so scene `enter()` callbacks do not run. The hero scene had split characters hidden in `init()` and only revealed them in `enter()`.

**Fix/Decision:** Set the reduced-motion visible state directly in `hero.init()`, with opacity at 1 and motion transforms at rest.

**Don't repeat:** Any scene that hides elements in `init()` must also fully reveal them in the reduced-motion branch of `init()`.

---

### [2026-06-20] Narrow optional scene config fields before mapping

**Context:** Building the global backdrop scene from a readonly layer config array.

**Problem/Dead-end:** TypeScript rejected `config.drift` because only one member of the readonly config union defines that optional field.

**Fix/Decision:** Narrowed with `'drift' in config` before creating the runtime layer object.

**Don't repeat:** With `noUncheckedIndexedAccess` and strict unions, narrow optional config fields before reading them from `as const` arrays.

---

### [2026-06-20] Reduced-motion decorative elements may need explicit hiding

**Context:** Building the Confidential section scan-line and redaction shimmer treatment.

**Problem/Dead-end:** The first reduced-motion branch revealed all animation hooks, which left the scan line and shimmer sheen visible even though their motion loops were stopped.

**Fix/Decision:** Revealed only the card content and corner accents, and explicitly hid scan-line and shimmer elements in the reduced-motion branch.

**Don't repeat:** Reduced-motion fallbacks should reveal meaningful content but hide motion-only decorative layers.

---

### [2026-06-20] Inline Node scripts: avoid template literals in shell strings

**Context:** Generating responsive WebP derivatives for the hero Panda image with `node -e` and `sharp`.

**Problem/Dead-end:** Backticks inside the inline script were interpreted by the shell before Node ran, producing a bogus `/panda-hero-.webp` path and a missing output file error.

**Fix/Decision:** Re-ran the generation with plain string concatenation for output paths.

**Don't repeat:** In `node -e` commands wrapped by the shell, avoid JavaScript template literals or quote them so the shell cannot treat backticks as command substitution.

---

### [2026-06-20] LCP images should not be hidden or animated by scene startup

**Context:** Lighthouse performance pass for the hero section.

**Problem/Dead-end:** The global `[data-scene] { opacity: 0 }` guard and GSAP writes to the hero Panda body delayed mobile LCP even after the image was preloaded.

**Fix/Decision:** Kept the hero section paintable before controller startup, stopped touching the LCP image in the normal animation path, deferred non-critical decorative media to scene hooks, and served small WebP derivatives via `srcset`.

**Don't repeat:** Treat the LCP element as critical HTML: reserve its dimensions, preload the selected source, and avoid startup opacity/transform writes on that element.

---

### [2026-06-21] ScrollSmoother: modern versions use a relative wrapper, not a fixed one

**Context:** Phase 11 — integrating GSAP ScrollSmoother and verifying it in a headless browser.

**Problem/Dead-end:** Older ScrollSmoother docs/tutorials describe a `position: fixed; overflow: hidden` `#smooth-wrapper`, so I expected to assert that. In gsap 3.15 the active smoother instead leaves the wrapper effectively `position: relative` and writes inline styles like `box-sizing: border-box; width: 100%; overflow: visible` to `#smooth-content`. Asserting the old fixed-wrapper shape would have produced a false "smoother not working" reading. Headless Chrome also does **not** default to `prefers-reduced-motion: reduce` here, but it needed `set media ... reduced-motion` (the CLI verb is `set media`, not `media`) to emulate it.

**Fix/Decision:** Verify ScrollSmoother is live by (a) the presence of its inline styles on `#smooth-content`, and (b) `scroll:progress` advancing as you scroll — not by a hardcoded wrapper `position`. Confirmed the reduced-motion branch by asserting **no** inline styles appear on wrapper/content (create() skipped) while all `[data-scene]` stay opacity 1. Also removed CSS `scroll-behavior: smooth` (set to `auto`) because it fights ScrollSmoother for control of scrolling.

**Don't repeat:** Don't gate ScrollSmoother verification on a specific wrapper `position`; check its content inline-styles + a live progress signal. CSS `scroll-behavior: smooth` must not coexist with ScrollSmoother.

---

### [2026-06-21] Two scroll drivers on one stage: split them onto independent transform channels

**Context:** Phase 12 — the hero pinned depth intro must drive the backdrop stage during the pin, while the global backdrop parallax (backdrop scene, `scroll:progress`) drives it for the rest of the page. Acceptance required "no double-driving and no positional jump at the handoff."

**Problem/Dead-end:** Both drivers want to transform the same stage layers. If hero and backdrop both write `x`/`y` to `#stage-particles`, the last writer each frame wins and the handoff jumps. Suspending the backdrop during the pin and resuming it afterward also jumps, because the backdrop computes an absolute position from page progress that won't match the hero's end-state.

**Fix/Decision:** Gave each stage layer an inner `.stage-depth` wrapper. The backdrop scene drives the OUTER `#stage-*` (parallax `x`/`y` + atmosphere opacity); the hero pin drives the INNER `.stage-depth` (depth scale/translate). Two independent transform contexts compose multiplicatively, so neither overwrites the other and there is nothing to hand off — the depth channel stops advancing when the pin releases while the parallax channel keeps going, seamlessly. Every depth tween uses `fromTo()` so scrub progress 0 = identity = the static hero, and `panda-body` (LCP) is never touched. Also: `loadHeroHead` must use `overwrite: 'auto'` (not `true`) — `true` would kill the pinned depth tween that shares the `#panda-head` target.

**Don't repeat:** When two scroll systems must animate the same element, give each its own transform channel (nested element) instead of time-slicing one channel between them. And never `overwrite: true` a target that another (scrubbed) tween also animates.

---

### [2026-06-21] ScrollSmoother data-speed gives the reduced-motion fallback for free

**Context:** Phase 13 — wiring the lab-asset continuity thread (molecules/flasks) as decorative parallax across the page.

**Problem/Dead-end:** I expected to need a scene + per-frame math + an explicit `prefers-reduced-motion` branch to stop the drift, like the backdrop scene does.

**Fix/Decision:** Used ScrollSmoother `data-speed` attributes (enabled by `effects: true` from Phase 11) on plain `<img>` decor instead. Because Phase 11 skips `ScrollSmoother.create()` entirely under reduced motion, the `data-speed` attributes are simply never activated — the decor sits static at its CSS position with no extra code. So this phase needed **no JS scene at all**: just markup + Tailwind. Placements are `position: absolute` (no CLS), `hidden md:block` + `loading="lazy"` (not fetched on mobile, protects the LCP budget), inside `overflow-hidden` sections placed before a `relative` content wrapper so content paints on top (the existing `projects-accent` / `blueprint-grid` pattern).

**Don't repeat:** For decorative scroll drift, reach for `data-speed`/`data-lag` before writing a scene — it's less code and its reduced-motion fallback is automatic. Only write per-frame scene math when an element must be driven by something other than its own scroll position (e.g. the fixed backdrop stage).

---

### [2026-06-21] Coexisting scrub + hover on the same tiles: split by property AND element

**Context:** Phase 14 — the skills tiles assemble on a scrubbed reveal, but must keep the v1 hover (active scale 1.08, neighbour dim to 70%, badge, bar).

**Problem/Dead-end:** Both behaviours want to animate the tiles. The hover used `overwrite: true`, which kills _all_ other tweens of the target — so the first hover would detach the scrubbed assemble tween from its ScrollTrigger (it then never reverses on scroll-back). Putting both on the same property (tile opacity) also fights.

**Fix/Decision:** Gave each behaviour its own channel. Assemble drives the **tile** transform (y/scale/rotate) + the **card** opacity (fade-in). Hover drives the **card** scale + the **tile** opacity (dim) + badge + bar. No element/property pair is touched by both. Then switched the hover tweens from `overwrite: true` to `overwrite: 'auto'` so they only override the exact conflicting property and leave the scrub tween intact. The assemble's scrub range ends (`top 35%`) well before the section settles for interaction, so the two effectively never run at the same instant anyway.

**Don't repeat:** When two animation systems share elements, separate them by element _and_ property and prefer `overwrite: 'auto'`. `overwrite: true` is a footgun next to scrubbed/ScrollTrigger-bound tweens.

---

### [2026-06-21] Horizontal pinned gallery: gate the flex layout behind a JS class

**Context:** Phase 15 — the Projects section becomes a desktop horizontal pinned gallery (pin + scrub the card track sideways), but must stay a reachable vertical stack on tablet/mobile and under reduced motion.

**Problem/Dead-end:** If the horizontal layout (`flex-nowrap` with cards wider than the viewport) lives in the markup/CSS, then under reduced motion / no-JS — where the pin+scrub never runs — the off-screen cards are clipped by the section's `overflow-hidden` and become permanently unreachable.

**Fix/Decision:** Kept the default layout the vertical grid stack (`grid md:grid-cols-2 lg:grid-cols-3`). The horizontal track is opt-in via an `.is-horizontal` class the projects scene adds **only** inside its `(min-width: 1024px)` `matchMedia` branch (and removes on cleanup). So reduced-motion/no-JS always get the safe stack. For the pin: animate the track's `x` to `-(scrollWidth - clientWidth)` via a **function** with `invalidateOnRefresh: true` and a function-based `end`, so the travel distance recomputes on resize and the last card is never clipped.

**Don't repeat:** Any layout that only works because JS is driving it (horizontal scroll, pinned tracks) must be applied by that JS, not baked into static CSS — otherwise the no-JS/reduced-motion path traps content.

### [2026-06-21] Hero story beat: animate a sibling, not the LCP panda

**Context:** Phase 18 needed to remove the hero panda-to-wave crossfade but keep a subtle flask "reaction begins" beat during the pinned scrub.

**Problem/Dead-end:** Reusing the old scrub target would still write opacity or transform to `#panda-body`, which is the LCP element and must paint exactly like the static hero at scroll 0.

**Fix/Decision:** Removed the hero `panda-wave` overlay entirely and added a separate `#hero-reaction-glow` layer positioned over the flask. The scrub intensifies only that overlay plus the existing backdrop depth layers; `#panda-body` is not targeted by GSAP at all.

**Don't repeat:** Hero character reactions can orbit the LCP image, but they must not animate the LCP image itself.

### [2026-06-21] Projects rewrite: keep scrub and hover on separate properties

**Context:** Phase 19 replaced the horizontal project cards with a pinned editorial experiment log and kept the panda-coding accent reactive.

**Problem/Dead-end:** The first scene draft let the pinned timeline and the generic section `progress()` hook both write `y` to the panda accent. That repeats the two-scroll-drivers problem from the backdrop work at a smaller scale.

**Fix/Decision:** Let the pinned timeline own the accent's scroll `y` motion, and let hover/focus reactions touch only `x` and `rotation`. The generic `progress()` hook intentionally does no work for this scene.

**Don't repeat:** Even for decorative accents, one element/property pair should have one driver; use separate properties for hover reactions.
