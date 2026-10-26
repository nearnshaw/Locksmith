// The rooms live in assets/scene/main.composite (editable in the Creator Hub). This module only
// looks entities up by name and wires the "try it, it won't work" interactions onto them.
//
// Layout: 6 x 2 parcels (96 x 32 m); each level is its own 24 x 20 m room at ground level, in its own
// 32 x 32 m block. Every prop is a child of a level root entity, so a prop's Transform is LOCAL to its room.
// The room origins are READ FROM THE LEVEL ROOTS at runtime, so moving a room in the Creator Hub is safe.

import { engine, Entity, Transform, pointerEventsSystem, InputAction } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { game, showToast } from './state'

export const ROOM_W = 24
export const ROOM_D = 20
export const LEVEL_ROOT_NAMES = ['', 'Level 1 - The Cell', 'Level 2 - Conveyor 3', 'Level 3 - The Tank']
/** Fallback room origins if a level root is missing (index 0 unused). Match the generator. */
const FALLBACK_ORIGIN = [Vector3.Zero(), Vector3.create(4, 0, 6), Vector3.create(36, 0, 6), Vector3.create(68, 0, 6)]
/** Where the chair stands in level 1 (room coordinates). Level 3's room is bigger; its chair is further in. */
export const CHAIR_LOCAL = Vector3.create(12, 0, 9)
export const CHAIR_LOCAL_L3 = Vector3.create(14, 0, 7)
/** Level 2: the chair starts here, on the belt, and the belt carries it toward the lava. */
export const BELT_CHAIR_START = Vector3.create(8.5, 0.74, 9) // the belt sits on a 0.6 m plinth
/** The player stands (seated) on top of the pallet the chair is bolted to. */
export const PALLET_TOP = 0.04
/** Where the feet go relative to the chair centre so the hips land mid-seat (tuned in the Explorer). */
export const SEAT_FORWARD = 0.38 // measured in the Explorer: sittingChair2 puts the hip joint 0.37 m behind the avatar root; this lands it ~0.01 m ahead of the chair pivot (owner: the first 0.18 sat too far back)

export function levelOrigin(level: number): Vector3 {
  const root = prop(LEVEL_ROOT_NAMES[level] ?? '')
  if (root) return Transform.get(root).position
  return FALLBACK_ORIGIN[level] ?? Vector3.Zero()
}

export function toWorld(level: number, local: Vector3): Vector3 {
  return Vector3.add(levelOrigin(level), local)
}

/** The chair pallet's current room position for a level (level 2's moves). */
export function chairLocal(level: number): Vector3 {
  if (level === 2) {
    const pallet = prop('Chair pallet L2')
    if (pallet) return Transform.get(pallet).position
    return BELT_CHAIR_START
  }
  return level === 3 ? CHAIR_LOCAL_L3 : CHAIR_LOCAL
}

/** Where to put the player's feet: on top of the pallet. */
export function seatLocal(level: number): Vector3 {
  const c = chairLocal(level)
  return Vector3.create(c.x, c.y + PALLET_TOP, c.z + SEAT_FORWARD)
}

const cache = new Map<string, Entity>()
const missing = new Set<string>()

/** A composite entity by name, or null (logged once) if the composite does not have it. */
export function prop(name: string): Entity | null {
  const hit = cache.get(name)
  if (hit !== undefined) return hit
  const e = engine.getEntityOrNullByName(name)
  if (e === null) {
    if (!missing.has(name)) {
      missing.add(name)
      console.log(`Locksmith: composite entity "${name}" not found`)
    }
    return null
  }
  cache.set(name, e)
  return e
}

// ---------- Interactions: hover text + what happens when you try ----------

export interface Interaction {
  /** Stable id the director reacts to. */
  id: string
  /** Composite entity names that share this interaction (they cycle through the responses together). */
  names: string[]
  hover: string
  responses: string[]
}

const CHAIR_RESPONSES = [
  "No. It's metal.",
  'Still metal. It was metal a moment ago too.',
  'You kick a chair leg. Metal. Bolted to a pallet. The pallet is bolted to the floor.',
  'The chair creaks. It is the creak of a chair that is going nowhere.'
]

function range(prefix: string, n: number): string[] {
  const out: string[] = []
  for (let i = 1; i <= n; i++) out.push(`${prefix} ${i}`)
  return out
}

export const INTERACTIONS: Interaction[] = [
  // Every level
  { id: 'chair', names: ['Chair L1', 'Chair L2', 'Chair L3'], hover: 'Break the chair', responses: CHAIR_RESPONSES },

  // Level 1 - The Cell
  {
    id: 'door',
    names: ['Cell gate'], // one GLB gate since pass 13
    hover: 'Open the door',
    responses: [
      "It's a door. It's over there. You're over here.",
      'The door is probably locked. You would know. You are an expert.',
      'Seven bars. Iron. You could slip through if you were a lot thinner and not tied to a chair.'
    ]
  },
  {
    id: 'box',
    names: ['Box of lockpicks'],
    hover: 'Open the box of lockpicks',
    responses: [
      'A box. It says LOCKPICKS on it. In capital letters. It is 3.4 metres away. You are tied to a chair.',
      'Assorted, 24 pieces. You only need one. You have zero. The box has 24. The box has not moved.',
      'You imagine opening it. The hinge is a little stiff. Even in your imagination you cannot reach it.',
      'The label is very clear. Good labelling. You have time to appreciate good labelling.'
    ]
  },
  {
    id: 'key',
    names: ['Key on the hook'],
    hover: 'Take the key',
    responses: [
      'A key. On a hook. On the far wall. Of course it is.',
      "It's probably not even the right key. You tell yourself that. It helps a little.",
      'The key sways gently. It is 9.4 metres away. You have measured.'
    ]
  },
  {
    id: 'hairpin',
    names: ['Hairpin hitbox'],
    hover: 'Pick up the hairpin',
    responses: [
      'A hairpin, 1.6 metres away. Your hands are behind your back. Your feet are tied to the chair. It is a very nice hairpin.',
      'You stare at the hairpin. The hairpin stares back. Nobody moves.',
      'With Luck {L} you hope the hairpin rolls over. It is a hairpin. It does not roll.'
    ]
  },
  {
    id: 'torch',
    names: ['Torch W', 'Torch E'],
    hover: 'Burn through the ropes',
    responses: ['You lean toward the torch to burn through the ropes. There are no ropes. These are chains.', 'You try to reach the torch to burn through your bonds. It is on the wall. You are not.', 'A torch would soften these chains in about eight hours. You have about sixty seconds.']
  },

  // Level 2 - Conveyor 3
  {
    id: 'motor',
    names: ['Belt motor'],
    hover: 'Switch off the motor',
    responses: [
      'The motor. The switch is on the far side of it. Of course it is.',
      'You glare at the motor. It hums a little louder, if anything.',
      'Strength {S} would rip the cable out. Reach would be nice first.'
    ]
  },
  {
    id: 'belt',
    names: range('Belt slat', 15),
    hover: 'Stop the belt with your feet',
    responses: [
      'You push the belt with your feet. The belt is stronger than your feet.',
      'The belt hums. It sounds pleased.',
      'You drag your heels. The belt does not notice your heels.'
    ]
  },
  {
    id: 'wrench',
    names: ['Wrench'],
    hover: 'Grab the wrench',
    responses: ['A wrench. On the floor. You are moving away from it. Slowly. Goodbye, wrench.', 'The wrench is a little further away now. It did not move. You did.', 'A wrench is not a lockpick. But it would have been something.']
  },
  {
    id: 'lava',
    names: ['Lava pit'],
    hover: 'Use the heat',
    responses: ['Lava. Hot enough to soften the chains in about eight hours. You will arrive a lot sooner. The chains will be fine.', 'Still lava. You are still approaching it.', 'You lean toward the warmth. Cosy. Fatal, but cosy.']
  },
  {
    id: 'stop',
    names: ['STOP button'],
    hover: 'Press STOP',
    responses: [
      'A big STOP button. 2.8 metres away. It might as well be on the moon.',
      'You lean toward the button. The chair does not lean. You un-lean.',
      'The button glows invitingly. Buttons do that. It is their whole thing.'
    ]
  },
  {
    id: 'skeleton',
    names: ['Skeleton'],
    hover: 'Ask for advice',
    responses: [
      'The previous captive. He had a lockpick. You can tell, because he is still smiling about it.',
      'He does not answer. Professional courtesy.',
      'You notice his chair was also metal. You notice a pattern.'
    ]
  },
  {
    id: 'rat',
    names: ['Rat'],
    hover: 'Befriend the rat',
    responses: [
      'A rat. With a key on its back. It is not your key. It is not your rat.',
      'The rat looks at you. The rat looks at the door. The rat leaves. Through the bars.',
      'You make the noise people make at rats. The rat is not fooled.'
    ]
  },
  {
    id: 'crates',
    names: ['Spare parts crate', 'Spare parts crate 2', 'Spare parts crate 3'],
    hover: 'Search the crates',
    responses: [
      'SPARE PARTS, says the crate. Belts, rollers, bolts. Probably a wrench in there too. Probably.',
      'The crates are nailed shut. Whoever packed them had a hammer. You have a chair.',
      'Somewhere in there is the part that would stop this belt. It is staying in there.'
    ]
  },
  {
    id: 'console',
    names: ['Control console'],
    hover: 'Check the console',
    responses: [
      'The conveyor console. The screen says RUNNING. It is not wrong.',
      'There is a big green button on it. Green means go. It is already going.',
      'You could reprogram it in about four minutes. With your hands. Which are chained.'
    ]
  },
  { id: 'sign', names: ['Danger sign'], hover: 'Read the sign', responses: ["'DANGER: LAVA'. Noted.", 'You read it again. Same words. Good sign, very clear.'] },

  // Level 3 - The Tank
  {
    id: 'tank',
    names: range('Tank post', 4),
    hover: 'Break the glass',
    responses: [
      'Thick glass. The shark looks at you. You look at the shark. One of you is tied to a chair.',
      "It is the shark's tank. It seems happy with it.",
      'Forty millimetres of glass. You know this because it says so on a little plaque.'
    ]
  },
  {
    id: 'shark',
    names: ['Shark'],
    hover: 'Reason with the shark',
    responses: ['It is a shark.', 'It is still a shark. Charisma {C} does not apply to sharks.', 'The shark opens its mouth. It is not a smile. You decide it is a smile.']
  },
  {
    id: 'gate',
    names: ['Tank gate'],
    hover: 'Hold the gate shut',
    responses: [
      'A vault door. You would hold it shut. It is four metres away, through chest-deep water, and your hands are tied. Three problems.',
      'The gate is counting down too. Gates are patient.'
    ]
  },
  { id: 'raft', names: ['Dock A', 'Dock B'], hover: 'Climb onto the dock', responses: ['A dry dock. Stable, shark-proof, five metres away. Three good qualities and one bad one.', 'The man on the dock waves. Politely.'] },
  {
    id: 'lever',
    names: ['Lever'],
    hover: 'Pull the lever',
    responses: [
      'THE lever. Stops the gate. Five metres away, on a dock. You look at it very, very hard.',
      'The lever remains unpulled. You remain tied. The shark remains a shark.',
      'Strength {S} would be plenty to pull it. Reach is the problem. Reach is always the problem.'
    ]
  },
  { id: 'bait', names: ['Bait bucket'], hover: 'Throw the bait', responses: ['Bait. For the shark. Not for you. Also on the dock, next to the man with the lever.', 'The worms wriggle. The shark is interested. Not in the worms.'] },
  { id: 'clock', names: ['Countdown board'], hover: 'Stop the clock', responses: ['The sign is counting down. You are counting too. Nothing else is happening.', 'The clock does not take requests.'] }
]

const counters: Record<string, number> = {}
let propClickListener: ((id: string) => void) | null = null

export function onPropClicked(listener: (id: string) => void) {
  propClickListener = listener
}

/** Wire hover text + responses onto the composite entities. Call from main(): the composite is loaded by then. */
export function setupInteractions() {
  let wired = 0
  for (const it of INTERACTIONS) {
    for (const name of it.names) {
      const e = prop(name)
      if (!e) continue
      wired++
      pointerEventsSystem.onPointerDown(
        { entity: e, opts: { button: InputAction.IA_POINTER, hoverText: it.hover, maxDistance: 18 } },
        () => {
          if (game.phase !== 'playing') return
          const n = counters[it.id] ?? 0
          counters[it.id] = n + 1
          game.counters.propClicks++
          showToast(it.responses[n % it.responses.length])
          if (propClickListener) propClickListener(it.id)
        }
      )
    }
  }
  console.log(`Locksmith: ${wired} interactive props wired`)
}
