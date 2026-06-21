# Cristian Zapata Cartagena — Portfolio

Personal portfolio site. Single-page long-scroll narrative fusing Full Stack Developer identity with Chemical Engineering aesthetics: molecular motifs, blueprint grids, a panda mascot.

**Stack:** Astro · GSAP ScrollTrigger · Tailwind · TypeScript strict · Vercel static

---

## Running Locally

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

## Build

```bash
pnpm build      # outputs to dist/
pnpm preview    # preview the static build locally
```

## Verify (run before every commit)

```bash
pnpm verify     # build + typecheck + lint + format check
```

## Deploy

Vercel static deploy — push to `main`, Vercel picks up `vercel.json` automatically.  
No adapter needed: `output: 'static'` in `astro.config.mjs`.

---

## Documentation Index

| Doc                                  | Purpose                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| [AGENTS.md](./AGENTS.md)             | Canonical agent operating manual — Golden Rules, verify gate, DoD, commit convention |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack decisions, folder map, GSAP Scene pattern, token system, how to extend         |
| [BACKLOG.md](./BACKLOG.md)           | Ordered build backlog for the loop agent                                             |
| [ASSETS.md](./ASSETS.md)             | Media manifest — every expected file path, dimensions, and status                    |
| [DECISIONS.md](./DECISIONS.md)       | Architecture Decision Records (ADR-lite)                                             |
| [LESSONS.md](./LESSONS.md)           | Append-only engineering log of gotchas and fixes                                     |

---

## Project Structure

```
src/
  styles/
    tokens.css          # single source of truth for all design tokens
    global.css          # Tailwind base + font-face + scroll stage
  layouts/
    Layout.astro        # HTML shell + fixed scroll stage + controller script
  pages/
    index.astro         # Single page — imports all 5 sections in order
  components/sections/
    Hero.astro
    Skills.astro
    Projects.astro
    ConfidentialProjects.astro
    Contact.astro
  scripts/scroll/
    types.ts            # Scene interface + factory type
    controller.ts       # GSAP engine — do not modify core; extend via registry
    scenes/
      hero.ts           # Reference scene — fully working
      revealPlaceholder.ts  # Generic reveal fallback for all other sections

public/
  fonts/                # Self-hosted variable fonts (populate per BACKLOG)
  media/                # All visual assets (see ASSETS.md for exact paths)

scripts/
  verify.sh             # CI gate script
```
