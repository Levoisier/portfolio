# ASSETS.md — Media manifest & delivery guide

Every image the game uses is listed here **and** in `art/manifest.json` (a unit test keeps the
two in sync). Cristian produces the media; agents never edit `art/raw/`.

## TL;DR

- **26 images total — 21 needed for launch, 5 optional.** Each image is **one generation**: a
  horizontal strip of animation frames, or a set of separate props. You never deliver single
  frames.
- Save each file as **`art/raw/<id>.png`** (the ids are in the table at the bottom), then commit
  it or hand it to an agent. `pnpm assets` normalizes it automatically; the game picks it up.
- **Pure green `#00FF00` background, no text, no ground shadows, character facing right.**
- Until a file exists, the game uses the interim panda cut from
  `art/reference/panda-sheet-v1.png` or a same-size placeholder. Development is never blocked on
  media.

## Which tool

| Asset type                   | Best                                                                                                                      | Also works                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Panda animations (wave A, D) | **PixelLab** ([pixellab.ai](https://www.pixellab.ai/)) — true pixel grid, character + animation tools, transparent export | Nano Banana with the prompts below + pipeline cleanup |
| Environment, stations, props | Nano Banana (prompts below)                                                                                               | PixelLab                                              |

Why: general image models (Nano Banana included) output **"fake" pixel art** — the reference
sheet has ~101 000 colors, no real pixel grid and frames of different sizes — and **no alpha
channel**. The pipeline repairs that (chroma key, grid snap, palette snap, baseline alignment),
but a tool that draws on a real grid gives cleaner animation.

**PixelLab route:** create the character from `art/reference/panda-sheet-v1.png` (side view,
64×64 canvas), then generate each animation in wave A from that same character, and export
each animation as one horizontal PNG strip with a transparent background. Transparent PNGs are
accepted as-is (no green needed).

---

## Delivery rules (every image)

1. **Background:** one flat, solid, pure green `#00FF00` over the entire image (or real
   transparency). No gradient, noise, floor, vignette, checkerboard or border.
2. **No text** of any kind — no labels, letters, numbers, watermarks, frame numbers or grid lines.
   Signs and screens are drawn **blank**; the game writes on them.
3. **No green in the artwork** (it would be keyed out).
4. **Separation:** frames/items never touch; leave wide green gaps (≥ ¼ of a frame) between them.
5. **Strips:** one horizontal row, left→right in playback order, same scale, facing **right**,
   full body visible, **feet on the same baseline in every frame** (the game moves the
   character — do not raise it for jumps). No baked ground shadow.
6. **Consistency:** always attach `art/reference/panda-sheet-v1.png` for panda images; for
   environment images attach the first approved environment image as a style reference.
7. **Format:** PNG, largest size offered, wide aspect (16:9 or 21:9) for strips. Never JPEG,
   never resized or compressed.
8. **Names:** exactly `<id>.png`. A new attempt simply replaces the old file (git keeps history).

### Palette (paste into prompts)

`#0A0A0A #16161C #24242E #3A3A48 #5A5A6A #8A8A9A #C4C4CC #070F1F #0F2342 #1E3A6E #2F5896 #4F7FC0 #8FB4E0 #4A0A10 #8C1420 #E11D2A #F07A82 #FFC2C6 #8E7E66 #C9BBA0 #E4DCCB #F5F3EE #FFFFFF #7A3E0C #D9731A #FFB23F #FFE6A0 #3B2352 #6E3F6E`

(ink ramp · navy ramp · scarlet ramp · paper ramp · white · amber ramp · dusk.) The pipeline
snaps every pixel to this list, so off-palette colors are corrected, but prompts that respect
it snap cleanly.

### Style block — paste at the top of EVERY Nano Banana prompt

```
Pixel art sprite for a 2D side-scrolling platformer game.
TRUE pixel art: hard square pixels, crisp 1-pixel dark outlines, flat cel shading with 2–3 tones per color. NO anti-aliasing, NO blur, NO gradients, NO glow haze, NO painterly texture, NO noise.
Use only these colors: #0A0A0A #16161C #24242E #3A3A48 #5A5A6A #8A8A9A #C4C4CC #070F1F #0F2342 #1E3A6E #2F5896 #4F7FC0 #8FB4E0 #4A0A10 #8C1420 #E11D2A #F07A82 #FFC2C6 #8E7E66 #C9BBA0 #E4DCCB #F5F3EE #FFFFFF #7A3E0C #D9731A #FFB23F #FFE6A0 #3B2352 #6E3F6E.
Light comes from the upper left. Side view (orthographic profile).
CRITICAL: the background is ONE flat solid pure green #00FF00 filling the whole image — no gradient, no floor, no ground shadow, no vignette, no checkerboard, no border.
CRITICAL: no text, letters, numbers, labels, watermarks, frame borders or grid lines anywhere.
CRITICAL: nothing in the artwork itself is green.
```

### Character block — add after the style block for every panda image

```
Character: use the attached reference sheet as the exact design — a chubby, cute giant panda: black round ears, black eye patches with white eye highlights, cream-white face and belly (#F5F3EE, shaded #E4DCCB), black arms and legs (#16161C / #24242E, outline #0A0A0A), small pink cheeks (#F07A82), and a scarlet red scarf (#E11D2A, shaded #8C1420) whose two tails flutter behind. Same proportions, face and colors in every frame.
Sheet layout: all frames in ONE horizontal row, left to right in playback order, evenly spaced with wide green gaps between frames, every frame the same size and scale, facing RIGHT, full body visible (never crop the ears or scarf), feet resting on the same horizontal baseline in every frame. No ground shadow. Draw it as if the finished sprite is 48 pixels tall (big chunky pixels). Wide image, 21:9.
```

### Environment block — add after the style block for world, station and prop images

```
Setting: a chemical plant at night — steel, pipes, tanks, catwalks, rivets, warning lights. Structures in navy and ink tones, lights in scarlet and amber, cream highlights. Same pixel density as the attached reference (the panda there is 48 pixels tall; one floor tile is 16 pixels). Flat side view, the object stands on an invisible ground line at the bottom.
```

---

## Wave A — the panda (needed from Phase 3; interim frames cover development)

Final geometry: 64×64 cell per frame, panda ≈ 48 px tall, feet on the cell baseline.

| id             | frames | prompt (after style + character blocks)                                                                                                                                                                                                                                                           |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| panda-idle     | 4      | IDLE loop, 4 frames: standing relaxed facing right, gentle breathing — belly rises in frames 2–3, head bobs 1 pixel, scarf tails sway, eyes closed (blink) in frame 3. Frame 4 flows back into frame 1.                                                                                           |
| panda-walk     | 6      | WALK cycle, 6 frames: 1 contact (right foot forward), 2 down (weight on the right leg), 3 passing (legs cross), 4 contact (left foot forward), 5 down, 6 passing. Arms swing opposite to the legs, body bobs up 1–2 pixels on passing frames, scarf tails trail and bounce. Loops seamlessly.     |
| panda-air      | 6      | JUMP sequence, 6 frames: 1 crouch (knees bent, anticipation), 2 takeoff (legs extending, arms swinging up), 3 rise (arms up, legs tucked, scarf trailing down), 4 apex (tucked, happy surprised face), 5 fall (arms up, legs reaching down, scarf flowing upward), 6 land (squashed, knees bent). |
| panda-interact | 4      | WORKING loop, 4 frames: standing facing right, holding a small open laptop (body #24242E, screen glowing #8FB4E0) against the belly, typing with both paws; paws alternate between frames, the screen glow flickers slightly, a small satisfied smile in frame 4.                                 |
| panda-wave     | 4      | WAVE loop, 4 frames: body turned three-quarters toward the viewer, right paw raised high and waving (paw left, center, right, center across frames 1–4), big friendly smile, scarf fluttering.                                                                                                    |
| panda-run      | 6      | _(optional)_ RUN cycle, 6 frames: leaning forward, long strides with both feet off the ground in frames 3 and 6, arms pumping, scarf streaming straight back.                                                                                                                                     |

## Wave B — the world (needed from Phase 4)

| id          | final size (art px)         | prompt (after style + environment blocks)                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| floor-plant | 256×32, tiles horizontally  | GROUND STRIP: one long horizontal strip centered in the image, drawn as if its native size is 256×32 pixels: the top 6 pixels are a steel walkway edge with rivets and a thin scarlet safety stripe; below, riveted steel plates over concrete fading to #0A0A0A at the bottom. CRITICAL: the left and right ends match exactly so the strip tiles seamlessly.                                                                                                                  |
| platforms   | 48×16, 80×16, 128×16        | THREE separate floating steel catwalk platforms side by side with wide green gaps, small / medium / large (native 48×16, 80×16 and 128×16 pixels): steel grating slabs with bolted edges and amber-and-ink hazard stripes on the front face, flat top surface.                                                                                                                                                                                                                  |
| bg-far      | 640×200, tiles horizontally | DISTANT SKYLINE panorama, native 640×200 pixels: far-away silhouettes of a chemical plant — distillation columns, a cooling tower, a flare stack with a tiny flame tip, chimneys, storage spheres, faint tiny amber and white window dots. Flat #0F2342 and #1E3A6E with #3B2352 accents, very low contrast. The bottom edge is a straight horizon line across the full width; green above the silhouettes. CRITICAL: seamless horizontally — the left and right edges connect. |
| bg-mid      | 640×240, tiles horizontally | MID-DISTANCE industrial layer, native 640×240 pixels: pipe racks, storage tanks, catwalks, ladders, a water tower, small scarlet warning lights; #1E3A6E and #2F5896 with #16161C shadows and a few #E11D2A / #FFB23F lights. Flat bottom edge, green above. CRITICAL: seamless horizontally.                                                                                                                                                                                   |

The sky itself (night → sunrise gradient, stars, moon) is drawn in code — do not deliver a sky.

## Wave C — stations (needed from Phases 5, 8, 9, 10)

| id                     | final size (art px) | prompt (after style + environment blocks)                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| station-spawn-gate     | ~200×160            | PLANT ENTRANCE: an open chain-link and steel gate between two concrete pillars, with a large BLANK dark signboard mounted above it (a clean empty #0F2342 rectangle in a steel frame with four small bulbs — completely empty, the game writes on it), two lamp posts, a wooden crate at the base.                                                          |
| station-fiora          | ~128 tall           | FINANCE KIOSK: a futuristic ATM-style terminal whose screen is shaped like a giant smartphone (screen #0F2342 with abstract glowing bars and a pie chart in #8FB4E0 and #E11D2A, no text), a coin slot, a small steel safe beside it with a scarlet dial.                                                                                                   |
| station-japaniracer    | ~128 tall           | MOTORCYCLE GARAGE BOOTH: a sporty red-and-black motorcycle raised on a hydraulic lift, a pegboard with wrenches, a shelf of spare parts (pistons, chains, a stack of tires), a corrugated steel awning, one hanging work lamp.                                                                                                                              |
| station-le-parche      | ~128 tall           | RESTAURANT FOOD STALL: a cozy street kitchen with a scarlet-and-cream striped awning, a blank chalkboard menu (no writing), a hanging warm lantern, a steaming pot on a burner, two small stools.                                                                                                                                                           |
| station-maison-cielare | ~128 tall           | SLEEPWEAR BOUTIQUE WINDOW: a small shopfront with a big window showing pajamas on hangers and a pillow, a crescent-moon-and-stars sign (shapes only, no letters) glowing #FFE6A0, soft dusk-purple interior light (#6E3F6E), a door with a little bell.                                                                                                     |
| station-orquestia      | ~136 tall           | CREATIVE AGENCY STAGE: a small stage with a blank billboard screen (empty #0F2342 rectangle in a steel frame), a conductor's music stand with a baton, two speakers, a spotlight on a stand casting a pale beam.                                                                                                                                            |
| confidential-vault     | 2 frames, ~144 tall | BUNKER VAULT ENTRANCE, 2 frames side by side of the SAME object at the SAME size and position: frame 1 a massive round steel vault door, closed, in a concrete bunker wall, with a scarlet warning light and hazard stripes; frame 2 identical but the door rolled aside, revealing a dark interior (#070F1F) lit by a thin scarlet light.                  |
| confidential-dossier   | ~56 tall            | CLASSIFIED DOSSIER on a stand: a thick folder with black redaction bars on the cover and a scarlet stamp shape (no letters), clipped to a small steel lectern.                                                                                                                                                                                              |
| skill-block            | 3 frames, 24×24     | ELEMENT BLOCK, 3 frames side by side, native 24×24 pixels each: a floating glass reagent cube with steel corners and a light grey liquid core (#C4C4CC — the game recolors it); the center of the front face is an empty flat #F5F3EE label area (leave it blank). Frame 1 idle, frame 2 bumped (squashed 2 px, bright edges), frame 3 used (dim, drained). |
| contact-post           | 2 frames, ~120 tall | SUNRISE CONTACT POST, 2 frames side by side, same object same size: a vintage red telephone booth next to a mailbox on a post. Frame 1 idle (mailbox flag down, booth light off); frame 2 active (flag up, booth light on #FFE6A0, a tiny envelope peeking out of the mailbox).                                                                             |

## Wave D — ambience & extras (needed from Phase 11)

| id              | final size (art px) | prompt                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| props-misc      | 8 items             | _(style + environment)_ EIGHT separate small props in one row with wide green gaps, left to right: 1 steel barrel with a scarlet band (~24 px tall), 2 wooden crate, 3 traffic cone (scarlet with a cream stripe), 4 valve wheel on a short pipe, 5 tall lamp post with a warm lamp (~72 px), 6 metal bench, 7 gas cylinder with an amber cap, 8 small toolbox.        |
| flask-bubbling  | 4 frames, 16×24     | _(style + environment)_ ERLENMEYER FLASK bubbling, 4 frames side by side, native 16×24 pixels: glass outline #C4C4CC, scarlet liquid #E11D2A, bubbles rising 2 px per frame, a tiny steam wisp at the mouth in frames 3–4.                                                                                                                                             |
| bg-fore         | 640×96, tiles       | _(optional, desktop only; style + environment)_ FOREGROUND silhouette layer, native 640×96 pixels, bottom-aligned: a few near-black (#070F1F, #0A0A0A) pipes, railings and valve wheels passing close to the camera, mostly empty (≥ 60 % green) so it never hides the player; seamless horizontally.                                                                  |
| flare-flame     | 4 frames, 16×32     | _(optional, desktop only; style block)_ FLARE STACK FLAME, 4 frames, native 16×32 pixels: a small flickering flame (#FFE6A0 core, #FFB23F, #D9731A, #E11D2A edges), each frame a different flame shape for a looping flicker, no smoke.                                                                                                                                |
| panda-celebrate | 4 frames            | _(optional; style + character)_ CELEBRATE loop, 4 frames: three-quarters toward the viewer, holding up a round-bottom flask with glowing scarlet liquid (#E11D2A with #F07A82 highlights) in the raised right paw, small amber sparkles (#FFB23F, #FFE6A0) popping around it, bouncing on the toes. The "special / power up" pose in the reference sheet is the model. |
| panda-sleep     | 2 frames            | _(optional; style + character)_ SLEEP loop, 2 frames: curled up asleep lying on its side, facing right, eyes closed, belly rising in frame 2. No "Z" letters (the game draws them).                                                                                                                                                                                    |

---

## Registry (source of truth for status — must match `art/manifest.json`)

Status: `needed` → `delivered` (file in `art/raw/`) → `approved` (Cristian signed off in-game).

| id                       | wave | launch   | kind       | final geometry (art px)      | status |
| ------------------------ | ---- | -------- | ---------- | ---------------------------- | ------ |
| `panda-idle`             | A    | required | strip      | 4 × 64×64                    | needed |
| `panda-walk`             | A    | required | strip      | 6 × 64×64                    | needed |
| `panda-air`              | A    | required | strip      | 6 × 64×64                    | needed |
| `panda-interact`         | A    | required | strip      | 4 × 64×64                    | needed |
| `panda-wave`             | A    | required | strip      | 4 × 64×64                    | needed |
| `panda-run`              | A    | optional | strip      | 6 × 64×64                    | needed |
| `panda-celebrate`        | D    | optional | strip      | 4 × 64×64                    | needed |
| `panda-sleep`            | D    | optional | strip      | 2 × 64×64                    | needed |
| `floor-plant`            | B    | required | tile-strip | 256×32 seamless              | needed |
| `platforms`              | B    | required | set        | 48×16 · 80×16 · 128×16       | needed |
| `bg-far`                 | B    | required | layer      | 640×200 seamless             | needed |
| `bg-mid`                 | B    | required | layer      | 640×240 seamless             | needed |
| `bg-fore`                | D    | optional | layer      | 640×96 seamless (high tier)  | needed |
| `station-spawn-gate`     | C    | required | sprite     | ≤ 224×176                    | needed |
| `station-fiora`          | C    | required | sprite     | ≤ 160×160                    | needed |
| `station-japaniracer`    | C    | required | sprite     | ≤ 176×160                    | needed |
| `station-le-parche`      | C    | required | sprite     | ≤ 160×160                    | needed |
| `station-maison-cielare` | C    | required | sprite     | ≤ 160×160                    | needed |
| `station-orquestia`      | C    | required | sprite     | ≤ 176×160                    | needed |
| `confidential-vault`     | C    | required | strip      | 2 × 160×160 (closed, open)   | needed |
| `confidential-dossier`   | C    | required | sprite     | ≤ 48×64                      | needed |
| `skill-block`            | C    | required | strip      | 3 × 24×24 (idle, bump, used) | needed |
| `contact-post`           | C    | required | strip      | 2 × 112×128 (idle, active)   | needed |
| `props-misc`             | D    | required | set        | 8 props                      | needed |
| `flask-bubbling`         | D    | required | strip      | 4 × 16×24                    | needed |
| `flare-flame`            | D    | optional | strip      | 4 × 16×32 (high tier)        | needed |

## Content media (kept from the old site)

Owned by `src/content/projects.ts`, served as-is, not processed by the pipeline:

- `public/media/projects/fiora/fiora-{overview-light,overview-dark,budget-dark,calendar-dark,balance-dark}.webp` (1080×2340) + `-thumb.webp` (480×1040).

Screenshots of the live sites (JapaniRacer, Le Parché, Maison Cielare, Orquestia) are optional
for their panels; an agent can capture them from the live URLs in Phase 5 if Cristian approves.

## Generated — never deliver, never commit

- `public/game/**` — pipeline output (gitignored).
- Favicon set, OG/social image (1200×630), loading-screen sprite — produced by scripts from the
  panda strips and a game capture (Phases 2 and 12).
