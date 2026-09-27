# Cristian Cartagena — Portfolio (the game)

A 2D pixel-art side-scroller: play the panda along a mossy path through moonlit mountains and discover
each project on the way to a sunrise contact lookout. Full Stack Developer & Chemical Engineer.

**Stack:** Astro · Phaser 4 · TypeScript strict · Vitest · Playwright · Vercel static

> Status: **rebuild in progress.** Phase 0 (foundation) is done; the game is built phase by
> phase from [BACKLOG.md](./BACKLOG.md).

---

## Run

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm test         # unit tests
pnpm verify       # the gate: format, lint, typecheck, unit tests, build
pnpm test:e2e     # browser tests (local machines: pnpm exec playwright install chromium, once)
```

## Media workflow (Cristian)

1. Pick the next wave in [ASSETS.md](./ASSETS.md) and generate each image with the prompt given
   there — PixelLab for the panda animations (reference `art/reference/panda-right-64.png`), Nano
   Banana for the rest (attach the references listed in ASSETS.md, the canvas image last).
2. Save it as `art/raw/<id>.png` — the exact id from the ASSETS.md registry table.
3. Commit it together with its ASSETS.md registry status set to `delivered` (or hand it to an
   agent to do both). `pnpm assets` normalizes it on the next dev/build run and the game uses it
   automatically; placeholders fill anything not delivered yet.
4. Check it in the game and mark it `approved` in ASSETS.md.

## Working with agents

Point an agent at the repo (on `next`) and say: _"Implement the next phase in BACKLOG.md, then
commit it and open a PR into `next`."_ AGENTS.md tells it how to read the docs, what the gate is
and what "done" means. One phase per PR; P1 and P2 can run in parallel, as can P6/P7 and P8–P10.

## Branching & deploy

`main` deploys to production on Vercel and keeps serving the old site until launch.

**Required before Phase 1:** `next` is the integration branch and should be the repository's
default branch, so new agent sessions start on the rebuild instead of the old site.

1. `next` exists (pushed from this foundation). Set it as the default branch in GitHub → Settings
   → General, and keep Vercel's Production Branch on `main`.
2. Every phase branches from `next` and opens its PR into `next`; Vercel builds a preview for each.
3. At launch (Phase 12), merge `next` into `main`.

## Documentation

| Doc                                  | Purpose                                                 |
| ------------------------------------ | ------------------------------------------------------- |
| [AGENTS.md](./AGENTS.md)             | Agent rules, verify gate, Definition of Done, commits   |
| [GAME_DESIGN.md](./GAME_DESIGN.md)   | The game: world, stations, controls, tiers, tone        |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Runtime, rendering contract, pipeline, testing, budgets |
| [BACKLOG.md](./BACKLOG.md)           | The phased roadmap with acceptance criteria             |
| [ASSETS.md](./ASSETS.md)             | Every media file: spec, prompt, status                  |
| [DECISIONS.md](./DECISIONS.md)       | Architecture Decision Records                           |
| [LESSONS.md](./LESSONS.md)           | Append-only log of gotchas and fixes                    |
