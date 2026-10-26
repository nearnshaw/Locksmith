# Implementation notes — Locksmith

Engineering companion to the GDD. Ships with the repo; not part of the application.

## Where the rooms live (2026-10-23, pass 2)

- The three rooms are in `assets/scene/main.composite`, editable in the Creator Hub. The scene is 6 × 2 parcels (96 × 32 m); each level is a room at ground level in its own 32 m block: `Level 1 - The Cell` (24 × 20 m) root at (4, 0, 6), `Level 2 - Conveyor 3` (24 × 20 m) at (36, 0, 6), `Level 3 - The Tank` (28 × 28 m, so the shark has ~15 m to swim) at (66, 0, 2). Every prop is a child of its level root, so its Transform is local to the room. The code reads each room's origin from the level root entity at runtime (`levelOrigin()` in `src/game/room.ts`), so moving a room in the Hub cannot break the seat, guards or belt again. The cell has a 4 m dead-end corridor behind its barred doorway so the door never opens onto the sky.
- **glTF X mirror.** The Explorer negates a GLB's X axis on import: a wall module whose glTF bounding box spans x 0..4 occupies x −4..0 in-world. The first layout, placed from glTF bounds, had a shifted doorway, an open corner and a strip of terrain showing through the floor. The generator's placement rules are commented at `stone_walls()`.
- The composite was written while the scene was closed in the Creator Hub, from a generator script kept in the agent's scratchpad (not shipped). The composite is now the source of truth: edit it in the Hub, never regenerate it.
- Code finds entities by name (`prop('Box of lockpicks')` in `src/game/room.ts`). Renaming an entity in the Hub breaks the lookup; the scene logs `composite entity "…" not found` once per missing name.
- Things the code moves at runtime: `Chair pallet L2` (and its children), `Belt slat 1..12`, `Wrench`, `Shark`, `Tank gate`, `Countdown board text`. Their composite positions are the reset positions.

## Models

| Role | Source | Notes |
| --- | --- | --- |
| Cell walls, doorway, floor | Fantasy pack: Stone Brick Wall, Stone Brick Threshold, Large Stone Floor | 4 m modules scaled 1.3 tall (third-person headroom) |
| Belt hall / tank room walls | Cyberpunk pack: Concrete Wall | 2 m module scaled 2 × 1.3 |
| Chair | Genesis City pack: Orange Folding Chair, scaled 0.9 | faces +Z natively; collider pointer-only; seat top 0.65 m, which is where `sittingChair2` holds the hips (measured from a low side camera, pass 10); the player stands 0.18 m in front of the chair centre so the back meets the backrest |
| Box of lockpicks | Pirates pack: Closed Wooden Crate (0.75 m) + stencil TextShape on its face + billboard label | replaced the chest-like Codex Box (pass 5) |
| Torches | OpenDCL `antorcha` (animated flame) + LightSource child | |
| Key | OpenDCL `key` scaled 0.35 | its mesh sits 1.9–2.8 m above its origin; entity placed 0.8 m low to compensate |
| STOP button | Smart Items: Button Pedestal, model only (no script) | |
| Danger sign, alarm lamps | Cyberpunk pack: Warning Sign (with a yellow plate + "DANGER: LAVA" text on its post, children of the sign), Lamp - Red | |
| Lava | primitives: emissive pool, dark rim, four emissive bubbles, point light, `core::ParticleSystem` smoke (cone, 14/s, 4 s life, grows and fades) | the OpenDCL `lava-pool` model did not show up in-world (pass 3), so it was dropped |
| Shark | OpenDCL `shark` (clips `swim`, `bite`) scaled 0.45 | nose along local +Z; code turns it to face travel |
| Dock, lever, bait | Pirates pack: two Small Straight Dock Modules (deck ≈ 0.95 m up, at y 0.3); OpenDCL `switch` ×1.5; Genesis City Worm Bucket | both raft models in the catalog carry a sail, so the handler stands on a dock (pass 5) |
| Flood water | Smart Items: Water Plane (five normal-mapped layers + `Water.ts`) | `asset-packs::Script` on `Flood water`; splashes for all players |
| Tank gate | Smart Items: Lab Vault Door, model only, scaled 0.6 (3.3 m across) | round door + short tunnel at the tank front; `Animator` plays `open` on release, `close` on reset |
| Bars, belt, tank glass | primitives | the catalog castle door and conveyor are baked tens of metres off-origin and would be clipped |

Download helper: the `dl-asset.mjs` snippet from the add-3d-models skill (asset-pack items) and plain `curl` (OpenDCL). Thumbnails were removed from the pack folders.

## Emotes

- `src/game/player.ts` holds `EMOTES`: `seated` and `shake`. Each entry is either `{ kind: 'builtin', id }` or `{ kind: 'scene', src }`. Drop a custom clip at `assets/animations/<name>_emote.glb` (the suffix is mandatory) and switch the entry.
- The seated emote is re-triggered after every shake and after every level transition (movePlayerTo can interrupt it).

## Restraints and padlock

- Chains and the padlock ride the avatar's bones. **The Explorer ignores a Transform offset on the `AvatarAttach` entity itself** (three offset experiments moved nothing, 2026-10-23), so each bone has an invisible attached root and the visible parts are its children: chest band on `AAPT_SPINE2`, wrist links on both hands, padlock (brass body, dark keyhole, steel U-shackle, not emissive) plus hitbox on `AAPT_RIGHT_FOREARM`. The hitbox hovers as "Use lockpick" and clicks from the default third-person camera (verified pass 8). Earlier placements on the lower back and hip were hidden by the body or blocked by the chair's collider.

## Guards

- The two thugs are `Knuckles` (black jacket, distressed jeans, slicked-back black hair, horseshoe beard, sunglasses) and `Crowbar` (sleeveless punk shirt, trashed jeans, pompous black hair, goatee, "thug life" glasses), all base-avatar wearables verified against the live collection. Each carries an `AvatarNametag` plate reading THUG. Their `id`s end in four digits (`thug-0001`) because the Explorer shows the last four characters of the id as the nametag's hash tag; `guard-1` produced the "second nametag" the owner saw.
- Moving an `AvatarShape` entity makes the Explorer animate the NPC walking/running to the new spot (seen when Pell crossed from room 2 to room 3). `setGuardsForLevel` therefore destroys and recreates the guard entities at their posts, and `endLevel` calls it 1.4 s into the fade, while the screen is black.
- Guard lines are in-world speech bubbles above the speaker's head (a dark plate and a wrapped `TextShape`, each billboarded and with its own `VisibilityComponent`; a hidden parent did not hide children in the Explorer). Only the PA and the intercom use the on-screen speech box, which now sits at the top under the hint bar so it never covers the chair or the lock.

## Player freeze and seat

- `InputModifier` with `disableAll` on the player entity for the whole game. It only works on the desktop client (and mobile 1.15+ per the skills); in the legacy web explorer the player can walk away. The padlock and chains are parented to the player entity, so they follow if that happens.
- The seat is the top of the chair pallet (`seatLocal(level)` in `room.ts`, offset by the level's room origin). The seated emote is `sittingChair2` (variant 1 crossed the legs); `SEAT_FORWARD` 0.03 m was tuned in the Explorer with the real avatar so the hips land mid-seat against the backrest. A `CameraModeArea` per room forces third person so the player can see their own padlock.
- Level 2: the pallet is a moving physics collider, which the Explorer uses to carry avatars standing on it. As a fallback, `keepOnSeat()` snaps the player back every 2.5 s if they drift more than 0.35 m. Unverified in-world.

## Levels

- `src/game/levels.ts` is a timeline director: each level has a duration and a list of `{ t, run }` events. A system advances the clock and fires them. No `setTimeout`.
- No per-level visibility toggling any more: the rooms are separate spaces and the player is teleported between them.
- Level 2: the belt is off for 6 s, then the slats and the chair pallet run toward +x at 0.097 m/s; the pallet stops at x 11.4 (lava edge 11.8). The wrench lies on the floor beside the belt (you move away from it). The HUD clock shows the time to the lava edge at that speed.
- Level 3: the shark patrols the tank, slerping its yaw toward its direction of travel; on release the vault door plays `open` and the shark follows `SHARK_PATH`: the gate mouth, a point just outside it, then the chair (so it never clips the tank wall; ~15 m at 0.88 m/s). 1.3 m from its target the game hard-cuts to black (`sharkCut`): Wilhelm scream (`assets/Audio/wilhelm.ogg`, Wikimedia Commons), title card at 1.6 s, end card at 4.6 s. The bite itself is never shown. Spoken countdown lines use `sayNow` (shown immediately, number computed at that moment) so they match the clock.
- `startGame` sets the fade to 1 before the intro so the room is not glimpsed between the tutorial card and the black intro.

## Lighting

- `SkyboxTime` on the root entity fixes the sky at 19:00 (`scene.json` `skyboxConfig.fixedTime` 68400 as well). Cell torches: 14000 intensity, 13 m range; corridor torch 9000.

## Sound

- Countdown music: see "Seat, restraints and cinematics (pass 12)" (Spy Glass loop; the synthesized loops of passes 7 and 10 were replaced).
- Verb sounds, on entities parented to the player: `lock-click.mp3` (Creator Hub audio catalog "Padlock") on every lock use, `chain-rattle.ogg` (synthesized metallic clinks) on every shake, `clunk.ogg` (synthesized) when the pallet hits the end stop.

- One `AudioSource` entity (`Title sound`, parented to the player) plays `assets/Audio/chest-close.mp3` through `AudioSource.playSound` when the title card shows between levels. The clip is "Chests sound" from the Creator Hub audio catalog, 2.6 s.
- The Water Plane plays its own `splash.mp3` on entry.

## UI

- Coded React-ECS in `src/ui.tsx` (not UI-Designer editable): the tutorial pages, stat rows, dialogue queue and reactions are data-driven.
- Tutorial pages are 1600 × 900 PNGs drawn as an in-game HUD mock, v3 (pass 10): the pick runs along the keyway below the pins and hooks only the binding pin; the right column is one aligned readout (lift/set gauges with the shear-line mark, feel legend, one key hint per row); page 2 adds the tension gauge with its sweet-spot mark, the binding-order chips and the plug dial. Generator script kept in the agent scratchpad.
- Reading time: lines stay 4.5–11 s by length, thoughts 6 s.
- One full-canvas root; every panel is an absolutely positioned full-canvas layer, so nothing shifts when a box appears. Modal cards carry `pointerFilter: 'block'` on their backdrop.
- Two text channels during play: **thoughts** (your reaction to what you tried: left side, teal, "<NAME> (thinking)") and **speech** (guards, PA, intercom: bottom centre, warm panel, gold speaker chip, quoted text). Hints are a gold ticker at the top and never overlap speech.
- The HUD clock is its own fixed-width `nowrap` label and `formatClock` always writes two digits of seconds, so "0:10" cannot wrap or clip into "0:1".
- Stats: 12 points, Lockpicking starts at 8 and `adjustStat` refuses to go below `LOCKPICKING_MIN`, showing a note under the rows. "All in" keeps that floor.

## Avatar animation

- Seated idle: built-in `sittingChair2` (loops). The E shake plays `assets/animations/chain_struggle_emote.glb` (one-shot, 44 frames at 30 fps = 1.47 s) through `triggerSceneEmote`; `SHAKE_SECONDS` matches the clip and the reseat system replays the sitting emote when it ends. Masked playback was not an option: a masked clip cancels the sitting emote (avatar stands up), so the clip carries its own seated lower body.
- The clip was authored headless (Blender 5.1, official `Avatar_File.blend` from the Decentraland Tools add-on) with `tools/emotes/build_shake.py`: IK feet planted, centre of gravity dropped 0.33 m and moved 0.20 m back, 32° lean, hands on the thighs, then two yanks, two twists and a slump as deltas on that base. The base was matched against side and front Explorer screenshots of `sittingChair2` on the real avatar (first try sat 20 cm too far forward). Editable `.blend`, params and contact sheet are in `tools/emotes/` (ignored for deploy).
- Verified in-world 2026-10-24 with a temporary 20 s loop: the clip plays on the frozen, seated player, hips at the backrest, feet at the chair's front legs, chains and padlock follow the bones.

## Seat, restraints and cinematics (pass 12)

- **Seat offset**: `SEAT_FORWARD` (room.ts) is 0.38 m. Measured by reading the world transform of an `AvatarAttach` entity on `AAPT_HIP` while `sittingChair2` played: the hip joint sits 0.37 m behind and 0.64 m above the avatar root. The struggle clip uses the same hip offset (`hips_dy` 0.37 in `tools/emotes/params.json`) so both poses sit in the same place.
- **Hip bone frame**: the `AAPT_HIP` anchor is rolled 180° about z relative to the avatar (local x = avatar left, local y = down, z = forward). `hipLocal()` in player.ts maps avatar-space offsets onto it. `AAPT_SPINE2` reads as ~45° about x in the seated pose.
- **Padlock**: a waist chain (four bars) around the hips plus a link out to the right side, where the lock hangs upright with its shackle through the link. The click (and hover outline) lives on the visible parts (body, shackle, link): the Explorer outlines the renderers of the entity under the reticle, so an invisible hitbox never glows. Verified from the seat camera: the reticle hits the lock body with "Use lockpick".
- **Starting camera**: `CAMERA_OFFSET` looks 1.7 m to the left, so the third-person camera settles behind-right of the chair and the lock is outside the chair frame's silhouette. From dead behind, this folding chair's backrest hides everything at hip height.
- **Speech bubbles**: `assets/images/speech_bubble.png` (tools/art/make_speech_bubble.py), a 3.2 m plane with alpha blend and an emissive copy of the texture so it reads in the dark cell; text 1.7 in dark brown, centred in the rounded box. The tail tip sits just above the nametag.
- **Shark exit**: `SHARK_PATH` starts with an align point inside the tank in front of the gate, then the gate mouth, a point past the door, then the chair. `yawError()` gates movement: the shark only swims when within 10° of the leg direction, turning in place otherwise. Verified: through the gate at x 14.00 facing exactly −z.
- **Cinematic shots**: one reusable `VirtualCamera` entity plus a look-target entity parented to the subject (`startShot` / `endShot` in levels.ts). Shark: camera at room (17.3, 1.35, 19.4) looking at the shark, from the moment it reaches the align point until z < 14.5 (max 13 s). Lava: camera at room (22.9, 1.3, 11.7) looking 0.8 m above the pallet, from lava ETA < 9 s until 2.5 s after the end stop (max 14 s). Shots end on level end and the view blends back (verified: camera mode `sdk_camera` during, `third_person` after).
- **Music**: `assets/Audio/spy-glass-loop.ogg` is a 64.6 s section of "Spy Glass" (Kevin MacLeod, incompetech.com, CC BY 4.0) with a 1.5 s crossfade at the seam, normalised to −1 dBFS, played at volume 0.32 while the phase is `playing`. Attribution on the end card and in CREDITS.md. The synthesized loop was removed.

## Pass 13: single-mesh props, room dressing, camera handback

- **Padlock and cell gate** are GLBs built headless in Blender (`tools/props/make_props.py` → `assets/Models/padlock.glb`, `cell_gate.glb`). One entity each, so the hover outline covers the whole object; the primitive bars and the per-part colliders were the reason only one piece lit up at a time. The padlock's origin is its hang ring and it hangs along −y; on the hip anchor it is rolled 180° about z to compensate the bone roll. Gate collider mask: visible 3 (physics + pointer).
- **Room dressing** is in the composite (patched with `tools/patch_composite_pass13.py`, run with the scene closed in the Hub; a snapshot of the result is `tools/main.composite.pass13.snapshot.json`). Catalog sources: OpenDCL `barrel-4`, `mouse` (animated rat with a key), `cable-box`, `computer-02`; Creator Hub packs `wooden_stool`, `old_wooden_table` (0.6 scale), `sitting_skeleton` (0.55), `iron_ring_chandelier`, `draped_cobweb`, `pipe_tank`, `metal_utility_box`, `hazard_barrier`, `wire_shelving_unit`, `red_ladder`, `vending_machine`, `wall_air_vent`. Props with `_collider` meshes use invisible mask 3; the skeleton and the rat have no collider and use visible mask 1 so they are clickable (`skeleton`, `rat`, `vending`, `console` entries in room.ts). `cargo-crates` was rejected: baked off-origin and sci-fi neon.
- **Lever**: the OpenDCL switch is a wall box with a conduit running up beside it; it now stands in front of a 2 m steel pillar with a cap (primitives, same yaw as the lever) on the dock.
- **Camera handback**: `endShot()` first glides the shot camera and its look target to the player camera's measured home pose (`HOME_CAMERA_DELTA`, `HOME_LOOK_DELTA` relative to the seat) over 0.9 s, then clears `MainCamera.virtualCameraEntity`. The engine's own blend back passed through an odd intermediate pose; with the virtual camera already at the destination there is nothing to cross. Logged as `Locksmith cine: shot start / glide home / released`. With a debug start level set, key 1 fires a 3 s test shot at the chair.
- **Shake clip**: keyframe deltas rewritten so the wrists pull back as fists (small elbow and shoulder motion, curl 30–35) instead of rising to the chest with open claws.

## Not verified in-world

- Pass 4 (2026-10-23) was verified in-world through the Explorer MCP (`npm run start -- --port 8666 --mcp`): sealed rooms, corridor, seated avatar, padlock hover/click, E shake, thought vs speech boxes, belt carrying the pallet and player, lava, danger sign, water, shark release, approach and bite, countdown lines. The avatar rendered as the loading placeholder in that Explorer (profile never loaded), so the pose was judged on the placeholder skeleton. Known Explorer issue, not the scene: digits 0, 1, 2 and 7 render as thin fallback glyphs in SDK UI text at any size and font.
