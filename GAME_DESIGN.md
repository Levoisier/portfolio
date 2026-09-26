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
- Languages: **ES + EN** (auto from browser, toggle persisted).
- Confidential work: industry, role, stack, abstracted impact, duration, team size **only**.

## The level (left → right)

World ≈ 4 300 art px wide (~7 screens at 640 px). Walk ≈ 45 s end to end, run ≈ 28 s.
Zone widths are starting values; the layout lives in data (`src/game/world/layout.ts`).

| #   | Zone                          | x (art px) | Sky           | What happens                                                                                                                                                                                   |
| --- | ----------------------------- | ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | **Gate** (spawn)              | 0–480      | deep night    | Plant gate + big sign with the name and roles (text drawn by the game). Panda wakes on a crate, stretches, waves. Controls hint fades in.                                                      |
| 1   | **Fiora** station             | 480–800    | night         | Finance kiosk with a giant phone screen. Panel: description, stack, platform note, **screenshot gallery**.                                                                                     |
| 2   | **JapaniRacer** station       | 800–1120   | night         | Motorcycle garage booth. Panel + live link.                                                                                                                                                    |
| 3   | **Le Parché** station         | 1120–1440  | night         | Restaurant food stall with lantern + steaming pot. Panel + live link.                                                                                                                          |
| 4   | **Maison Cielare** station    | 1440–1760  | night         | Sleepwear boutique window, moon & stars. Panel + live link.                                                                                                                                    |
| 5   | **Orquestia** station         | 1760–2080  | night         | Agency studio stage with blank billboard. Panel + live link.                                                                                                                                   |
| 6   | **Classified wing**           | 2080–2880  | darkest night | Fence + warning lights. Vault door opens on interact. Four redacted dossiers on stands, one per confidential project → dossier panel.                                                          |
| 7   | **Reagent lab** (stack)       | 2880–3680  | pre-dawn      | Eight floating **element blocks** (one per skill category) over low platforms. Bump from below (or interact) → the category's skills burst out as element tiles and fly into a periodic board. |
| 8   | **Sunrise lookout** (contact) | 3680–4300  | sunrise       | Mailbox + phone booth. Panel: call to action + email / LinkedIn / GitHub / WhatsApp. Panda waves (celebrates if everything was visited). "Thanks for visiting" + fast-travel back.             |

The sky gradient, star density and ambient light are a function of the player's x — night at the
gate, sunrise at the lookout. It is drawn in code from palette colors, so it costs no media.

## Stations (the core loop)

`approach → prompt → open panel → read / click → close → keep walking`

- Each station has a trigger zone. Entering it shows a prompt above the prop
  (`E` / `Enter` on desktop, **B** on the handheld pad, or click/tap the prop).
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

Gamepad support is a nice-to-have (Phase 12), not required.

## HUD (DOM, always visible)

- Top-left: tiny name badge (opens the intro panel).
- Top-right: **Contact** (opens the contact panel from anywhere), language `ES · EN`, sound on/off,
  menu.
- Bottom-centre: the interact prompt when near a station.
- First visit: a controls hint that disappears after the first move (desktop: keys + "or just
  scroll"; mobile: points at the pad).

## Menu / map (the recruiter fast path)

A pixel-framed overlay listing every stop in order — Gate, 5 projects, Classified wing, Reagent
lab, Contact — with visited marks. Selecting one makes the panda **run** there (auto-walk) or,
if far, fade-teleport. From the menu, every panel is two keystrokes away. It is also the
keyboard/screen-reader path through all content.

## Skills mechanic (Reagent lab)

- 8 element blocks, one per category (Languages, Frontend, Backend, Data/Auth, DevOps, AI,
  Enterprise, Testing), each tinted with its category palette color, symbol drawn by code.
- Bump from below (jump into it) or interact → block squashes (`bump`), becomes `used`, and the
  category's element tiles (symbol + number, drawn in code) arc out and slot into a periodic
  board on the lab wall.
- Board complete → a small celebration + the **Stack panel** (full accessible list: symbol,
  name, category, proficiency) opens automatically once; it is also reachable any time from
  the menu.

## Classified wing

- Fence, `CLASIFICADO / CLASSIFIED` sign (text drawn by code), sweeping scanner light
  (desktop tier).
- Vault door `closed` → interact → `open`, camera nudge, the wing's ambient light shifts to
  scarlet.
- Four dossiers; each opens a panel: industry, role, stack, impact, duration, team size.
  Redaction bars animate away on open (CSS). Nothing else — see the Golden Rule.

## Ambience tiers

| Element                          | High tier (desktop)                   | Low tier (mobile)                 |
| -------------------------------- | ------------------------------------- | --------------------------------- |
| Parallax                         | sky + `bg-far` + `bg-mid` + `bg-fore` | sky + `bg-far` + `bg-mid`         |
| Particles (steam, embers, stars) | full                                  | ≤ 30 % count                      |
| Glow / bloom filters             | on (lamps, screens, flare)            | off (pre-baked glow sprites only) |
| Animated props                   | all                                   | only near the player              |
| Scanner light, flare flame       | on                                    | off                               |

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
