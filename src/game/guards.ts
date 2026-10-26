// The two guards: avatar-look NPCs that stand near the chair and talk about having searched you.
// They are code entities because they change rooms between levels. Moving an AvatarShape makes the
// Explorer animate it walking/running to the new spot, so a room change REBUILDS the guard entities
// instead (a fresh entity appears in place). Room positions are local and offset by the level origin.

import { engine, Entity, Transform, AvatarShape, AvatarNametag, MeshCollider, ColliderLayer, pointerEventsSystem, InputAction, Name, TextShape, TextAlignMode, Billboard, BillboardMode, VisibilityComponent, MeshRenderer, Material, MaterialTransparencyMode } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color3, Color4 } from '@dcl/sdk/math'
import { game } from './state'
import { toWorld } from './room'

export const GUARD_1 = 'Knuckles'
export const GUARD_2 = 'Crowbar'
/** AvatarShape ids of the thugs (kept visible by the solo-view areas). */
export const GUARD_IDS = ['thug-0001', 'thug-0002']

/** True for speakers that have a body in the room (their lines show as a speech bubble, not on screen). */
export function isGuard(speaker: string): boolean {
  return speaker === GUARD_1 || speaker === GUARD_2
}

const FACE_WEARABLES = [
  'urn:decentraland:off-chain:base-avatars:eyebrows_00',
  'urn:decentraland:off-chain:base-avatars:mouth_00',
  'urn:decentraland:off-chain:base-avatars:eyes_00'
]

/** What a thug says when you click him (shown in his own speech bubble). */
const TALK_RESPONSES = [
  "What? No. Whatever it is, no.",
  "Rights? Not in here, pal. This place is outside every jurisdiction. We checked.",
  "A lockpick? Sure. Right after you stop asking.",
  "You can stop smiling at me. I'm not untying anything.",
  "Ask nicely all you want. Still a chair."
]

interface GuardLook {
  id: string
  wearables: string[]
  hair: Color3
  skin: Color3
}

// Base-avatar wearables, verified against the live base-avatars collection (2026-10-23).
const BASE = 'urn:decentraland:off-chain:base-avatars:'
const LOOKS: Record<string, GuardLook> = {
  [GUARD_1]: {
    // The nametag shows the last four characters of the id as a hash tag; keep them digit-like.
    id: 'thug-0001',
    wearables: [`${BASE}black_jacket`, `${BASE}distressed_black_Jeans`, `${BASE}sport_black_shoes`, `${BASE}slicked_hair`, `${BASE}horseshoe_beard`, `${BASE}black_sun_glasses`],
    hair: Color3.create(0.05, 0.05, 0.06),
    skin: Color3.create(0.78, 0.58, 0.45)
  },
  [GUARD_2]: {
    id: 'thug-0002',
    wearables: [`${BASE}sleeveless_punk_shirt`, `${BASE}trash_jean`, `${BASE}sneakers`, `${BASE}pompous`, `${BASE}goatee_beard`, `${BASE}thug_life`],
    hair: Color3.create(0.06, 0.05, 0.05),
    skin: Color3.create(0.9, 0.72, 0.6)
  }
}

/** Where each guard stands per level (room coordinates). Absent = not in that room. */
const POSTS: Record<number, Array<{ name: string; local: Vector3; yaw: number }>> = {
  1: [
    { name: GUARD_1, local: Vector3.create(10.9, 0, 12), yaw: 180 },
    { name: GUARD_2, local: Vector3.create(13.3, 0, 12.2), yaw: 180 }
  ],
  2: [],
  // On the dock deck (dock modules at y 0.3, deck ~0.95 above their origin).
  3: [{ name: GUARD_2, local: Vector3.create(21.6, 1.25, 10.9), yaw: 235 }]
}

// Speech bubble geometry (metres). The texture is assets/images/speech_bubble.png (1024 x 512, tail at the bottom centre).
const BUBBLE_TEXTURE = 'assets/images/speech_bubble.png'
const BUBBLE_W = 3.2
const BUBBLE_HEIGHT = 2.35 + BUBBLE_W / 4 // tail tip just above the nametag
const BUBBLE_FONT = 1.7

const guards = new Map<string, Entity>()
const bubbles = new Map<string, Entity>()
let guardLevel = 0
let talkCount = 0
let talkListener: ((guard: string, line: string) => void) | null = null

/** Called when the player clicks a thug, with the line he answers. The director shows it in his bubble. */
export function onGuardTalked(listener: (guard: string, line: string) => void) {
  talkListener = listener
}

function createGuard(name: string, position: Vector3, yawDeg: number) {
  const look = LOOKS[name]
  const e = engine.addEntity()
  Name.create(e, { value: `Guard ${name}` })
  Transform.create(e, { position, rotation: Quaternion.fromEulerDegrees(0, yawDeg, 0) })
  AvatarShape.create(e, {
    id: look.id,
    name,
    bodyShape: 'urn:decentraland:off-chain:base-avatars:BaseMale',
    wearables: [...FACE_WEARABLES, ...look.wearables],
    emotes: [],
    hairColor: look.hair,
    skinColor: look.skin
  })
  // Custom plate above the nametag.
  AvatarNametag.create(e, { label: 'THUG', labelColor: Color3.create(1, 0.9, 0.8), backgroundColor: Color3.create(0.45, 0.08, 0.06) })

  // Avatars have no collider: an invisible box makes the guard clickable.
  const hitbox = engine.addEntity()
  Name.create(hitbox, { value: `Guard ${name} hitbox` })
  Transform.create(hitbox, { parent: e, position: Vector3.create(0, 0.95, 0), scale: Vector3.create(0.7, 1.9, 0.6) })
  MeshCollider.setBox(hitbox, ColliderLayer.CL_POINTER)
  pointerEventsSystem.onPointerDown(
    { entity: hitbox, opts: { button: InputAction.IA_POINTER, hoverText: 'Talk', maxDistance: 18 } },
    () => {
      if (game.phase !== 'playing') return
      game.counters.propClicks++
      const line = TALK_RESPONSES[talkCount % TALK_RESPONSES.length]
      talkCount++
      if (talkListener) talkListener(name, line)
    }
  )
  guards.set(name, e)

  // Speech bubble above the head: a comic-style cream bubble (textured plane with a tail pointing at the
  // guard) and the line in dark text, each billboarded toward the player. Hidden until the guard talks.
  // (A hidden parent did not hide the children in the Explorer, so each part carries its own VisibilityComponent.)
  const bubble = engine.addEntity()
  Name.create(bubble, { value: `Guard ${name} bubble` })
  Transform.create(bubble, { parent: e, position: Vector3.create(0, BUBBLE_HEIGHT, 0) })
  const plate = engine.addEntity()
  Name.create(plate, { value: `Guard ${name} bubble plate` })
  // The plane is 2:1 like the texture; the tail tip is its bottom edge.
  Transform.create(plate, { parent: bubble, position: Vector3.create(0, 0, -0.03), scale: Vector3.create(BUBBLE_W, BUBBLE_W / 2, 1) })
  MeshRenderer.setPlane(plate)
  Material.setPbrMaterial(plate, {
    texture: Material.Texture.Common({ src: BUBBLE_TEXTURE }),
    emissiveTexture: Material.Texture.Common({ src: BUBBLE_TEXTURE }),
    emissiveColor: Color3.create(0.55, 0.55, 0.55),
    emissiveIntensity: 1,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    metallic: 0,
    roughness: 1
  })
  Billboard.create(plate, { billboardMode: BillboardMode.BM_Y })
  VisibilityComponent.create(plate, { visible: false })
  const text = engine.addEntity()
  Name.create(text, { value: `Guard ${name} bubble text` })
  // Centre of the rounded box in the texture (rows 30-380 of 512) relative to the plane centre.
  Transform.create(text, { parent: bubble, position: Vector3.create(0, BUBBLE_W / 2 * (0.5 - 205 / 512), 0) })
  TextShape.create(text, {
    text: '',
    fontSize: BUBBLE_FONT,
    textColor: Color4.create(0.15, 0.1, 0.07, 1),
    outlineColor: Color4.create(0.15, 0.1, 0.07, 1),
    outlineWidth: 0,
    textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
    textWrapping: true,
    width: BUBBLE_W * 0.86,
    height: BUBBLE_W / 2 * (350 / 512)
  })
  Billboard.create(text, { billboardMode: BillboardMode.BM_Y })
  VisibilityComponent.create(text, { visible: false })
  bubbles.set(name, bubble)
}

function destroyGuards() {
  for (const e of guards.values()) engine.removeEntityWithChildren(e)
  guards.clear()
  bubbles.clear()
}

export function createGuards() {
  setGuardsForLevel(1)
}

/** Put the guards at their posts for `level`. Rebuilds them, so nobody is seen walking between rooms. */
export function setGuardsForLevel(level: number) {
  if (level === guardLevel && guards.size > 0) return
  guardLevel = level
  destroyGuards()
  for (const post of POSTS[level] ?? []) createGuard(post.name, toWorld(level, post.local), post.yaw)
}

export function setTalking(speaker: string | null, text: string = '') {
  for (const [name, e] of guards) {
    const talking = speaker === name && text !== ''
    const shape = AvatarShape.getMutableOrNull(e)
    if (shape) shape.talking = speaker === name
    const bubble = bubbles.get(name)
    if (!bubble) continue
    for (const [child] of engine.getEntitiesWith(Transform)) {
      if (Transform.get(child).parent !== bubble) continue
      const vis = VisibilityComponent.getMutableOrNull(child)
      if (vis) vis.visible = talking
      const ts = TextShape.getMutableOrNull(child)
      if (ts) ts.text = talking ? text : ''
    }
  }
}
