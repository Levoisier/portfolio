# AGENTS.md — Canonical Operating Manual

> **Every agent reads this file first, every session. No exceptions.**

---

## Project Overview

This is the personal portfolio of **Cristian Zapata Cartagena** — Full Stack Developer & Chemical Engineer. It is a single-page, long-scroll narrative site built with **Astro (static)**, **GSAP + ScrollTrigger** for animation, **Tailwind** for layout, and **CSS custom properties** as the design-token layer. The visual identity fuses dev precision with chemical engineering aesthetics: molecular motifs, blueprint grids, a signature panda mascot. The site is deployed to Vercel as a static output.

This is an **agent-first project**: autonomous agents (Codex, Claude Code, etc.) execute the build by working through `BACKLOG.md`. Cristian generates media assets externally (Nano Banana). Your job is to implement backlog items correctly, safely, and without breaking what came before.

---

## Golden Rules

Breaking any of these is a blocking error. Revert and fix before committing.

1. **Never break the build.** Run `pnpm verify` before every commit. It must exit 0.
2. **Never hardcode a color value outside `src/styles/tokens.css`.** All colors go through CSS custom properties (`var(--token-name)`). Adding a new color = add a token first.
3. **Never modify the controller core.** `src/scripts/scroll/controller.ts` is the engine. Add new animations by creating a scene in `src/scripts/scroll/scenes/` and registering it in the controller's `SCENE_REGISTRY` (one dictionary entry). See ARCHITECTURE.md for the exact pattern.
4. **Every animation must have a reduced-motion fallback.** Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. If true: instant reveal (opacity only, no translation/rotation/scale). No exceptions.
5. **The Confidential Projects section must never contain screenshots, repository links, live-demo links, client names, or employer names.** Allowed: industry, role, stack, abstracted impact metrics, duration, team size.
6. **Never rename or relocate asset paths.** Paths are documented in `ASSETS.md` and referenced in component markup. A path change breaks the swap contract. To add a new asset: add a row to ASSETS.md first.
7. **Append to LESSONS.md whenever you hit a gotcha, a dead-end approach, or a non-obvious fix.** This log is how agents learn from each other across sessions. See the entry template in LESSONS.md.

---

## Verify Command

```bash
pnpm verify
```

This runs: `astro build` → `astro check` → `eslint` → `prettier --check`.  
Source: `scripts/verify.sh`. Run it; read the output; fix errors before committing.

---

## Definition of Done

A BACKLOG item is **done** when:

- [ ] `pnpm verify` passes clean (zero errors, zero lint warnings).
- [ ] The feature works correctly in `pnpm dev` (start server, manually verify the behaviour described in acceptance criteria).
- [ ] Reduced-motion behaviour is correct (test with DevTools → Rendering → Emulate CSS media feature: prefers-reduced-motion: reduce).
- [ ] No hardcoded colors introduced.
- [ ] If a scene was added: registered in controller registry, implements all 5 Scene interface methods.
- [ ] If an asset was used: path matches ASSETS.md exactly.
- [ ] LESSONS.md updated if anything non-obvious was encountered.
- [ ] The BACKLOG checkbox for the item is checked `[x]`.

---

## Commit Convention

```
<type>(<scope>): <imperative summary>

[optional body — only if the why isn't obvious from the diff]
```

Types: `feat` · `fix` · `style` · `refactor` · `docs` · `chore` · `perf`  
Scope examples: `hero` · `skills` · `controller` · `tokens` · `a11y` · `perf`

Examples:

```
feat(hero): add char-stagger entrance animation with reduced-motion fallback
fix(tokens): correct --scarlet-soft tint calculation
docs(backlog): check off skills-interactive item
```

---

## Document Map — What to Read for What

| I need to know about…                               | Read                                              |
| --------------------------------------------------- | ------------------------------------------------- |
| Project overview, rules, verify gate                | **AGENTS.md** (this file)                         |
| Stack, folder structure, how to add a scene/section | **ARCHITECTURE.md**                               |
| What to build next, acceptance criteria             | **BACKLOG.md**                                    |
| Design tokens, color names, easing scale            | `src/styles/tokens.css` + ARCHITECTURE.md §tokens |
| Asset paths and dimensions                          | **ASSETS.md**                                     |
| Why a decision was made (Astro, GSAP, fonts, etc.)  | **DECISIONS.md**                                  |
| Past failures and non-obvious fixes                 | **LESSONS.md**                                    |
| How to run/build/deploy for a human reader          | **README.md**                                     |
