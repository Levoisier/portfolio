# ASSETS.md — Media manifest & delivery guide

Every game image is listed here **and** in `art/manifest.json` (a unit test keeps ids, waves,
launch status and kinds in sync). Cristian produces the media; agents never edit `art/raw/`.

## TL;DR

- **28 images total — 23 needed for launch (1 already delivered: `panda-portrait`), 5
  optional.** Each image is **one generation**: an animation strip, or a set of separate props.
  You never deliver single frames.
- Save each file as **`art/raw/<id>.png`** (ids in the registry table at the bottom), then commit
  it or hand it to an agent. `pnpm assets` normalizes it; the game picks it up with no code change.
- **Pure green `#00FF00` background (or real transparency), no text, no ground shadows, no baked
  glow/steam/sparkles, character facing right.**
- Until a file exists, the game uses interim panda frames cut from
  `art/reference/panda-sheet-v1.png` or a same-size placeholder. Development never waits on media.
- **Order:** wave A (panda) → the gate (`station-spawn-gate`, it becomes the environment style
  anchor) → the rest of waves B and C → wave D.

## Reference images (attach these — never deliver them)

All in `art/reference/` except the portrait; regenerate the derived ones with `pnpm references`.

| file                                 | what it is                                                                                            | attach to                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| `art/raw/panda-portrait.png`         | **design master** — front view, every detail of face, bandana, rim light                              | Nano Banana panda images       |
| `panda-motion-ref.png`               | the sheet's IDLE (front) / WALK / RUN (side profile) row, no labels or shadows — the **camera angle** | Nano Banana panda images       |
| `panda-right-64.png`                 | right-facing panda, true pixels, 64×64, transparent                                                   | PixelLab (character reference) |
| `scale-card.png`                     | the ~48 px panda next to one 16 px floor tile, ×8 — the **pixel style**                               | every environment image        |
| `canvas-21x9.png`, `canvas-16x9.png` | flat green canvases — attach **last** so Nano Banana copies their shape                               | every Nano Banana image        |

## Which tool

| Asset type                    | Use                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panda strips (wave A + story) | **PixelLab** ([pixellab.ai](https://www.pixellab.ai/)) — true pixel grid, transparent. Pick **one route for all panda strips**; never mix PixelLab and Nano Banana strips. |
| Environment, stations, props  | Nano Banana with the prompts below                                                                                                                                         |

General image models output **"fake" pixel art** (the concept sheet has ~101 000 colors, no real
grid, uneven frames) and **no alpha channel**; the pipeline repairs that (chroma key, grid snap,
palette snap, baseline alignment), but a grid-native tool animates more cleanly.

### PixelLab route (recommended for every panda strip)

Settings per PixelLab's docs (Sept 2026 — the UI may move; the constraints below are what matter):

1. **Reference:** upload `art/reference/panda-right-64.png` (PixelLab accepts references up to
   256×256, so not the 1254 px portrait; check the result against the portrait by eye).
2. **Tool:** Animate with text (or a character template), canvas **64×64**, camera
   **sidescroller**, direction **east**, **no background**. The panda must be **46–50 px tall**
   inside the canvas. PixelLab output is used at 1× and never rescaled. **Action text:** paste only
   the row prompt from the Wave A table — never the style or character blocks (those are for Nano
   Banana: green background, ruler frame, canvas). The frame count in the text is a hint;
   PixelLab decides it (4, or 16 with the Pro tool).
3. **Frames:** deliver what the tool produced — a horizontal strip or a grid (read left→right,
   top→bottom). Loops (idle, walk, run, interact, wave, celebrate, sleep) accept 2–16 frames and
   the game plays the count it finds. `panda-air` must be **exactly 6 frames in this order:**
   crouch, takeoff, rise, apex, fall, land — pick them from the generated frames and copy the 6
   chosen 64×64 cells, unchanged, into one row (e.g. in Pixelorama or Aseprite) before exporting.
4. Export **PNG** (not GIF), save as `art/raw/<id>.png`.

### Nano Banana route

Attach, in this order: the references named in the delivery rules, then the canvas **last**.
Writing "21:9" in a prompt is not enough — Nano Banana copies the shape of the **last attached
image**. Either pick the aspect ratio in the tool (Google AI Studio / Gemini API `aspectRatio`) or
attach `canvas-21x9.png` / `canvas-16x9.png` last and end the prompt with:
_"Draw on the last attached image: keep its exact size and shape and fill it edge to edge."_

---

## Delivery rules (every image)

1. **Background:** one flat, solid, pure green `#00FF00` over the whole image (or real
   transparency, as PixelLab exports it). No gradient, noise, floor, vignette, checkerboard or
   border. **Deliver Nano Banana images exactly as generated — never run a background remover on
   them** (the pipeline keys the green itself, and panda strips' ruler frame depends on it).
2. **No text** of any kind — no labels, letters, numbers, watermarks, frame numbers or grid lines.
   Signs, screens and labels are drawn **blank**; the game writes on them.
3. **No green in the artwork** (it is keyed out). _Only exception: the `skill-block` window,
   which must be pure green on purpose._
4. **Separation:** frames and items never touch; leave wide green gaps (≥ ¼ of a frame). PixelLab
   strips and grids are delivered as exported (64×64 cells); this rule is for Nano Banana images.
5. **Strips:** frames left→right in playback order, same scale, facing **right**, full body
   visible, **feet on the same baseline in every frame** (the game moves the character — never
   raise it for jumps). No ground shadow. Nano Banana panda strips start with one **size
   reference frame** on the far left (see the character block); PixelLab strips don't need it.
6. **No baked effects:** no light beams, glows, halos, smoke, steam or sparkles — the game draws
   all light and particles. Light sources are solid lit shapes.
7. **Consistency:** panda images attach `panda-portrait.png` + `panda-motion-ref.png` (Nano
   Banana) or `panda-right-64.png` (PixelLab). Environment images attach `scale-card.png`, plus
   `art/raw/station-spawn-gate.png` as the style anchor once the gate is approved (generate the
   gate first).
8. **Format & canvas:** PNG at the largest size offered — never JPEG, never resized or
   compressed. 21:9 canvas for panda strips, floor, platforms, layers, prop sets, flask and flame;
   16:9 canvas for stations, dossier and contact post.
9. **Names:** exactly `<id>.png`. A new attempt simply replaces the old file (git keeps history).

### Palette (paste into prompts)

`#0A0A0A #16161C #24242E #3A3A48 #5A5A6A #8A8A9A #C4C4CC #070F1F #0F2342 #1E3A6E #2F5896 #4F7FC0 #8FB4E0 #4A0A10 #8C1420 #E11D2A #F07A82 #FFC2C6 #8E7E66 #C9BBA0 #E4DCCB #F5F3EE #FFFFFF #7A3E0C #D9731A #FFB23F #FFE6A0 #3B2352 #6E3F6E`

(ink · navy · scarlet · paper · white · amber · dusk ramps.) The pipeline snaps every pixel to
this list; prompts that respect it snap cleanly.

### Style block — paste at the top of EVERY Nano Banana prompt

```
Pixel art sprite for a 2D side-scrolling platformer game.
TRUE pixel art: hard square pixels, crisp 1-pixel dark outlines, flat cel shading with 2–3 tones per color. NO anti-aliasing, NO blur, NO gradients, NO painterly texture, NO noise.
Use only these colors: #0A0A0A #16161C #24242E #3A3A48 #5A5A6A #8A8A9A #C4C4CC #070F1F #0F2342 #1E3A6E #2F5896 #4F7FC0 #8FB4E0 #4A0A10 #8C1420 #E11D2A #F07A82 #FFC2C6 #8E7E66 #C9BBA0 #E4DCCB #F5F3EE #FFFFFF #7A3E0C #D9731A #FFB23F #FFE6A0 #3B2352 #6E3F6E.
Light comes from the upper left. No light beams, glows, halos, smoke, steam or sparkles — draw light sources as solid lit shapes.
CRITICAL: the background is ONE flat solid pure green #00FF00 filling the whole image — no gradient, no floor, no ground shadow, no vignette, no checkerboard, no border.
CRITICAL: no text, letters, numbers, labels, watermarks, frame borders or grid lines anywhere.
CRITICAL: nothing in the artwork itself is green.
```

### Character block — add after the style block for every Nano Banana panda image

```
Character: the first attached image (front portrait) is the exact design; the second attached image shows the same character in motion and the exact CAMERA ANGLE to use. A chubby, friendly giant panda: black round ears with a thin scarlet rim light on their edges, black eye patches with white eye highlights, small black nose and a gentle smile, cream-white face and big round belly (#F5F3EE, shaded #E4DCCB), black arms and legs (#16161C / #24242E, outline #0A0A0A) with a thin scarlet rim light along the outer edges, small cream claws on the feet, and a scarlet bandana-style scarf (#E11D2A, shaded #8C1420) knotted at the neck with two tails that trail behind the panda (toward the left of the image). Same proportions, face and colors in every frame.
Camera: exactly the side view of the eight right-hand poses of the second image (its middle four are the walk, its right four the run): body and head facing right, snout pointing right, one eye visible, the belly seen from the side. Ignore the first four (front-facing) poses for the angle.
Sheet layout: all frames in ONE horizontal row, left to right in playback order, evenly spaced with wide green gaps, every frame the same size and scale, full body visible (never crop the ears or scarf), feet resting on the same horizontal baseline in every frame. No ground shadow. Big chunky pixels, as if the finished panda is 48 pixels tall.
Size reference: BEFORE the animation frames, at the far LEFT, draw one extra frame of the panda standing still facing right with arms relaxed, at exactly the same scale as the other frames. It is a ruler; the game discards it.
Use the last attached image as the canvas (21:9).
```

### Environment block — add after the style block for world, station and prop images

```
Flat side view (front elevation). Setting: a chemical plant at night — steel, pipes, tanks, catwalks, rivets, warning lights. Structures in navy and ink tones, lights in scarlet and amber, cream highlights.
Chunky pixels in the same style as the attached scale card (its panda is 48 pixels tall and its square is one 16-pixel floor tile). Draw the object as if it is the given size in pixels — so a 160-pixel-tall object is about 3.3 times as tall as that panda — with no detail smaller than one of those pixels, and leave empty green on every side. The scale card is only a ruler: do NOT draw its panda or its square in the image. The object stands on an invisible ground line at the bottom.
```

---

## Wave A — the panda (needed from Phase 3; interim frames cover development)

Final geometry: 64×64 cell per frame, panda ≈ 48 px tall, lowest opaque row 59 (baseline 60).
`panda-portrait` is ✅ **delivered** (front view on pure black, keyed with a black flood-fill; UI
only: loading screen, favicon, social image, HUD badge — never in-world).

"frames" = animation frames. Nano Banana deliveries add 1 size-reference frame on the left.

| id             | frames | prompt (Nano Banana: after style + character blocks; PixelLab: this text alone)                                                                                                                                                                                                                           |
| -------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| panda-idle     | 4      | IDLE loop, 4 frames: standing relaxed facing right, gentle breathing — belly rises in frames 2–3, head bobs 1 pixel, scarf tails sway, eyes closed (blink) in frame 3. Frame 4 flows back into frame 1.                                                                                                   |
| panda-walk     | 6      | WALK cycle, 6 frames: 1 contact (right foot forward), 2 down (weight on the right leg), 3 passing (legs cross), 4 contact (left foot forward), 5 down, 6 passing. Arms swing opposite to the legs, body bobs up 1–2 pixels on passing frames, scarf tails trail and bounce. Loops seamlessly.             |
| panda-air      | 6      | JUMP sequence, exactly 6 frames: 1 crouch (knees bent, anticipation), 2 takeoff (legs extending, arms swinging up), 3 rise (arms up, legs tucked, scarf trailing down), 4 apex (tucked, happy surprised face), 5 fall (arms up, legs reaching down, scarf flowing upward), 6 land (squashed, knees bent). |
| panda-interact | 4      | WORKING loop, 4 frames: standing facing right, holding a small open laptop (body #3A3A48 with a #8A8A9A edge, screen lit #8FB4E0, solid, no glow) against the belly, typing with both paws; paws alternate between frames, a small satisfied smile in frame 4.                                            |
| panda-wave     | 4      | WAVE loop, 4 frames: same camera angle, right paw raised high and waving (paw left, centre, right, centre across frames 1–4), big friendly smile, scarf fluttering.                                                                                                                                       |
| panda-run      | 6      | _(optional)_ RUN cycle, 6 frames: leaning forward, long strides with both feet off the ground in frames 3 and 6, arms pumping, scarf streaming straight back.                                                                                                                                             |

## Wave B — the world (needed from Phase 4)

Layers are bottom-aligned on the horizon (the ground line) behind the floor; the sky above them
is drawn in code. All wave B prompts go after the style + environment blocks, on the 21:9 canvas.

| id          | final size (art px)         | prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| floor-plant | 256×32, tiles horizontally  | GROUND STRIP: one long horizontal strip across the full image width, about one eighth as tall as it is wide. It is a row of 8 IDENTICAL riveted steel plates separated by dark vertical joints, and it starts and ends exactly in the middle of a joint so both ends match. The top sixth is a steel walkway edge with rivets and a thin scarlet safety stripe; below, the plates sit over concrete in flat bands (#24242E, then #16161C, then a solid #0A0A0A bottom band). No gradients.                                                                                                                                                                                                                      |
| platforms   | 48×16 · 80×16 · 128×16      | THREE separate floating steel catwalk platforms side by side with wide green gaps, small / medium / large (as if 48×16, 80×16 and 128×16 pixels): steel grating slabs with bolted edges and amber-and-ink hazard stripes on the front face, flat top surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| bg-far      | 640×160, tiles horizontally | DISTANT SKYLINE panorama. Everything sits in the bottom 40 % of the image; the top 60 % is empty green. A continuous low band of far-away plant silhouettes about one third of the drawn height, with a few peaks reaching the full height: two distillation columns, a cooling tower, one flare stack with a flat empty tip (no flame — the game adds it), storage spheres, chimneys, tiny amber and white window dots. Flat #0F2342 and #1E3A6E with #3B2352 accents, very low contrast. The bottom edge is one straight line across the full width. The leftmost and rightmost tenth of the image contain only the low band, at the same height at both edges, so copies placed side by side join invisibly. |
| bg-mid      | 640×128, tiles horizontally | MID-DISTANCE industrial layer. Everything sits in the bottom 33 % of the image; the top two thirds are empty green. Pipe racks, storage tanks, catwalks, ladders and small scarlet warning lights, most of them half the drawn height, plus one water tower that is the only thing reaching the top; clear gaps between groups (at least 40 % of the drawn area is green). #1E3A6E and #2F5896 with #16161C shadows and a few #E11D2A / #FFB23F lights. Flat bottom edge. The leftmost and rightmost tenth contain only a low continuous pipe rack at the same height at both edges.                                                                                                                            |

## Wave C — stations, zones & story (needed from Phases 5, 8, 9, 10)

Generate `station-spawn-gate` first; once approved, attach it to every other environment image.
Prompts go after the style + environment blocks unless noted.

| id                     | final size (art px)           | prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| station-spawn-gate     | ≤ 224×176 (~200×160)          | PLANT ENTRANCE, drawn as if about 200×160 pixels: an open steel gate of thick vertical bars (no chain-link or fine mesh) between two concrete pillars, and two lamp posts with lamps lit #FFE6A0 (solid, no halo). Mounted across the top is a VERY WIDE blank signboard, about three quarters of the whole width and a quarter of the height: a clean, empty, flat #0F2342 rectangle in a steel frame with four small bulbs at its corners. Completely empty — the game writes the name and roles on it. Nothing on the ground in front of the gate. 16:9 canvas.          |
| station-fiora          | ≤ 160×160 (~128×128)          | FINANCE KIOSK, drawn as if about 128×128 pixels: a futuristic ATM-style terminal whose screen is shaped like a giant smartphone (screen #0F2342 with abstract bright bars and a pie chart in #8FB4E0 and #E11D2A, no text), a coin slot, a small steel safe beside it with a scarlet dial. 16:9 canvas.                                                                                                                                                                                                                                                                     |
| station-japaniracer    | ≤ 176×160 (~160×128)          | MOTORCYCLE GARAGE BOOTH, drawn as if about 160×128 pixels: a sporty red-and-black motorcycle raised on a hydraulic lift, a pegboard with wrenches, a shelf of spare parts (pistons, chains, a stack of tires), a corrugated steel awning, one hanging work lamp lit #FFE6A0. 16:9 canvas.                                                                                                                                                                                                                                                                                   |
| station-le-parche      | ≤ 160×160 (~144×128)          | RESTAURANT FOOD STALL, drawn as if about 144×128 pixels: a cozy street kitchen with a scarlet-and-cream striped awning, a blank chalkboard menu (no writing), a hanging lantern lit #FFB23F, a lidded pot on a burner (no steam — the game adds it), two small stools. 16:9 canvas.                                                                                                                                                                                                                                                                                         |
| station-maison-cielare | ≤ 160×160 (~144×128)          | SLEEPWEAR BOUTIQUE WINDOW, drawn as if about 144×128 pixels: a small shopfront with a big window showing pajamas on hangers and a pillow, a crescent-moon-and-stars sign (shapes only, no letters) lit #FFE6A0 (solid, no halo), soft dusk-purple interior (#6E3F6E), a door with a little bell. 16:9 canvas.                                                                                                                                                                                                                                                               |
| station-orquestia      | ≤ 176×160 (~160×136)          | CREATIVE AGENCY STAGE, drawn as if about 160×136 pixels: a small stage with a blank billboard screen (empty #0F2342 rectangle in a steel frame), a conductor's music stand with a baton, two speakers, a spotlight on a stand aimed at the stage with its lens lit #FFE6A0 (no beam — the game draws it). 16:9 canvas.                                                                                                                                                                                                                                                      |
| station-transcolombia  | ≤ 176×160 (~160×128)          | TRANSPORT DISPATCH YARD, drawn as if about 160×128 pixels: a small white-and-scarlet delivery truck parked beside a steel dispatch booth; on the booth roof a tall radio/GPS antenna mast with a small beacon lit #FFB23F (solid, no halo); on the booth wall a route board showing a dotted route line between three pins (no map text, no letters); a few stacked cargo boxes on a wooden pallet. 16:9 canvas.                                                                                                                                                            |
| confidential-vault     | set: wall 160×144, door 96×96 | BUNKER VAULT, TWO separate items side by side with a wide green gap, drawn as if the wall is 160×144 pixels: item 1 a concrete bunker wall section with hazard stripes and a scarlet warning light, with a big ROUND DOORWAY about two thirds of the wall height showing a dark #070F1F interior lit by a thin scarlet line; item 2 the massive round steel vault door on its own (bolts, spokes, a central wheel), exactly the size of that doorway. 21:9 canvas.                                                                                                          |
| confidential-dossier   | ≤ 48×64 (~40×56)              | CLASSIFIED DOSSIER on a stand, drawn as if about 40×56 pixels: a thick folder with black redaction bars on the cover and a scarlet stamp shape (no letters), clipped to a small steel lectern. 16:9 canvas.                                                                                                                                                                                                                                                                                                                                                                 |
| skill-block            | 3 × 24×24                     | ELEMENT BLOCK, 3 frames side by side of the same block at the same size, drawn as if 24×24 pixels each: a floating reagent cube with thick steel corners (#5A5A6A / #8A8A9A, outline #0A0A0A) and a glass rim (#8FB4E0). The front face is one big square WINDOW, about two thirds of the face, filled with pure flat #00FF00 (the game fills it with the category color and writes the symbol). Frame 1 idle; frame 2 bumped (the whole block squashed 2 pixels shorter, bright #FFFFFF edge highlights); frame 3 used (steel darker #3A3A48, no highlights). 21:9 canvas. |
| contact-post           | 2 × 112×128 (~96×120)         | SUNRISE CONTACT POST, 2 frames side by side of the SAME object at the same size, drawn as if 96×120 pixels: a vintage red telephone booth with a mailbox on a short post standing right against its side, both on one shared concrete base slab (they touch). Frame 1 idle: mailbox flag down, booth lamp dark. Frame 2 is an exact copy of frame 1 with only three changes: flag up, booth lamp lit #FFE6A0 (solid, no halo), a tiny envelope peeking out of the mailbox. 16:9 canvas.                                                                                     |
| props-zones            | set: 4 items                  | FOUR separate props in one row with wide green gaps, all at the same scale, left to right: 1 a steel security FENCE PANEL of thick vertical bars with a top rail, its left and right posts identical so panels line up edge to edge (as if 48×40 pixels); 2 a small WARNING BEACON on a wall bracket, dome lit #E11D2A (12 tall); 3 a laboratory FUME HOOD cabinet with a glass sash (64 tall); 4 a steel LAB SHELF with flasks, beakers and test tubes (48 tall). 21:9 canvas.                                                                                             |
| panda-sleep            | 2 × 64×64                     | _(optional; style + character blocks)_ SLEEP loop, 2 frames: curled up asleep lying on its side, facing right, eyes closed, belly rising in frame 2. No "Z" letters (the game draws them).                                                                                                                                                                                                                                                                                                                                                                                  |
| panda-celebrate        | 4 × 64×64                     | _(optional; style + character blocks)_ CELEBRATE loop, 4 frames: holding up a round-bottom flask with scarlet liquid (#E11D2A with #F07A82 highlights) in the raised right paw, bouncing on the toes (no sparkles — the game adds them). The "special / power up" pose of the concept sheet is the model.                                                                                                                                                                                                                                                                   |

## Wave D — ambience (needed from Phase 11)

| id             | final size (art px) | prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| props-misc     | set: 8 items        | _(style + environment; 21:9)_ EIGHT separate small props in TWO rows of four with wide green gaps, all drawn at the SAME scale, left to right then top to bottom, with these heights relative to the 72-pixel lamp post: row 1 — 1 steel barrel with a scarlet band (24), 2 wooden crate with a flat top (20), 3 traffic cone, scarlet with a cream stripe (14), 4 valve wheel attached to a short pipe (32); row 2 — 5 tall lamp post with a lamp lit #FFE6A0 (72), 6 metal bench (18), 7 gas cylinder with an amber cap (28), 8 small toolbox (12). |
| flask-bubbling | 4 × 16×24           | _(style + environment; 21:9)_ ERLENMEYER FLASK bubbling, 4 frames side by side, drawn as if 16×24 pixels: glass outline #C4C4CC, scarlet liquid #E11D2A, bubbles are solid #FFC2C6 pixels inside the liquid, rising 2 pixels per frame.                                                                                                                                                                                                                                                                                                               |
| bg-fore        | 640×64, tiles       | _(optional, desktop only; style + environment; 21:9)_ FOREGROUND layer. Everything sits in the bottom 25 % of the image. Near-black (#070F1F, #0A0A0A) pipes, railings and valve wheels in the lower half of the drawn strip, plus at most two thin vertical pipes that reach its top; at least 70 % green; the leftmost and rightmost tenth contain only a low railing at the same height at both edges, so copies join invisibly.                                                                                                                   |
| flare-flame    | 4 × 16×32           | _(optional, desktop only; style block; 21:9)_ FLARE STACK FLAME, 4 frames, drawn as if 16×32 pixels: a small flickering flame (#FFE6A0 core, #FFB23F, #D9731A, #E11D2A edges), each frame a different flame shape for a looping flicker, no smoke.                                                                                                                                                                                                                                                                                                    |

## Drawn in code — never deliver

- Sky gradient (night → sunrise), stars, moon and the sunrise sun.
- All in-world text: gate sign lines, station name labels on a code-drawn plate, the
  `CLASIFICADO / CLASSIFIED` sign plate and text, interact-prompt key/button glyphs,
  element-tile symbols and numbers.
- The periodic board on the lab wall (frame, one slot per skill, element tiles).
- Light and particles: warning-light blinks, the scanner cone, the classified wing's scarlet
  shift, spotlight beams, glow halos (high tier: Phaser filters; low tier: dithered halo textures
  generated at boot), steam, embers, sparkles, dust, "Z"s — 1–3 px palette squares generated at
  boot.
- Ground fill below the floor strip (`ink-900`) and the panda's ground shadow.
- HUD, touch pad, menu and panel frames (CSS).

---

## Registry (source of truth for status — must match `art/manifest.json`)

Status: `needed` → `delivered` (file in `art/raw/`) → `approved` (Cristian signed off in-game).

| id                       | wave | launch   | kind       | final geometry (art px)                | status    |
| ------------------------ | ---- | -------- | ---------- | -------------------------------------- | --------- |
| `panda-portrait`         | A    | required | sprite     | ≤ 80×104 (front, UI only)              | delivered |
| `panda-idle`             | A    | required | strip      | 4 × 64×64                              | needed    |
| `panda-walk`             | A    | required | strip      | 6 × 64×64                              | needed    |
| `panda-air`              | A    | required | strip      | 6 × 64×64 (named frames)               | needed    |
| `panda-interact`         | A    | required | strip      | 4 × 64×64                              | needed    |
| `panda-wave`             | A    | required | strip      | 4 × 64×64                              | needed    |
| `panda-run`              | A    | optional | strip      | 6 × 64×64                              | needed    |
| `panda-celebrate`        | C    | optional | strip      | 4 × 64×64                              | needed    |
| `panda-sleep`            | C    | optional | strip      | 2 × 64×64                              | needed    |
| `floor-plant`            | B    | required | tile-strip | 256×32 seamless                        | needed    |
| `platforms`              | B    | required | set        | 48×16 · 80×16 · 128×16                 | needed    |
| `bg-far`                 | B    | required | layer      | 640×160 seamless                       | needed    |
| `bg-mid`                 | B    | required | layer      | 640×128 seamless                       | needed    |
| `bg-fore`                | D    | optional | layer      | 640×64 seamless (high tier)            | needed    |
| `station-spawn-gate`     | C    | required | sprite     | ≤ 224×176, anchor `sign`               | needed    |
| `station-fiora`          | C    | required | sprite     | ≤ 160×160                              | needed    |
| `station-japaniracer`    | C    | required | sprite     | ≤ 176×160                              | needed    |
| `station-le-parche`      | C    | required | sprite     | ≤ 160×160                              | needed    |
| `station-maison-cielare` | C    | required | sprite     | ≤ 160×160                              | needed    |
| `station-orquestia`      | C    | required | sprite     | ≤ 176×160                              | needed    |
| `station-transcolombia`  | C    | required | sprite     | ≤ 176×160                              | needed    |
| `confidential-vault`     | C    | required | set        | wall 160×144 (`doorway`) · door 96×96  | needed    |
| `confidential-dossier`   | C    | required | sprite     | ≤ 48×64                                | needed    |
| `skill-block`            | C    | required | strip      | 3 × 24×24 (idle, bump, used), `window` | needed    |
| `contact-post`           | C    | required | strip      | 2 × 112×128 (idle, active)             | needed    |
| `props-zones`            | C    | required | set        | fence · beacon · fume-hood · lab-shelf | needed    |
| `props-misc`             | D    | required | set        | 8 props                                | needed    |
| `flask-bubbling`         | D    | required | strip      | 4 × 16×24                              | needed    |
| `flare-flame`            | D    | optional | strip      | 4 × 16×32 (high tier)                  | needed    |

## Content media (kept from the old site)

Owned by `src/content/projects.ts` (not the art pipeline), served as-is:

- `public/media/projects/fiora/fiora-{overview-light,overview-dark,budget-dark,calendar-dark,balance-dark}.webp`
  (1080×2340) + `-thumb.webp` (480×1040).

Screenshots of the live sites (JapaniRacer, Le Parché, Maison Cielare, Orquestia, Transcolombia) are optional for
their panels; an agent can capture them from the live URLs in Phase 5 if Cristian approves, and
lists them here.

## Generated — never deliver, never commit

- `public/game/**` — pipeline output (gitignored), including `public/game/assets.json`.
- Favicon set and OG/social image (1200×630) — produced in Phase 12 from `panda-portrait` and a
  game capture.
