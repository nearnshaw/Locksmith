# Exploration — the "no agency" mechanic (2026-10-23)

Exploratory try, not a registered experiment: no pre-registered criterion, no verdict.

## Intent

Make the tied-up situation tangible: a padlock you can aim at ("Use lockpick"), E to shake the chains, a HUD that says "Lockpicks: 0", guards who talk about having searched you, props that promise a way out and answer with a deadpan line, and a danger that advances whatever you do. Three levels, about 5 minutes. The question to explore: does it read as a joke the player is in on, or as a game that ignores them?

## Build

- Location: this repo, `src/` (room and props in `src/game/room.ts`, flow in `src/game/levels.ts`, copy in `src/game/content.ts`, UI in `src/ui.tsx`).
- Real: the attempt → answer path (click, E, prop click → line within the same frame, counters, guard reaction), the stat screen, the lockpicking tutorial, the per-level danger (guards' shift, lava approach, shark countdown), the end card.
- Faked: the conveyor (the lava and belt slats move toward the static player), the shark (boxes), the tied pose (built-in sitting emote), the shake (built-in flinch), sound (none), other players (none).
- Not built: custom emotes, sound, models, anything that could actually open the lock.

## Smoke

- 2026-10-23 · agent: type-check (`tsc --noEmit`) and bundle string check only. **Not seen in-world** — no Explorer was connected. Treat every visual claim as unverified until the owner presses Play.

## Observations

- 2026-10-23 · owner pass 1 (desktop, Creator Hub Play). Owner feedback, verbatim themes: tutorial pages 3–4 were too much (keep 1–2, teach "move the mouse to probe" first); the tutorial card let clicks through to the chair; the +/- stat buttons were white on white; the HUD shifted whenever a tip or dialogue line appeared; tips and dialogue arrived at the same time in level 1; the level-3 shark was released into a dry room; wanted the LOCKSMITH title in large letters with a heavy sound after each death.
- Changes made in response (same day): tutorial cut to 2 pages with the probing text on page 1; modal cards now block pointer input; dark +/- buttons; UI rebuilt as absolute layers under one root so nothing shifts; hints and dialogue take turns (a hint shows 8 s, only when nothing is said, 3 s of quiet after each line); level 3 is flooded to 1 m with the handler, lever and bait on a raft and the shark released into the water; a LOCKSMITH title card with `assets/Audio/chest-close.mp3` (official audio catalog) after each level. Not yet re-seen in-world.

## Unknowns

- Whether the built-in sitting emote and the flinch read as "tied up" or just as "sitting".
- Whether the padlock behind the back is easy to aim at in third person on desktop and on touch.
- Whether 70–80 s per level is too long once the lines stop surprising.
- Whether the lava-moves-toward-you fake reads as a conveyor at all.

## Owner's next step (their choice)

1. Play it (Creator Hub > Play), note what made you laugh and where you wanted to quit; that becomes the first `## Sessions` line of H1-01 if you want to register it.
2. Adjust: level lengths, line order, which props exist, the stat jokes.
3. Return to design: §4 (does return matter for a 5-minute parody?) and §8 (who is it for?).

## Owner pass 2 (2026-10-23, later the same day)

- Owner feedback, themes: move the models into the composite (scene now closed in the Creator Hub) and lay the three levels out in different spaces; drop the elf, "you're you, famous for being an escapist"; Lockpicking should start high and not be removable below a floor; the countdown lost a digit around 10 s ("0:1"); reactions and NPC lines shared one box and got mixed up; nicer models from the catalog; level 1's crate becomes a labelled box of lockpicks; level 2's belt did not move at all and should start off, then crawl and push the chair; level 3's spoken seconds did not match the clock; the shark should be the library model and face where it swims; use the water asset from the Smart Items materials.
- Changes made in response: `assets/scene/main.composite` now holds the three rooms, first stacked in the one parcel at y = 0 / 30 / 60 (the composites skill forbids adding parcels without being asked), then, at the owner's request, laid out side by side on 3 × 1 parcels at x = 0 / 16 / 32, with Fantasy stone walls and floor, Cyberpunk concrete walls, the Court Chair on a bolted pallet, a Wooden Codex Box labelled LOCKPICKS, animated wall torches, a scaled fantasy key, the Button Pedestal as STOP, a Warning Sign, red alarm lamps, the OpenDCL lava pool, the OpenDCL shark (swim/bite clips, nose along +Z, turned to face its direction of travel), the Raft, the OpenDCL switch as the lever, the Worm Bucket as bait, and the Water Plane smart item (five normal-mapped layers plus `Water.ts`) as the flood. Code looks everything up by name (`src/game/room.ts`). Hero is the player's own name; Lockpicking starts at 8 of 12 and cannot drop below 8; the clock is its own fixed-width label with two-digit seconds; thoughts (teal, left, "YOU (thinking)") and speech (warm, bottom centre, speaker chip) are separate boxes; the belt starts 6 s in and carries the pallet at 0.097 m/s to 40 cm short of the lava; level 3's spoken numbers are computed when the line is shown.
- Still not seen in-world. Open visual questions: chair seat height vs the sitting emote (the Court Chair seat is ~0.6 m; the pallet lifts the player 0.15 m), whether the moving pallet carries the avatar (fallback: snap back every 2.5 s), the Court Chair's facing, the castle-cell-door and conveyor catalog models were unusable (geometry baked tens of metres off-origin) so bars and belt stay primitives.

## Owner pass 3 (2026-10-23)

- Owner feedback: the title screen should cover the whole screen (no spoiler of the rooms); "10" did not fit in the stat value column; "Study the lockpicking minigame" -> "mechanics"; do not call the chair metal before the player tries to break it; lines vanish too fast; the lava was not visible so the belt did not look dangerous; the lava danger sign faced the wrong way; the wrench rode the belt with the player; Pell was seen running from room 2 to room 3; the player sat off the chair, and the Court Chair should become an ordinary chair.
- Changes: solid-black curtain behind the pre-game cards; wider value column; caption changed; "Metal." dropped from the intro caption; line time 3.5-9 s, thoughts 5 s; lava rebuilt from emissive primitives with a rim and bubbles; sign turned 180; wrench on the floor beside the belt; guards destroyed and recreated at their posts 1.4 s into the fade; chair swapped for OpenDCL chair-03 (yaw 270, scale 0.85) on a 0.1 m pallet with the player standing 0.22 m in front of the chair centre. The composite part of this pass is a patch script in the agent's scratchpad, pending the scene being closed in the Creator Hub (it was open during this pass).

## Owner pass 4 (2026-10-23)

- Owner feedback: chair still not ordinary; the lock could not be seen or clicked from the default camera; the player was not properly seated; the cell's open doorway faced the open world; rooms were stacked (the Hub had autosaved the stacked layout over the side-by-side one) and the game logic broke; make the rooms bigger using more parcels; use the MCP to review and iterate.
- Changes: 6 × 2 parcels, three 24 × 20 m rooms at ground level in 32 m blocks, room origins read from the level roots at runtime; dead-end corridor behind the bars; orange folding chair with a pointer-only collider; padlock on the right upper arm; level 3 extended to 76 s; wall/floor placement corrected for the Explorer's glTF X mirror.
- First in-world verification by the agent, through the Explorer MCP: sealed rooms, seated avatar, lock hover/click, E shake, thought and speech boxes together, belt carrying the pallet and the player to the lava edge, shark release with the gate rising, the shark swimming nose-first to the chair and biting, intercom numbers matching the board. Avatar shown as the loading placeholder in that Explorer. Explorer UI font renders some digits as thin fallback glyphs (not the scene).

## Owner pass 5 (2026-10-23)

- Owner feedback: use the Lab Vault Door for the tank; the raft's sail is odd; tutorial images should look like a challenging in-game mechanic; the room is glimpsed when the tutorial closes; simpler box, not a chest; seat too high; lock not aligned with the avatar (use AvatarAttach); wrench on the other side of the belt; the "hands, feet and lockpicks" line is forced; cut right before the shark bite with a Wilhelm scream; lines still too fast; NPC dialog boxes cover the chair and lock, suggest bubbles over the NPCs.
- Changes: all of the above (dock modules replace the raft; crate; AvatarAttach restraints; curtain closed through the intro; hard cut + scream; lines 4.5-11 s; guard speech bubbles with the PA/intercom box moved to the top). Verified in the Explorer: seat alignment from the side, padlock hover/click from the default camera, bubbles over the speaking guard, vault door and dock in place, the whole level 3 sequence to the end card without errors. The Explorer restarted once during the asset-folder churn; relaunched by deep link.

## Owner pass 6 (2026-10-23)

- Owner feedback: brighter flame lights in the cell; fixed skybox time around 19:00; bubbles slightly higher; the belt motor answered with the belt's lines; a bigger gate for the shark; a larger level 3 room so the shark takes longer; the shark should swim to the entrance first instead of through the tank wall.
- Changes: torches 14000/13 m; `SkyboxTime` 68400 plus `scene.json` skyboxConfig; bubbles at 2.8 m; `motor` interaction; vault door scale 0.6; level 3 room 28 × 28 m (origin 66, 0, 2) with the tank at the far end and a three-point shark path (gate mouth, outside the gate, chair). The Explorer died during the rebuild burst and was relaunched; in-world check of this pass pending the MCP reconnect.

## Owner pass 7 (2026-10-23)

- Owner feedback: two nametags per NPC; the pallet under the chair answered as the chair; thug names and a THUG label; bad-guy outfits; the STOP button not rendering; the danger text floating above the sign; smoke from the lava; make the belt stop legible; the dock model not rendering under the guard; shark closer before the cut; tense tick-tock music during countdowns.
- Changes: ids `thug-000x` (the Explorer shows the id's last four characters as the hash tag), `AvatarNametag` THUG plates, Knuckles/Crowbar with leather jacket / punk shirt and slicked-back black hair; pallet removed from the chair interaction; sign label plate on the post; end-stop bumper plus CLUNK thought and PA line; `core::ParticleSystem` smoke over the lava; cut distance 1.3 m; synthesized 64 s tick-tock loop looping while playing. STOP button and dock: both rendered in the agent's Explorer in passes 5-6; to be re-checked.

## Owner pass 8 (2026-10-23)

- Owner feedback: boots block makes no sense; the lock is emissive and does not look like a lock; "you pass them" unclear; wrench does not look like a wrench; two PA lines land badly; 900 years too much; after the shark release the NPC lines should follow what is happening; the chair does not align with the avatar; the sitting pose is too casual (legs crossed).
- Changes: boots removed; padlock rebuilt (brass body, keyhole, U-shackle) as children of a bone-attached root at the right elbow (the Explorer ignores AvatarAttach offsets, found by experiment); primitive wrench (handle, head, jaws, ring); copy fixes; post-release lines and reactions; `sittingChair2`; seat offset tuned on the real avatar from a side camera (hips mid-seat, back on the backrest). Verified in the Explorer with the owner's actual avatar loaded this time: seat, lock hover/click from the default camera, thugs' outfits and plates, wrench.

## Owner pass 10 (2026-10-24)

- Owner feedback: tutorial diagrams not like gameplay, pick overlapping pins, right column crowded; more sounds (chain shake); seat still misaligned; the shake should keep the seated pose; Vinnie too mafia; "Reaching detected" unclear; music too basic, more James Bond.
- Changes: tutorial v3; lock click, chain rattle, clunk; chair 0.9 scale with seat at the emote's hip height and the player 0.18 m forward, verified from a low side camera with the real avatar (thighs on the seat, back on the backrest); shake without the flinch emote; Crowbar; PA line reworded; synthesized spy-style loop. Pending: a custom seated-struggle emote on the avatar rig (needs Blender: live via MCP or headless, owner to choose).

## Owner pass 11 (2026-10-24)

- Owner choice: produce the seated-struggle shake clip with headless Blender (not the live MCP, not skipping it).
- Changes: `chain_struggle_emote.glb` authored on the official rig, base seat matched to `sittingChair2` from in-world screenshots (lean, hands on the thighs, hips at the backrest), two yanks, two twists and a slump in 1.47 s; wired as the E shake with the sitting emote replayed afterwards. Also recovered the runtime from a torn bundle (two overlapping saves) by relaunching the Explorer. Open: the owner has not yet seen the clip; the Hub had the scene open while the composite was regenerated at 10:44, so the Hub copy must be reloaded or closed without saving.

## Owner pass 12 (2026-10-24)

- Owner feedback: the avatar still sits too far back (the struggle clip was closer); the padlock is mostly covered by the arm and hangs in an odd direction; music could be better; the NPC dialog boxes could be much improved; the shark still clips the gate on the way out. Mid-pass additions: cinematic camera angles when the shark comes out and when the conveyor nears the lava; why does the lock not glow on hover?
- Changes: seat offset measured from the hip bone (0.38 m) and the clip matched to it; waist chain with the padlock at the right hip, starting camera behind-right, click on the visible lock parts (the invisible hitbox was why nothing glowed); comic speech bubbles; "Spy Glass" (CC BY 4.0) loop with credit; shark aligns and turns in place before each leg; two VirtualCamera shots that blend back to the player. All verified in the Explorer: seat and lock from the side and from the seat camera, bubble, shark through the gate at x 14.00 facing straight, both shots and the camera handback.

## Owner pass 13 (2026-10-24)

- Owner feedback: the lock and the cell gate highlight one rectangle at a time (make single models); level 1 and 2 too empty; the shake's hand movement odd; the level 3 lever's cables go nowhere; the camera returns from the shark shot through an awkward intermediate position.
- Changes: padlock and gate GLBs; fourteen catalog props across the two rooms, four with deadpan lines (skeleton, rat with a key, vending machine, console); shake fists; lever pillar; glide-home handback. Verified in-world: gate hover reports one entity ("Open the door"), props placed as intended, shot/glide/release sequence logged with the view ending in third person at the home pose.

## Owner pass 14 (2026-10-25)

- Owner feedback: thumbnail text outside the square safe area; opening thought and belt-stop note need 1 s more; "Tonight one will try" and the rights joke don't land; tutorial print too small; must be single player with no overlapping avatars in the chair; "previous captive"; the torch reply should name the attempt; vending machine out of place; no button colour or distances in hints and the PA; level 3 should open showing the thug and the shark; no new lines in the last 1.5 s.
- Changes: all of the above. Verified in-world: tutorial page 1 legible on the card; own avatar and thugs visible with the chair zones active; level 3 opening frame shows tank and thug; shark shot returns to that same frame; crates clickable. Not verifiable alone: the hiding of a second visitor (needs two clients). Noticed: the level 1 THUG plates did not render in a fresh Explorer session even with the zones disabled; level 3's plate did.
