# ASSETS.md — Media Manifest

All visual media files the project expects. Paths are canonical — never rename or move a file after placing it here.

**Golden Rule:** Before referencing an asset in code, add a row here first.  
**Swap protocol:** Replace any asset at the EXACT same path with the same filename. Zero code changes required.

Cristian generates final assets with **Nano Banana**.

---

## Panda

| Path                            | Dimensions | Purpose / Scene                                   | Transparent | Status |
| ------------------------------- | ---------- | ------------------------------------------------- | ----------- | ------ |
| `/media/panda/panda-master.png` | 1254×1254  | Companion seated pose                             | Y           | final  |
| `/media/panda/panda-hero.png`   | 1600×2000  | Hero centerpiece + Stack companion pose           | Y           | final  |
| `/media/panda/panda-head.png`   | 1200×1200  | Companion Confidential classified guard head pose | Y           | final  |
| `/media/panda/panda-coding.png` | 1600×2000  | Companion builder pose                            | Y           | final  |
| `/media/panda/panda-wave.png`   | 1600×2000  | Contact accent + companion goodbye pose           | Y           | final  |

> **Companion reuse.** All five poses are shared between the desktop companion
> (`#panda-companion`, ≥1024px) and the **mobile companion** (`#panda-companion-mobile`,
> <1024px, `companionMobile.ts`): hero/wave greeting → coding (Projects) →
> head silhouette (Confidential) → master (Skills) → wave (Contact). Same paths,
> lazy-loaded; no new media.

### Pose expansion — "Classified Investigation" sequence (v5)

5-frame timelapse (approach → inspect → read → stamp → shush). Each frame doubles as a Confidential-section pose (retiring `panda-head`) and as a looping hero GIF/sprite frame. Generation prompts live in `BACKLOG.md` (`# v5`). Keep identical character scale/lighting/anchor across all five so they sequence cleanly.

| Path                             | Dimensions | Purpose / Scene                            | Transparent | Status  |
| -------------------------------- | ---------- | ------------------------------------------ | ----------- | ------- |
| `/media/panda/panda-peek.png`    | 1600×2000  | Frame 1 — approach (stealth peek)          | Y           | pending |
| `/media/panda/panda-magnify.png` | 1600×2000  | Frame 2 — inspect (magnifying glass)       | Y           | pending |
| `/media/panda/panda-files.png`   | 1600×2000  | Frame 3 — read dossier (Confidential pose) | Y           | pending |
| `/media/panda/panda-stamp.png`   | 1600×2000  | Frame 4 — stamp CLASSIFIED                 | Y           | pending |
| `/media/panda/panda-shush.png`   | 1600×2000  | Frame 5 — shush (loop-back / resting)      | Y           | pending |

### Generated Panda Derivatives

These files are derived from canonical Panda sources for responsive delivery. Regenerate them after replacing the matching source asset.

| Path                                         | Dimensions | Source                        | Purpose / Scene         | Transparent | Status    |
| -------------------------------------------- | ---------- | ----------------------------- | ----------------------- | ----------- | --------- |
| `/media/panda/generated/panda-hero-320.webp` | 320×400    | `/media/panda/panda-hero.png` | Hero LCP mobile source  | Y           | generated |
| `/media/panda/generated/panda-hero-480.webp` | 480×600    | `/media/panda/panda-hero.png` | Hero LCP tablet source  | Y           | generated |
| `/media/panda/generated/panda-hero-800.webp` | 800×1000   | `/media/panda/panda-hero.png` | Hero LCP desktop source | Y           | generated |

> **Project media note.** The v3 Featured Projects section is a card-less
> experiment log and does not reference project screenshots. It uses
> `/media/panda/panda-coding.png` only as a desktop builder accent.

## Backdrop

| Path                              | Dimensions | Purpose / Scene                            | Transparent | Status |
| --------------------------------- | ---------- | ------------------------------------------ | ----------- | ------ |
| `/media/backdrop/atmosphere.webp` | 2560×1440  | Hero back layer — full-page parallax stage | N           | final  |
| `/media/backdrop/mid-glass.webp`  | 2560×1440  | Mid parallax layer (glassware silhouettes) | Y           | final  |
| `/media/backdrop/particles.webp`  | 2560×1440  | Foreground particle drift layer            | Y           | final  |

## Lab Decor

| Path                               | Dimensions | Purpose / Scene                                    | Transparent | Status |
| ---------------------------------- | ---------- | -------------------------------------------------- | ----------- | ------ |
| `/media/lab/flask-erlenmeyer.webp` | 1200×1200  | Lab decor (not currently placed — reserved for v3) | Y           | final  |
| `/media/lab/flask-round.webp`      | 1200×1200  | Lab decor (not currently placed — reserved)        | Y           | final  |
| `/media/lab/beaker-reaction.webp`  | 1200×1200  | Lab decor (not currently placed — reserved for v3) | Y           | final  |
| `/media/lab/molecule-a.webp`       | 1200×1200  | Lab decor (not currently placed — reserved)        | Y           | final  |
| `/media/lab/molecule-b.webp`       | 1200×1200  | Lab decor (not currently placed — reserved)        | Y           | final  |

The lab assets are kept on disk but **not placed in the page** right now — the
Phase 13/14 placements and later molecule/glassware accents were removed after
review.

## Textures

| Path                                  | Dimensions | Purpose / Scene                      | Transparent | Status |
| ------------------------------------- | ---------- | ------------------------------------ | ----------- | ------ |
| `/media/texture/blueprint-paper.webp` | 2560×1440  | Section background texture (contact) | N           | final  |
| `/media/texture/lightleak.webp`       | 2560×1440  | Scarlet light-leak overlay (unused)  | Y           | final  |

---

## Code-drawn assets (not in this manifest)

The following visual elements are rendered entirely in CSS/SVG and do not need image files:

- **Blueprint grid** — `.blueprint-grid` utility class in `global.css`
- **Reaction arrows** — inline SVG in components
- **Film grain** — CSS `noise` filter or SVG feTurbulence (when added)
- **Periodic table tiles** — CSS boxes in `Skills.astro`

---

## Fonts (self-hosted, not in `/media/`)

| Path                                        | Purpose                                    | Status |
| ------------------------------------------- | ------------------------------------------ | ------ |
| `/fonts/DMMono-VariableFont_wght.woff2`     | Display / headings — static fallback       | placed |
| `/fonts/Inter-VariableFont_opsz,wght.woff2` | Body copy — variable weight + optical size | placed |
