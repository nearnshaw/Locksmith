# Locksmith

A parody escape game for Decentraland (SDK7). You are you: the most famous escape artist alive, tied to a chair with 0 lockpicks. Three levels, each with a deadline and a tool just out of reach. There is no way out. That is the joke.

## Play

Open the scene in the [Creator Hub](https://decentraland.org/download/creator-hub) and press **Play**, or from this folder:

```
npm install
npm run start
```

1. Spend your 12 skill points. 8 are already in Lockpicking and they are staying there.
2. Study the two-page lockpicking minigame tutorial.
3. Click the padlock behind your back ("Use lockpick"), press **E** to shake the chains, click anything that looks useful.

## Project layout

- `assets/scene/main.composite` — the three rooms (24 × 20 m, one per level) side by side across the 6 × 2 parcels, each in its own 32 m block. Edit them in the Creator Hub; the code reads each room's origin from its level root.
- `assets/asset-packs/`, `assets/Models/` — catalog models (Creator Hub packs and OpenDCL). See `design/implementation-notes.md` for the list.
- `src/index.ts` — entry point.
- `src/game/content.ts` — every line of player-facing text.
- `src/game/room.ts` — looks the composite entities up by name and wires the hover text and deadpan answers onto them.
- `src/game/player.ts` — freeze, seat, emotes, chains and the clickable padlock. Swap the `EMOTES` table entries for custom `_emote.glb` clips.
- `src/game/guards.ts` — the two guards (AvatarShape NPCs).
- `src/game/levels.ts` — level timelines, the belt, the shark, transitions, ending.
- `src/ui.tsx` — title, stats, tutorial, HUD, hints, thoughts, speech, end card (coded React-ECS).
- `assets/images/` — tutorial diagrams and HUD icons.
- `design/` — GDD draft, decisions, ideas, hypothesis log and the exploration note (from the `dcl-gdd` / `dcl-prototype` skills).
