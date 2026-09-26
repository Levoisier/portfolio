# AGENTS.md — portfolio

## Scope and read order

Canonical instructions for coding agents working in **portfolio**. Read this file before editing.
It applies to this project and its subdirectories; read a nested project’s `AGENTS.md` when working in that scope.
Follow the current user request, the shared working agreement, and the project-specific requirements below.

Read order for any task: **AGENTS.md → GAME_DESIGN.md → ARCHITECTURE.md → the BACKLOG.md phase
you are working on → the ASSETS.md rows it names → related LESSONS.md entries.**

## Working agreement

- Communicate in clear, concise English unless the user requests another language. Preserve the product's required language and locale.
- Be direct and respectful. Explain meaningful decisions without filler; give brief progress updates during longer work.
- Finish with what changed, why, the checks actually run and their results, and any remaining limitation. Never claim unrun checks passed.
- Proceed autonomously within the requested scope. Ask when missing information or an authorization boundary blocks progress; do not ask again for actions already authorized.
- Read relevant guidance and inspect current source before editing. Verify paths, contracts, and assumptions; do not invent APIs, roles, or behavior.
- Keep changes focused and consistent with existing patterns. Preserve unrelated work and avoid incidental refactors or broad formatting.
- Write code comments and documentation in English; explain non-obvious reasons rather than narrating the code.
- Use the repository's declared package manager, toolchain, and lockfile. Generate derived files through their owning tools.

## Project and product rules

### Project Overview

The personal portfolio of **Cristian Zapata Cartagena** — Full Stack Developer & Chemical
Engineer — is a **2D pixel-art side-scrolling game**. The visitor plays a panda with a red scarf
through one level, a chemical plant at night that turns into sunrise: five project stations, a
classified wing for NDA work, a reagent lab for the tech stack, and a contact lookout. There is
no classic page view by design.

Stack: **Astro 5 (static shell + DOM panels) · Phaser 4 (game) · TypeScript strict · Vitest ·
Playwright · sharp (asset pipeline) · pnpm · Vercel.**

This is an **agent-first project**: agents build it phase by phase from `BACKLOG.md`. Cristian
produces the media (PixelLab / Nano Banana) exactly as specified in `ASSETS.md`. Your job is to
implement a phase correctly, verifiably, and without breaking earlier phases.

## Commands and verification

Use focused checks while iterating and run the project-specific gates below at their required stages.
For guidance changes, also check links, instruction consistency, and `git diff --check`.
Report failures and unavailable checks explicitly; a documentation check does not prove application behavior.

```bash
pnpm install          # first, in a fresh checkout
pnpm dev              # http://localhost:4321
pnpm test             # Vitest unit tests (watch: pnpm test:watch)
pnpm verify           # THE GATE: prettier --check → eslint → astro check → vitest → astro build
pnpm test:e2e         # Playwright against a production preview (desktop + mobile projects)
pnpm assets           # asset pipeline (exists from BACKLOG Phase 1)
```

`scripts/verify.sh` is the gate; it must exit 0 before every commit. Playwright in the cloud
container uses the preinstalled Chromium; on a local machine run
`pnpm exec playwright install chromium` once.

### Definition of Done (every BACKLOG phase)

- [ ] `pnpm verify` passes (zero errors, zero lint warnings).
- [ ] `pnpm test:e2e` passes, including the new specs the phase requires.
- [ ] Every acceptance criterion checked in `pnpm preview` at desktop **1440×900** and mobile
      **390×844** (touch); screenshots reviewed (not just taken).
- [ ] Both quality tiers and `prefers-reduced-motion: reduce` behave per ARCHITECTURE.md.
- [ ] No color literals outside `src/design/palette.json` / `src/styles/tokens.css` (a test enforces it).
- [ ] Assets referenced only by manifest id; ASSETS.md and `art/manifest.json` agree (a test enforces it).
- [ ] All copy comes from `src/content/` or `src/i18n/ui.ts`, in ES and EN.
- [ ] ARCHITECTURE.md / DECISIONS.md / LESSONS.md updated where relevant; the BACKLOG box is checked `[x]`.

## Architecture and conventions

### Golden Rules

Breaking any of these is a blocking error. Revert and fix before committing.

1. **Never break the build.** `pnpm verify` exits 0 before every commit.
2. **Content has one home.** Profile, projects, confidential work and skills live only in
   `src/content/` (typed, bilingual, tested); UI strings live in `src/i18n/ui.ts`. Never hardcode
   copy in game code or components. Every string exists in **ES and EN**.
3. **Confidential work never shows screenshots, repository links, live-demo links, client names,
   or employer names.** Allowed: industry, role, stack, abstracted impact, duration, team size.
4. **Colors come only from the palette.** `src/design/palette.json` (canvas, pipeline) and its
   mirror `src/styles/tokens.css` (`var(--c-*)`). Use `hex()`/`num()`/`cssVar()` from
   `src/design/palette.ts`. A new color = a palette entry first (and an ADR if it changes the look).
5. **Assets go through the registry.** Every media file has an entry in `art/manifest.json` and
   a row in ASSETS.md. Game code references assets by id only. `art/raw/` is Cristian's — never
   edit, rename or delete his files. `public/game/` is generated — never hand-edit or commit it.
6. **Pixel-perfect or nothing.** Integer zoom in device pixels, nearest-neighbor, integer
   positions (`roundPixels`), no CSS smoothing, no non-integer scaling of art (ARCHITECTURE.md →
   _Rendering contract_).
7. **Game and UI meet only at the bus.** Phaser code never builds or queries DOM; UI code never
   touches Phaser objects. They communicate through the typed events in `src/shared/bus.ts`.
8. **Ambience goes through the tier.** Only `src/game/quality.ts` decides device/tier; no ad-hoc
   `innerWidth`/user-agent checks. Mobile stays within the budgets in ARCHITECTURE.md.
9. **Everyone can reach everything.** Every station and panel is reachable by keyboard, touch,
   mouse and the menu; panels are real DOM dialogs with focus management;
   `prefers-reduced-motion` is honored (no shake, no flashes, reduced parallax/particles).
10. **Pure logic stays pure and tested.** Movement, input merging, zoom math, layout validation,
    travel planning and the pipeline steps live in modules that do not import Phaser, with
    Vitest tests.
11. **No new dependency without an ADR** in DECISIONS.md (bundle budget).
12. **Not installable.** No web app manifest, service worker, standalone-mode meta or install
    prompt — the portfolio is deliberately not a PWA (tests enforce it). Favicons are fine.
13. **Append to LESSONS.md** whenever you hit a gotcha, a dead end, or a non-obvious fix.

## Git and delivery

- Commit, push, or open a pull request only when the user requests that action. Complete the work and its required checks first.
- Use English Conventional Commits: `type(scope): imperative summary` (scope optional), with a concise subject, ideally at most 72 characters. Add a body only when the reason or trade-off needs explanation.
- Keep one logical change per commit. Include required backlog or issue IDs, and keep generated outputs with the source changes that require them.
- Use the repository owner's existing Git identity. Create unsigned commits with `git -c commit.gpgsign=false commit ...`; never enable signing or add signature flags.
- Do not add AI attribution: no `Co-Authored-By` or AI `Signed-off-by` trailers, generated-by footers, model names, or session links in commits, PRs, or code comments.
- When choosing a branch, use `type/short-kebab-summary`; describe the work rather than the agent or tool. Preserve a branch assigned by the active environment.
- Follow the repository's PR template. Explain the change, its reason, and verification; link the relevant work item.
- Never force-push, rewrite history, or discard unrelated changes without explicit authorization.

### Commit Convention

```
<type>(<scope>): <imperative summary>

[optional body — only if the why isn't obvious from the diff]
```

Types: `feat` · `fix` · `style` · `refactor` · `docs` · `chore` · `perf` · `test`
Scopes: `assets` · `shell` · `player` · `input` · `world` · `stations` · `mobile` · `ui` ·
`confidential` · `skills` · `story` · `fx` · `audio` · `content` · `palette` · `a11y` · `perf`

Examples:

```
feat(player): add coyote time and jump buffer to the panda controller
fix(assets): keep scarf tails attached to their frame when slicing
docs(backlog): check off phase 3
```

## References and lessons

Keep durable agent instructions in this file and detailed product or architecture documentation in the linked sources.
Record verified, non-obvious lessons in the project's existing lessons log; keep temporary task progress out of it.

### Document Map — What to Read for What

| I need to know about…                                  | Read                                |
| ------------------------------------------------------ | ----------------------------------- |
| Rules, verify gate, Definition of Done                 | **AGENTS.md** (this file)           |
| What the game is: world, stations, controls, tiers     | **GAME_DESIGN.md**                  |
| How it is built: runtime, rendering, pipeline, testing | **ARCHITECTURE.md**                 |
| What to build next and its acceptance criteria         | **BACKLOG.md**                      |
| Every media file: specs, prompts, status               | **ASSETS.md** + `art/manifest.json` |
| Colors                                                 | `src/design/palette.json`           |
| Portfolio content (projects, stack, contact)           | `src/content/`                      |
| Why a decision was made                                | **DECISIONS.md**                    |
| Past failures and non-obvious fixes                    | **LESSONS.md**                      |
| Running, branching and deploying (humans)              | **README.md**                       |

### Project documents

- [README.md](README.md)
- [GAME_DESIGN.md](GAME_DESIGN.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [BACKLOG.md](BACKLOG.md)
- [ASSETS.md](ASSETS.md)
- [DECISIONS.md](DECISIONS.md)
- [LESSONS.md](LESSONS.md)
