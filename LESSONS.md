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

### [2026-06-21] Fixed scenes need an inner animation target

**Context:** Phase 20 added a fixed panda companion as a `[data-scene]` element outside the ScrollSmoother wrapper.

**Problem/Dead-end:** The scroll controller calls `scene.init(el)` and then immediately sets the `[data-scene]` element opacity to 1 to clear the global FOUC guard. If the companion scene also uses that same outer element for its own fade state, the controller can reveal it before the companion's section logic runs.

**Fix/Decision:** Kept the outer `#panda-companion` as the fixed scene shell and added an inner `[data-companion-stage]` for all scene-owned opacity, transform, cursor tracking, and pose cross-fades.

**Don't repeat:** For any persistent fixed scene, let the controller own the outer scene shell and animate an inner child.

### [2026-06-21] v3 audit: browser-only metrics need the human dev server

**Context:** Phase 24 required a reduced-motion, layout, accessibility, and performance audit after the v3 narrative pass.

**Problem/Dead-end:** This session explicitly prohibited `agent-browser` and starting dev/preview servers, so real Lighthouse scores, CLS, and horizontal-scroll measurements could not be collected from a rendered page.

**Fix/Decision:** Completed static audits instead: removed the remaining raw blueprint-grid color into `--blueprint-grid-line`, verified old project-gallery hooks were gone, confirmed reduced-motion branches guard the v3 scenes, updated architecture docs, and ran `pnpm verify`. Lighthouse numbers remain a manual follow-up in the human's running dev environment.

**Don't repeat:** When browser tools are disallowed, record the audit boundary clearly and do not invent Lighthouse or CLS numbers.

---

### [2026-06-21] Companion "behind content" must stay above opaque sections

**Context:** Phase 28 reworked the companion to a per-section zig-zag route. The spec said the fixed companion stays "behind content".

**Problem/Dead-end:** Taking "behind content" literally (moving `#panda-companion` below `--z-content` in the stacking order) hides it entirely inside the two sections with **opaque** backgrounds — Confidential (`background-color: var(--navy)`) and Contact (`var(--paper)`). The route's "Confidential → right" and "Contact → center wave" beats would be invisible.

**Fix/Decision:** Kept the companion at `--z-overlay` (above content) and satisfied "behind content" in spirit: it is `pointer-events:none` + `aria-hidden` (never intercepts) and routed through the **side margins** (x ≈ 0.15 / 0.85) so it never covers copy. Drove the route with **per-section `ScrollTrigger.create()`** (scene-local, not the controller core) instead of `documentProgress()`, so pose/position track the _visible_ section even while a section is pinned. Position eases via `gsap.quickTo`; the pose cross-fade is a gentle scale/slide turn.

**Don't repeat:** "Behind content" for a decorative overlay means non-interactive + out of the reading path, not necessarily a lower z-index — check for opaque section backgrounds before lowering the stacking order.

---

### [2026-06-21] v4 audit: Lighthouse/CLS/LCP remain a human follow-up

**Context:** Phase 30 required a full reduced-motion / a11y / performance audit (incl. Lighthouse desktop ≥90, mobile ≥80, A11y ≥95) after the v4 liquid-glass + companion-journey pass.

**Problem/Dead-end:** Same boundary as the Phase 24 audit — this session prohibits `agent-browser` and starting a dev/preview server, so real Lighthouse scores, CLS, and mobile LCP cannot be measured from a rendered page.

**Fix/Decision:** Completed the static audits instead: confirmed no raw colors outside `tokens.css` (grep), verified each v4 reduced-motion branch (glass sheen disabled by the global `animation-duration: 0.01ms` rule; hero static split; projects instant via the reduced-motion init branch; companion single static pose with no route/triggers/cursor), kept `backdrop-filter` gated behind `@supports` + desktop with a lean solid-tint mobile fallback (no new mobile blur cost), and left the LCP panda untouched. **The Lighthouse/CLS/LCP numbers are a human follow-up** — run them in your `pnpm dev` / `pnpm preview` and record them here.

**Don't repeat:** When browser tools are disallowed, finish the static sweep and explicitly hand the rendered-page metrics back to the human; never fabricate them.

---

### [2026-06-26] Mobile lost the pandas to breakpoint gating, not reduced-motion

**Context:** Bringing the desktop experience to mobile. The brief assumed mobile was flat because of "reduced movement rules."

**Problem/Dead-end:** Easy to conflate two separate gates. `prefers-reduced-motion` (a per-user OS setting) is one thing; the real reason mobile read as a flat SPA was **breakpoint gating** — `#panda-companion` is `display:none` below 1024px, the hero pin/Skills scatter/glass loupe/`backdrop-filter` are all `min-width` desktop-only. Mobile users without the OS setting still get section reveals + backdrop parallax; they just lose everything fenced behind `min-width`.

**Fix/Decision:** Added a first-class mobile layer via the normal engine seams — a new `companion-mobile` scene + one `SCENE_REGISTRY` line, scoped with `gsap.matchMedia('(max-width: 1023px)')`, plus a `#panda-companion-mobile` shell (inverse visibility of the desktop one). Reused the existing five panda poses; no new media, no controller-core edits.

**Don't repeat:** Distinguish reduced-motion gating from breakpoint gating before "fixing mobile" — they live in different places and want different solutions.

### [2026-06-26] iOS device-tilt needs a user gesture; wire it to a tap

**Context:** Replacing the desktop cursor look-toward with a touch-native device-tilt gaze on the mobile companion.

**Problem/Dead-end:** On iOS 13+ `deviceorientation` emits nothing until `DeviceOrientationEvent.requestPermission()` is called, and that call only resolves `granted` from inside a user gesture. Attaching the listener eagerly (or calling requestPermission on load) silently fails. Android and most browsers have no such gate.

**Fix/Decision:** `touch-tilt.ts` exposes `requestTilt()` and only attaches the `deviceorientation` listener after permission resolves; the mobile companion calls it from the **first tap on the panda** (the same tap that triggers the wave reaction), with a one-time "tap me · tilt to play" hint. Unsupported / denied → silently no tilt (graceful degrade, no idle listener). Tilt emits a `tilt:change` CustomEvent mirroring the `scroll:progress` contract so consumers stay decoupled. Fully off under reduced motion.

**Don't repeat:** Any motion/orientation sensor on iOS must be requested from a real user gesture; don't attach sensor listeners at load.

### [2026-06-26] Browser verification WAS available this session

**Context:** Prior v3/v4 audits (see entries above) hand-waved Lighthouse/CLS/LCP because browser tools were disallowed.

**Fix/Decision:** This remote environment ships Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` with Playwright globally installed (`/opt/node22/lib/node_modules`). Verified the mobile companion end-to-end against `pnpm preview`: per-section poses (hero→wave, projects→coding, confidential→head silhouette, skills→master, contact→wave), reduced-motion single static `master` pose, zero console errors, zero horizontal overflow at 390px, and the desktop companion correctly `display:none` on mobile / mobile companion `display:none` on desktop. (ESM import needs the absolute path + `const { chromium } = pkg` default-import shape.) Real Lighthouse LCP timing on a throttled device is still worth a human pass.

**Don't repeat:** Check for a usable Chromium/Playwright before deferring rendered-page checks to a human.

### [2026-07-21] scroll-snap mandatory silently kills a JS auto-scroll carousel

**Context:** Mobile auto-scrolling carousels for Projects + Confidential — a rAF loop nudging `track.scrollLeft` a fraction of a pixel per frame, yielding to the reader on first gesture.

**Problem/Dead-end:** The track had `scroll-snap-type: x mandatory` (for nice manual swipe snapping). With mandatory snap the browser re-snaps to the nearest snap point after every programmatic `scrollLeft` write, so sub-card increments get yanked straight back to 0 — the carousel looks completely dead (measured `scrollLeft` delta = 0 over seconds) even though the rAF loop is running fine. Easy to misread as "the loop never started."

**Fix/Decision:** `autoCarousel.ts` sets `track.style.scrollSnapType = 'none'` while the auto-drift runs, and restores it (clears the inline style → falls back to the CSS `x mandatory`) the instant the reader takes over in `stop()`. Best of both: smooth ambient drift + snappy manual swiping after takeover. Also: detect user intent via `pointerdown`/`wheel`/`touchstart`/`keydown` (never `scroll`, since programmatic writes fire it). Reduced motion → util no-ops, snap stays intact for manual use.

**Also:** headless Chromium defaults to `prefers-reduced-motion: reduce`; pass `reducedMotion: 'no-preference'` to the Playwright context or motion-gated code paths look broken in verification.

**Don't repeat:** Never drive `scrollLeft`/`scrollTop` by small steps on a `scroll-snap-type: *-mandatory` element — toggle snap off while animating, or the snap engine erases your motion.

### [2026-07-21] Removed all prefers-reduced-motion handling (owner call)

**Context:** The site is lightweight; the owner asked to drop reduced-motion gating everywhere so the experience is identical for everyone.

**Fix/Decision:** Stripped every `prefers-reduced-motion` branch across the repo — the `@media (prefers-reduced-motion: reduce)` blocks (global.css, LangSwitch, ScreenshotLightbox, Projects), the `const prefersReducedMotion = matchMedia(...)` guards + their static-fallback branches in every scene (hero, backdrop, companion, companionMobile, skills, projects, confidential, contact, revealPlaceholder), the controller's smooth-scroll/scene skip, and the `initAutoCarousel`/`initGlassLoupe` early-returns. Animations, ScrollSmoother, the marquee, and both auto-carousels now run unconditionally. Verified in a headless context (which itself defaults to `reduce`) that everything still animates.

**Don't repeat:** There is intentionally no reduced-motion path anymore — do not re-add `prefers-reduced-motion` guards to "be safe"; that was removed on purpose. (Note the earlier scroll-snap lesson's reduced-motion asides are now historical only.)

### [2026-07-23] Backdrop stage jank: uniform overscan + parallel decodes, and px drift vs % cover

**Context:** Startup felt laggy; the 3-layer fixed parallax stage was the main cost. Also added the hero presentation veil (`#hero-veil`) that fades on scroll.

**Problem/Dead-end:** Every `.stage-layer` used one uniform 120%×155% box with `will-change: transform, opacity` on BOTH the outer layer and the inner `.stage-depth` — six viewport-plus composited layers (~11 viewports of GPU memory) alive from first paint. On top of that, all three 2560px webp sources downloaded and decoded in parallel right when the controller mounted, competing with the LCP panda, and `render()` allocated a `gsap.set` per layer on every scroll tick.

**Fix/Decision:** Sized each layer's overscan to ITS max travel (rate × viewport + hero-pin scale), kept `will-change` only on the outer layer (GSAP promotes the inner during the pin anyway), generated 1280/1920 webp variants picked by effective viewport width (DPR capped at 2), chained the loads sequentially with `image.decoding='async'` + `await image.decode()` + `fetchpriority=low`, and switched per-tick writes to cached `gsap.quickSetter`s with an epsilon skip. One trap: the mid-glass layer drifts +32px in **px**, so its left cover must be fixed px (`left:-48px`) — a `-4%` cover is thinner than the drift on narrow phones and exposes the edge.

**Don't repeat:** Don't give parallax layers a shared worst-case overscan or blanket `will-change`; budget each layer to its own travel. And when a transform travel is in px, the safety cover must be px too, not %.

### [2026-07-23] GSAP yPercent doubles a CSS translate baseline

**Context:** Skills tiles fill with "liquid" up to the proficiency level on hover. The fill's height is the level (inline style); the scene slides it in via `yPercent: 102 → 0`. A CSS `transform: translateY(102%)` was left on `.skill-liquid` for the pre-JS resting state.

**Problem/Dead-end:** On hover the liquid never rose. `gsap.set(el, {yPercent:102})` with an existing CSS `translateY(102%)` reads the computed matrix (≈75px) into the tween's **px** channel AND adds `yPercent:102` on top → measured translateY ≈ 150px (double). Animating `yPercent → 0` only zeroes the percent channel; the ≈75px CSS-seeded px baseline stays, so the fill sits one card-height low and looks stuck.

**Fix/Decision:** Dropped the CSS transform (the whole Skills section is `opacity:0` until the controller mounts, so the resting fill is never visible pre-JS anyway) and pinned `y: 0` alongside `yPercent: 102` in the scene's init so both channels are explicit. Verified in-browser: liquid rests below the card (y≈75px) and rises to y=0 on hover with a gentle rotation slosh.

**Don't repeat:** Don't seed a CSS `translate`/`translateY` on an element you'll drive with GSAP `x/yPercent` — GSAP treats the computed px as a separate additive channel. Set the resting offset in GSAP (`gsap.set`), or zero the px channel (`y:0`) explicitly.

### [2026-07-23] Astro scopes `<style>` — you can't target another component's class

**Context:** Projects.astro needed the `.liquid-glass` card (rendered by GlassSurface.astro) to fill the stretched mobile carousel item and to carry a desktop `min-height`, so the cards read as uniform.

**Problem/Dead-end:** Rules written as `[data-project-entry] > .liquid-glass { … }` silently did nothing to the glass. Astro scopes every component `<style>` by appending that component's `data-astro-cid-*` to each selector. `.liquid-glass` lives in GlassSurface (a different cid), so the scoped selector `.liquid-glass[data-astro-cid-projects]` never matched. The desktop min-height stayed unapplied (cards measured 259px, not the 320px asked for); mobile only looked right by accident because the uniform height came from `align-items: stretch` + the `[data-project-desc]` clamp (both Projects-owned elements), not from the glass rule.

**Fix/Decision:** Wrap the foreign-component part in `:global()` — `[data-project-entry] > :global(.liquid-glass)`. The `[data-project-entry]` half stays scoped (keeps the rule local to Projects), and `:global(.liquid-glass)` matches the GlassSurface element. After that the desktop min-height applied (320px) and the mobile glass filled the stretched card (575/575).

**Don't repeat:** A selector in an Astro `<style>` only reaches elements that component renders. To style a child component's root/class, use `:global()` on that part (keep an owned ancestor scoped so it doesn't leak), or pass a class the child spreads onto its root.

### [2026-07-23] Mobile URL-bar resize rescaled the fixed backdrop ("images reload on scroll-stop")

**Context:** The fixed parallax stage layers visibly changed size whenever mobile scrolling stopped.

**Problem/Dead-end:** Two coupled causes. (1) `#scroll-stage` was `position: fixed; inset: 0`, so its height tracked the _dynamic_ viewport; when the address bar hides/shows on scroll the box resized and the `background-size: cover` layers re-scaled. (2) the backdrop scene's `resize` handler recomputed the parallax reference `viewportHeight = innerHeight` on every resize — and the URL-bar toggle fires `resize` with a new height but the same width — so the translate multiplier jumped too.

**Fix/Decision:** (1) Pin the stage to the large viewport with `height: 100lvh` (`100vh` fallback) and drop `inset: 0`'s bottom anchor, so it stays constant across the URL-bar toggle. (2) Gate the resize handler on **width**: `if (innerWidth === lastWidth) return;` — only a real reflow (orientation / desktop resize) updates the reference. Verified the atmosphere transform is now stable to <0.01px across a height-only viewport change (the residual is just scroll-progress recalc, not the layer rescale).

**Don't repeat:** For fixed full-bleed backdrops on mobile, size them with `lvh` (or `dvh` only if you _want_ to follow the bar) and never key parallax math to a live `innerHeight` that jitters with the address bar — gate on width.

### [2026-07-29] `content-visibility: auto` silently corrupts ScrollTrigger geometry

**Context:** Perf pass. Off-screen sections were doing paint/composite work for content nobody could see, and `content-visibility: auto` is the textbook fix.

**Problem/Dead-end:** It quietly breaks the whole scroll model. With `#skills,#projects,#confidential,#contact { content-visibility: auto; contain-intrinsic-size: auto 1200px }`, every not-yet-rendered section reports the **placeholder** size instead of its real one — measured `confidential` 1903px → 1488, `skills` 745 → 1488, `contact` 712 → 1488, and total `scrollHeight` 8535 → 9639px. ScrollTrigger computes every trigger position against that wrong geometry at `refresh()` time, and `contain-intrinsic-size: auto` doesn't save you: on first load there is no remembered size to use. It was also _slower_ in the scroll benchmark (avg frame 46.8ms → 50.4ms), because sections kept entering/leaving the render tree while scrolling past them.

**Fix/Decision:** Rejected it. To skip off-screen work on a ScrollTrigger page, gate the _expensive effects_ rather than the _rendering_: an IntersectionObserver that toggles a class (`src/scripts/offscreen.ts` → `.is-offscreen`), with CSS dropping `backdrop-filter` and setting `animation-play-state: paused`. That touches no layout, so measurements stay exact. Polarity matters — effects must be **on by default and switched off**, never the reverse, or the hero's glass renders unblurred on first paint and pops when the observer first fires.

**Don't repeat:** Never put `content-visibility: auto` on an element whose height feeds a scroll-driven animation. Verify any containment change by diffing `document.documentElement.scrollHeight` before/after — if it moves, the trigger positions moved with it.

### [2026-07-29] `unicode-range` doesn't shrink a font — and a too-narrow range hides real glyphs

**Context:** Inter shipped at 344 KB for a site that renders ~90 distinct characters.

**Problem/Dead-end:** Both `@font-face` rules already declared `unicode-range: U+0000-00FF`, which reads like the font was trimmed to Latin-1. It wasn't: `unicode-range` only tells the browser **whether to download** the file for a given character — the file itself is untouched. Worse, the declared range was _narrower than the copy_: the em dash (U+2014) is used throughout, sits outside U+0000-00FF, and was therefore being rendered from a system fallback font, mid-sentence, in a different typeface. `format('truetype')` on a `.woff2` was a third latent bug (Chrome sniffs past it; not everything does).

**Fix/Decision:** Actually subset the files with `scripts/subset-fonts.mjs` (fontTools) to Google's `latin` range, **in place** so the paths in ASSETS.md stay valid — 393 KB → 107 KB. Widened both `unicode-range` descriptors to match the subset exactly, and fixed the format hint. Verified with fontTools that Inter's `opsz`/`wght` axes survive subsetting (`--layout-features=*`, no instancing). Note DM Mono has **no** `fvar` despite its `VariableFont` filename — it was always static.

**Don't repeat:** `unicode-range` is a download gate, not a diet. Keep it in sync with what the file actually contains, and after subsetting a variable font always re-check `fvar` is intact.

### [2026-07-29] Rewriting the hero name on mount WAS the site's entire CLS

**Context:** Mobile CLS measured 0.0756 — a single shift, always at ~1.5s.

**Problem/Dead-end:** `hero.ts`'s `splitChars()` cleared `#hero-name` and re-appended one `<span>` per character with `<br>` at the spaces. That happens when the deferred controller mounts, so the name reflowed from its natural wrap to three forced lines a second and a half after paint, moving the whole hero copy block. Every bit of the site's CLS came from the animation's own setup code.

**Fix/Decision:** Emit the split spans at **build time** in `Hero.astro` (`heroNameHtml`) and reduce the scene to a read-only `readChars()` query. Pre-JS and post-JS DOM are now identical, so there is nothing to reflow — CLS 0.0756 → 0.0002. Build the string rather than JSX-mapping the characters, or Prettier's formatting puts whitespace between the spans and opens gaps inside the words.

**Don't repeat:** Any character/word splitter that runs on mount is a layout shift waiting to happen. Ship the final DOM structure statically and let JS only animate it. (The related blink — name painted at 66ms, blanked at controller mount, re-staggered — was fixed separately by moving the entrance off GSAP entirely; see the next entry.)

### [2026-07-29] A ScrollTrigger pin re-parents its trigger, which restarts CSS animations inside it

**Context:** The hero copy entrance (premise → name stagger → role → hint) lived in the hero scene's `enter()`, so it could not start until the deferred controller had downloaded and mounted — measured at ~1.6s on a throttled phone. Worse, `#hero-name` is the painted `<h1>`, so the scene had to blank it to `opacity: 0` first: the title was readable at 66ms, then visibly blinked out and re-staggered 1.5s later.

**Problem/Dead-end:** Rewriting the entrance as CSS `@keyframes` fixed the wait but broke in a new way — the animation played, finished, and then **restarted from zero** partway through the page's life. Cause: ScrollTrigger's desktop hero pin wraps `#hero` in a generated `.pin-spacer` and **moves the element into it**. Re-inserting an element into the DOM restarts every CSS animation in its subtree. Instrumenting `#hero.parentElement` made it unambiguous — the parent flipped `scroll-content` → `pin-spacer` at 1551ms and the entrance reset at exactly 1551ms. Confirmed by viewport: at 393px, where the `min-width: 768px` matchMedia never creates the pin, there was no reset at all. No CSS-only workaround exists; you cannot ask a CSS animation not to restart on re-insertion.

**Fix/Decision:** Drove the entrance with the **Web Animations API** instead (`src/scripts/heroEntrance.ts`, ~1 KB, no GSAP). A WAAPI animation is owned by the element rather than resolved from its computed style, so it survives the re-parent and keeps its current time — verified opacity stays monotonic straight through the pin swap. CSS keeps only the opening frame (`html.js` gated) to cover the gap before the module runs; every animation uses `fill: 'both'` so the final frame persists. Two details worth keeping: a transform keyframe replaces the **whole** transform, so the scroll hint's `-translate-x-1/2` had to be written into its keyframes as `translate(-50%, …)` (verified centre X = 720 on a 1440 viewport); and the hint's infinite bob is parked off-screen through its `Animation` handle, not `animation-play-state`.

**Don't repeat:** Don't put a CSS animation on anything inside a pinned ScrollTrigger subtree — it will replay when the pin is created. Use WAAPI (or GSAP) there. And don't couple a first-impression animation to the deferred controller: if it must play on arrival, it cannot wait on 51 KB gzip of GSAP.
