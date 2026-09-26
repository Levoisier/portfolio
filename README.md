# Cristian Zapata Cartagena — Portfolio (the game)

A 2D pixel-art side-scroller: play the panda through a chemical plant at night and discover
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
   there (PixelLab recommended for the panda animations, Nano Banana fine for the rest).
2. Save it as `art/raw/<id>.png` — the exact id from the ASSETS.md registry table.
3. Commit it (or hand it to an agent). `pnpm assets` normalizes it on the next dev/build run and
   the game uses it automatically; placeholders fill anything not delivered yet.
4. Check it in the game and mark it `approved` in ASSETS.md.

## Working with agents

Point an agent at the repo and say: _"Implement the next phase in BACKLOG.md."_ AGENTS.md tells
it how to read the docs, what the gate is and what "done" means. One phase per PR.

## Branching & deploy

`main` deploys to production on Vercel. **The live site should not switch to the game until
Phase 12.** Recommended setup:

1. Create an integration branch `next` from this foundation.
2. Every phase branches from `next` and opens its PR into `next` (Vercel builds preview URLs for
   each PR and for `next`).
3. At launch (Phase 12), merge `next` into `main`.

If you prefer to keep everything on `main`, the production site will show the in-progress build
from the moment this foundation is merged.

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
