# GAME_DESIGN.md — "Night Shift at Planta Z"

The portfolio **is** a small 2D pixel-art side-scroller. There is no classic page view. The
visitor plays the panda through one continuous level — a chemical plant at night that turns
into sunrise at the end — and every stop along the way is a piece of Cristian's work.

This file is the product spec. ARCHITECTURE.md says how it is built; BACKLOG.md says in what
order; ASSETS.md says what art exists.

---

## Pillars

1. **Content in 10 seconds.** A recruiter must reach a project within 10 seconds of the page
   becoming interactive, with zero learning: scrolling walks, clicking a station walks there,
   the menu fast-travels, and a **Contact** button is always on screen. Playing is optional;
   the content never is.
2. **It is a real game, not a gimmick.** Tight movement (coyote time, jump buffer, variable jump),
   crisp pixels, responsive audio-visual feedback. If it doesn't feel good to move, nothing
   else matters.
3. **One cohesive world.** One palette (`src/design/palette.json`), one pixel scale, one light
   direction (upper-left), one character. The night→dawn sky carries the story.
4. **Desktop is a diorama, mobile is a handheld.** Desktop gets depth and ambience (more
   parallax layers, particles, glow). Mobile gets a Game Boy-style handheld layout with big
   touch controls and a leaner scene — not a shrunken desktop.
5. **Readable text lives in the DOM.** Canvas draws art. Descriptions, links and anything a
   screen reader or search engine needs are real HTML in panels.

## Audience & constraints

- **Recruiters / hiring managers** — often mobile, from LinkedIn, ~30 s of attention.
- **Founders / clients** — want proof of shipping + a way to contact.
- **Engineers** — judge craft: smoothness, no bugs, sensible loading.
- Languages: **ES + EN** — ES by default (as on the old site), toggle persisted; no browser
  detection.
- Confidential work: industry, role, stack, abstracted impact, duration, team size **only**.

## The level (left → right)

World ≈ 4 620 art px wide (~7 screens at 640 px). Walk ≈ 51 s end to end, run ≈ 31 s.
Zone widths are starting values; the layout lives in data (`src/game/world/layout.ts`).

| #   | Zone                          | x (art px) | Sky           | What happens                                                                                                                                                                                                                                                       |
| --- | ----------------------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | **Gate** (spawn)              | 0–480      | deep night    | Plant gate + big sign with the name and roles (text drawn by the game on the sign anchor; the tagline lives on the loading screen and in the intro panel). Panda wakes on a crate (the `props-misc` crate in front of the gate) and waves. Controls hint fades in. |
| 1   | **Fiora** station             | 480–800    | night         | Finance kiosk with a giant phone screen. Panel: description, stack, platform note, **screenshot gallery**.                                                                                                                                                         |
| 2   | **JapaniRacer** station       | 800–1120   | night         | Motorcycle garage booth. Panel + live link.                                                                                                                                                                                                                        |
| 3   | **Le Parché** station         | 1120–1440  | night         | Restaurant food stall with lantern + pot (steam drawn in code). Panel + live link.                                                                                                                                                                                 |
| 4   | **Maison Cielare** station    | 1440–1760  | night         | Sleepwear boutique window, moon & stars. Panel + live link.                                                                                                                                                                                                        |
| 5   | **Orquestia** station         | 1760–2080  | night         | Agency studio stage with blank billboard. Panel + live link.                                                                                                                                                                                                       |
| 6   | **Transcolombia** station     | 2080–2400  | night         | Transport dispatch yard: delivery truck, dispatch booth with a radio/GPS mast, route board. Panel + live link (360° tracking, offline-first driver app).                                                                                                           |
| 7   | **Classified wing**           | 2400–3200  | darkest night | Fence panels + beacons (`props-zones`). The vault door rolls aside on interact. Four redacted dossiers on stands, one per confidential project → dossier panel.                                                                                                    |
| 8   | **Reagent lab** (stack)       | 3200–4000  | pre-dawn      | Fume hood + lab shelves (`props-zones`). Eight floating **element blocks** (one per skill category) over low platforms. Bump from below (or interact) → the category's skills burst out as element tiles and fly into a periodic board (drawn in code).            |
| 9   | **Sunrise lookout** (contact) | 4000–4620  | sunrise       | Mailbox + phone booth. Panel: call to action + email / LinkedIn / GitHub / WhatsApp. Panda waves (celebrates if everything was visited). "Thanks for visiting" + fast-travel back.                                                                                 |

The sky gradient, star density and ambient light are a function of the player's x — night at the
gate, sunrise at the lookout. It is drawn in code from palette colors, so it costs no media.

**Canonical ids** (use these everywhere: layout, `data-panel`, deep links `/#<id>`, menu, visited
keys):

- Menu / zone stops: `gate`, `fiora`, `japaniracer`, `le-parche`, `maison-cielare`, `orquestia`,
  `transcolombia`, `classified`, `lab`, `contact`.
- Panels: the 6 project ids, the 4 `confidentialProjects` ids (dossiers), `stack` (Reagent lab),
  `contact`, and `intro` (opened by the HUD name badge: name, roles, tagline, summary and contact
  links from `profile.ts`; built in Phase 7).
- Skill blocks use the `SKILL_CATEGORIES` ids.
- Stop → panel: `gate` → `intro`; each project id → the same id; `classified` → no panel of its
  own — the menu lists the 4 dossiers as indented sub-entries, each travelling to its stand and
  opening that dossier; `lab` → `stack`; `contact` → `contact`. Deep links accept stop and panel
  ids alike (`/#lab` = `/#stack`, `/#gate` = `/#intro`, `/#classified` travels to the vault).
- "Everything visited" (finale) = the 6 project panels, at least one dossier, and `stack`.

## Stations (the core loop)

`approach → prompt → open panel → read / click → close → keep walking`

- Each station has a trigger zone. Entering it shows a small pixel key glyph above the prop
  (canvas, no words) and the localized prompt bottom-centre in the HUD (DOM, `aria-live`, e.g.
  `E — Fiora` / `B — Fiora` / `Toca — Fiora`). Interact with `E` / `Enter`, **B** on the pad, or
  click/tap the prop.
- Opening a station opens its **DOM panel** over the game; the game pauses input and the
  panda plays `panda-interact`. `Esc`, the close button, or **B** closes it and returns focus.
- A station is marked **visited** (persisted in `localStorage`); the menu shows ✓ marks.
- **Deep links:** `/#<station-id>` (e.g. `/#fiora`) spawns the panda at that station and
  opens its panel — shareable links to a specific project.

## Controls

| Action     | Keyboard      | Mouse / trackpad                  | Handheld pad (touch)                |
| ---------- | ------------- | --------------------------------- | ----------------------------------- |
| Walk       | ← → / A D     | **scroll wheel walks right/left** | D-pad ◀ ▶ (hold)                    |
| Run        | hold Shift    | —                                 | double-tap-hold ◀/▶                 |
| Jump       | Space / W / ↑ | —                                 | **A**                               |
| Interact   | E / Enter     | click a station prop → auto-walk  | **B**, or tap the station on screen |
| Menu / map | M / Esc       | menu button                       | **START**                           |

**Precedence:** Esc (and **B** on the pad) closes the topmost open panel or the menu. Only when
nothing is open do Esc/M/START open the menu and B/E/Enter interact. While a panel or the menu is
open, game input is paused and keys keep their normal DOM meaning.

Gamepad support is a nice-to-have (Phase 12), not required.

## HUD (DOM, always visible)

- Top-left: tiny name badge with the `panda-portrait` head (opens the intro panel).
- Top-right: **Contact** (opens the contact panel from anywhere), language `ES · EN`, sound on/off,
  menu.
- Bottom-centre: the interact prompt (DOM text, `aria-live="polite"`) when near a station.
- First visit: a controls hint that disappears after the first move (desktop: keys + "or just
  scroll"; mobile: points at the pad).

## Menu / map (the recruiter fast path)

A pixel-framed overlay listing every stop in order — Gate, 6 projects, Classified wing, Reagent
lab, Contact — with visited marks. Selecting one makes the panda **run** there (auto-walk) or,
if far, fade-teleport. From the menu, every panel is two keystrokes away. It is also the
keyboard/screen-reader path through all content.

## Skills mechanic (Reagent lab)

- 8 element blocks, one per category (Languages, Frontend, Backend, Data/Auth, DevOps, AI,
  Enterprise, Testing). The block's window (`skill-block` anchor `window`) is filled with the
  category color (`SKILL_CATEGORY_COLOR`) and shows the category symbol from
  `skillCategorySymbols` in pixel text; a used block's window turns `ink-600`.
- Bump from below (jump into it) or interact → block squashes (`bump`), becomes `used`, and the
  category's element tiles (symbol + number, drawn in code) arc out and slot into a periodic
  board on the lab wall.
- Board complete → a small celebration + the **Stack panel** (full accessible list: symbol,
  name, category, proficiency) opens automatically once; it is also reachable any time from
  the menu.

## Classified wing

- Fence panels and beacons (`props-zones`), a `CLASIFICADO / CLASSIFIED` sign (plate and text
  drawn by code), sweeping scanner light (desktop tier).
- The vault door (`confidential-vault` → `door`) sits over the doorway of the wall (`wall`);
  interact → it rolls aside (integer-pixel tween; instant under reduced motion), camera nudge,
  the wing's ambient light shifts to scarlet.
- Four dossiers; each opens a panel: industry, role, stack, impact, duration, team size.
  Redaction bars animate away on open (CSS). Nothing else — see the Golden Rule.

## Ambience tiers

| Element                          | High tier (desktop)                   | Low tier (mobile)            |
| -------------------------------- | ------------------------------------- | ---------------------------- |
| Parallax                         | sky + `bg-far` + `bg-mid` + `bg-fore` | sky + `bg-far` + `bg-mid`    |
| Particles (steam, embers, stars) | full                                  | ≤ 30 % count                 |
| Glow / bloom filters             | on (lamps, screens, flare)            | off (dithered halo textures) |
| Animated props                   | all                                   | only near the player         |
| Scanner light, flare flame       | on                                    | off                          |

`prefers-reduced-motion: reduce` on any tier: no camera shake, no flashes, parallax differential
reduced, particles minimal, fast-travel uses fades instead of pans. Player movement is
user-driven and stays.

## Audio (optional, off by default)

Procedural 8-bit SFX (jump, bump, open, close, vault) and an optional ambient loop, all behind
the HUD sound toggle, which defaults to **off** and remembers the choice. Never autoplay.

## Tone & copy

Short, confident, bilingual. The game adds only UI strings (prompts, menu labels, hints) in
`src/i18n/ui.ts`; all portfolio content comes from `src/content/`. No lorem ipsum, no jokes at
the expense of clarity.

## Out of scope

Combat, enemies, health, death, inventories, dialogue trees, save slots, multiple levels,
top-down movement. The concept sheet's attack/hurt/die rows are intentionally unused.
