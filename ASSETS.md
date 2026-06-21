# ASSETS.md — Media Manifest

All visual media files the project expects. Paths are canonical — never rename or move a file after placing it here.

**Golden Rule:** Before referencing an asset in code, add a row here first.  
**Swap protocol:** Replace any asset at the EXACT same path with the same filename. Zero code changes required.

Cristian generates final assets with **Nano Banana**.

---

## Panda

| Path                            | Dimensions | Purpose / Scene                       | Transparent | Status |
| ------------------------------- | ---------- | ------------------------------------- | ----------- | ------ |
| `/media/panda/panda-master.png` | 1600×1600  | Style reference (not shipped to prod) | N           | final  |
| `/media/panda/panda-hero.png`   | 1600×2000  | Hero centerpiece (body layer)         | Y           | final  |
| `/media/panda/panda-head.png`   | 1200×1200  | Hero focal parallax layer (head)      | Y           | final  |
| `/media/panda/panda-coding.png` | 1600×2000  | Projects section accent               | Y           | final  |
| `/media/panda/panda-wave.png`   | 1600×2000  | Contact section accent                | Y           | final  |

## Backdrop

| Path                              | Dimensions | Purpose / Scene                            | Transparent | Status |
| --------------------------------- | ---------- | ------------------------------------------ | ----------- | ------ |
| `/media/backdrop/atmosphere.webp` | 2560×1440  | Hero back layer — full-page parallax stage | N           | final  |
| `/media/backdrop/mid-glass.webp`  | 2560×1440  | Mid parallax layer (glassware silhouettes) | Y           | final  |
| `/media/backdrop/particles.webp`  | 2560×1440  | Foreground particle drift layer            | Y           | final  |

## Lab Decor

| Path                               | Dimensions | Purpose / Scene              | Transparent | Status |
| ---------------------------------- | ---------- | ---------------------------- | ----------- | ------ |
| `/media/lab/flask-erlenmeyer.webp` | 1200×1200  | Scattered decorative element | Y           | final  |
| `/media/lab/flask-round.webp`      | 1200×1200  | Scattered decorative element | Y           | final  |
| `/media/lab/beaker-reaction.webp`  | 1200×1200  | Scattered decorative element | Y           | final  |
| `/media/lab/molecule-a.webp`       | 1200×1200  | Scattered decorative element | Y           | final  |
| `/media/lab/molecule-b.webp`       | 1200×1200  | Scattered decorative element | Y           | final  |

## Textures

| Path                                  | Dimensions | Purpose / Scene                              | Transparent | Status |
| ------------------------------------- | ---------- | -------------------------------------------- | ----------- | ------ |
| `/media/texture/blueprint-paper.webp` | 2560×1440  | Section background texture (confidential)    | N           | final  |
| `/media/texture/lightleak.webp`       | 2560×1440  | Scarlet light-leak overlay (contact section) | Y           | final  |

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
| `/fonts/DMMono-VariableFont_wght.woff2`     | Display / headings — variable weight       | needed |
| `/fonts/Inter-VariableFont_opsz,wght.woff2` | Body copy — variable weight + optical size | needed |
