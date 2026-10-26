// The tied-up player: freeze, seat, emotes, the chains and the clickable padlock.

import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  ColliderLayer,
  pointerEventsSystem,
  inputSystem,
  InputAction,
  PointerEventType,
  InputModifier,
  AvatarEmoteCommand,
  EmoteState,
  Name,
  AvatarAttach,
  AvatarAnchorPointType,
  AudioSource,
  GltfContainer
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion } from '@dcl/sdk/math'
import { triggerEmote, triggerSceneEmote, movePlayerTo } from '~system/RestrictedActions'
import { game, showToast } from './state'
import { seatLocal, toWorld } from './room'
import { LOCK_RESPONSES, LOCK_RESPONSE_LUCK, LOCK_RESPONSE_MAX_LOCKPICKING, SHAKE_RESPONSES, SHAKE_RESPONSE_STRONG } from './content'

/**
 * Emote table. Swap an entry for a custom clip once it exists:
 *   { kind: 'scene', src: 'assets/animations/tied_idle_emote.glb', loop: true }
 * The file name MUST end in `_emote.glb`.
 */
export type EmoteRef = { kind: 'builtin'; id: string } | { kind: 'scene'; src: string; loop: boolean }
export const EMOTES: { seated: EmoteRef; shake: EmoteRef | null } = {
  seated: { kind: 'builtin', id: 'sittingChair2' }, // loops: holds the pose. Variant 1 crossed the legs (owner: too casual).
  // Seated chain struggle authored on the official rig (scratchpad emote/build_shake.py, headless Blender 5.1):
  // starts and ends in a seat matching sittingChair2 (hips 0.65 m, lean, hands on the thighs), 44 frames at 30 fps.
  // When it finishes the reseat system replays the seated pose.
  shake: { kind: 'scene', src: 'assets/animations/chain_struggle_emote.glb', loop: false }
}
/** Length of the shake clip: (45 - 1) / 30 fps. */
const SHAKE_SECONDS = 1.47
/** Height of the waist band above the hip joint (the joint sits at seat height when seated). */
const WAIST_Y = 0.2

/**
 * Avatar-space offset (x right, y up, z forward) expressed in the hip bone's frame. Measured in the Explorer
 * (2026-10-24, sittingChair2): the AAPT_HIP anchor is rolled 180 degrees about its z axis relative to the avatar,
 * so its local x points to the avatar's left and its local y points down; z is forward.
 */
function hipLocal(wx: number, wy: number, wz: number): Vector3 {
  return Vector3.create(-wx, -wy, wz)
}
const RATTLE_SFX = 'assets/Audio/chain-rattle.ogg'
const LOCK_SFX = 'assets/Audio/lock-click.mp3'
let rattle = engine.RootEntity
let lockClick = engine.RootEntity

/** The seated avatar faces +Z (toward the guards / the door / the tank). */
const FACE_OFFSET = Vector3.create(0, 1, 6)
// Look a little to the left so the third-person camera settles behind and to the RIGHT of the chair: from there
// the padlock on the right hip is clear of the chair's back frame. (The player can still orbit.)
const CAMERA_OFFSET = Vector3.create(-1.7, 1.1, 4.6)

let seated = false
let reseatAt = 0
let shakeUntil = 0
let lastEmoteRequestAt = -10
let lockUses = 0
let shakeUses = 0
let lockListener: (() => void) | null = null
let shakeListener: (() => void) | null = null

export function onLockUsed(listener: () => void) {
  lockListener = listener
}
export function onChainsShaken(listener: () => void) {
  shakeListener = listener
}

function playEmote(ref: EmoteRef) {
  lastEmoteRequestAt = game.now
  if (ref.kind === 'builtin') void triggerEmote({ predefinedEmote: ref.id })
  else void triggerSceneEmote({ src: ref.src, loop: ref.loop })
}

export function freezePlayer() {
  InputModifier.createOrReplace(engine.PlayerEntity, {
    mode: InputModifier.Mode.Standard({ disableAll: true })
  })
}

/** World position of the seat for the current level (level 1 before the game starts). */
export function seatWorld(): Vector3 {
  const level = game.level >= 1 ? game.level : 1
  return toWorld(level, seatLocal(level))
}

/**
 * Where the camera looks after seating. Level 3 frames both the thug on the dock (right) and the shark tank
 * (ahead) from the start; elsewhere the camera settles behind-right of the chair so the padlock is visible.
 */
const L3_CAMERA_LOOK = Vector3.create(18.5, 1.4, 15)
function cameraLook(seat: Vector3): Vector3 {
  if (game.level === 3) return toWorld(3, L3_CAMERA_LOOK)
  return Vector3.add(seat, CAMERA_OFFSET)
}

/** Teleport the player onto the chair and play the seated emote. Safe to call repeatedly. */
export async function seatPlayer(withCamera: boolean = true) {
  freezePlayer()
  const seat = seatWorld()
  await movePlayerTo({
    newRelativePosition: seat,
    avatarTarget: Vector3.add(seat, FACE_OFFSET),
    cameraTarget: withCamera ? cameraLook(seat) : undefined
  })
  seated = true
  reseatAt = game.now + 0.3
}

/**
 * Level 2: the belt carries the pallet the player stands on. Moving colliders carry avatars in the
 * Explorer; this is the fallback if that drifts: snap back when more than `tolerance` away.
 * Unverified in-world (2026-10-23).
 */
export function keepOnSeat(tolerance: number = 0.35) {
  const t = Transform.getOrNull(engine.PlayerEntity)
  if (!t) return
  const seat = seatWorld()
  const d = Vector3.distance(Vector3.create(t.position.x, 0, t.position.z), Vector3.create(seat.x, 0, seat.z))
  if (d > tolerance) void seatPlayer(false)
}

export function isSeated() {
  return seated
}

export function shakeChains() {
  if (game.phase !== 'playing') return
  if (game.now < shakeUntil) return
  shakeUntil = game.now + SHAKE_SECONDS + 0.2
  game.counters.shakes++
  AudioSource.playSound(rattle, RATTLE_SFX)
  if (EMOTES.shake) {
    playEmote(EMOTES.shake)
    reseatAt = game.now + SHAKE_SECONDS
  }

  let line = SHAKE_RESPONSES[shakeUses % SHAKE_RESPONSES.length]
  if (game.stats.Strength >= 3 && shakeUses % 3 === 2) line = SHAKE_RESPONSE_STRONG
  shakeUses++
  showToast(line)
  if (shakeListener) shakeListener()
}

export function useLockpick() {
  if (game.phase !== 'playing') return
  game.counters.lockAttempts++
  AudioSource.playSound(lockClick, LOCK_SFX)
  let line = LOCK_RESPONSES[lockUses % LOCK_RESPONSES.length]
  if (game.stats.Lockpicking >= 12 && lockUses % 4 === 1) line = LOCK_RESPONSE_MAX_LOCKPICKING
  else if (game.stats.Luck >= 1 && lockUses % 5 === 3) line = LOCK_RESPONSE_LUCK
  lockUses++
  showToast(line)
  if (lockListener) lockListener()
}

/** An invisible entity riding an avatar bone. Parts are children: the Explorer ignores a Transform
 *  offset on the AvatarAttach entity itself, but children inherit the bone's placement normally. */
function boneRoot(name: string, anchor: AvatarAnchorPointType): Entity {
  const e = engine.addEntity()
  Name.create(e, { value: name })
  Transform.create(e, {})
  AvatarAttach.create(e, { anchorPointId: anchor })
  return e
}

function part(name: string, parent: Entity, position: Vector3, scale: Vector3, color: Color4, shape: 'box' | 'cylinder' = 'box'): Entity {
  const e = engine.addEntity()
  Name.create(e, { value: name })
  Transform.create(e, { parent, position, scale })
  if (shape === 'box') MeshRenderer.setBox(e)
  else MeshRenderer.setCylinder(e)
  Material.setPbrMaterial(e, { albedoColor: color, metallic: 0.9, roughness: 0.35 })
  return e
}

/**
 * Chains and the padlock ride the avatar's bones (AvatarAttach), so they follow the seated pose and the shake.
 * The padlock locks a waist chain at the right hip, which the default third-person camera can see and click.
 */
export function createRestraints() {
  // Sounds for the two verbs, on the player so they follow between rooms.
  rattle = engine.addEntity()
  Name.create(rattle, { value: 'Chain rattle sound' })
  Transform.create(rattle, { parent: engine.PlayerEntity })
  AudioSource.create(rattle, { audioClipUrl: RATTLE_SFX, playing: false, volume: 0.9 })
  lockClick = engine.addEntity()
  Name.create(lockClick, { value: 'Lock click sound' })
  Transform.create(lockClick, { parent: engine.PlayerEntity })
  AudioSource.create(lockClick, { audioClipUrl: LOCK_SFX, playing: false, volume: 0.8 })

  const iron = Color4.create(0.3, 0.31, 0.35, 1)
  const brass = Color4.create(0.78, 0.6, 0.22, 1)
  const steel = Color4.create(0.75, 0.76, 0.8, 1)

  // A band around the chest.
  const chest = boneRoot('Chest chain root', AvatarAnchorPointType.AAPT_SPINE2)
  part('Chest chain front', chest, Vector3.create(0, 0, 0.14), Vector3.create(0.36, 0.05, 0.04), iron)
  part('Chest chain back', chest, Vector3.create(0, 0, -0.14), Vector3.create(0.36, 0.05, 0.04), iron)
  part('Chest chain left', chest, Vector3.create(-0.18, 0, 0), Vector3.create(0.04, 0.05, 0.3), iron)
  part('Chest chain right', chest, Vector3.create(0.18, 0, 0), Vector3.create(0.04, 0.05, 0.3), iron)
  // Wrists.
  part('Wrist chain right', boneRoot('Right wrist root', AvatarAnchorPointType.AAPT_RIGHT_HAND), Vector3.Zero(), Vector3.create(0.1, 0.05, 0.1), iron)
  part('Wrist chain left', boneRoot('Left wrist root', AvatarAnchorPointType.AAPT_LEFT_HAND), Vector3.Zero(), Vector3.create(0.1, 0.05, 0.1), iron)

  // A waist chain around the hips, locked at the right hip: the padlock hangs upright on the right side of the
  // waist, above the seat and behind the resting arm, where the default camera (behind and above) sees it.
  // Offsets are given in avatar space (x right, y up, z forward) and mapped onto the hip bone with hipLocal().
  const waist = boneRoot('Waist chain root', AvatarAnchorPointType.AAPT_HIP)
  const band = (name: string, wx: number, wz: number, sx: number, sz: number) =>
    part(name, waist, hipLocal(wx, WAIST_Y, wz), Vector3.create(sx, 0.05, sz), iron)
  band('Waist chain front', 0, 0.13, 0.34, 0.04)
  band('Waist chain back', 0, -0.13, 0.34, 0.04)
  band('Waist chain left', -0.17, 0, 0.04, 0.28)
  band('Waist chain right', 0.17, 0, 0.04, 0.28)
  // The lock: one GLB (tools/props) hanging from a short link out of the band, so the hover outline wraps the
  // whole lock rather than one primitive at a time. Its origin is the hang ring; it hangs along -y.
  const LX = 0.27 // right of the hip joint: outside the chair's back frame, so the camera behind sees it
  const LZ = 0.06 // a little forward, clear of the chair's back frame
  part('Padlock link', waist, hipLocal(0.22, WAIST_Y, LZ), Vector3.create(0.11, 0.03, 0.03), iron)
  const lock = engine.addEntity()
  Name.create(lock, { value: 'Padlock' })
  // The hip anchor is rolled 180 degrees about z (see hipLocal), so the model is rolled back the same way to hang down.
  Transform.create(lock, { parent: waist, position: hipLocal(LX, WAIST_Y, LZ), rotation: Quaternion.fromEulerDegrees(0, 0, 180) })
  GltfContainer.create(lock, { src: 'assets/Models/padlock.glb', visibleMeshesCollisionMask: ColliderLayer.CL_POINTER, invisibleMeshesCollisionMask: 0 })
  pointerEventsSystem.onPointerDown(
    { entity: lock, opts: { button: InputAction.IA_POINTER, hoverText: 'Use lockpick', maxDistance: 16 } },
    () => useLockpick()
  )

  return lock
}

/** E shakes the chains; keeps the player seated; re-seats after a shake. */
export function setupPlayerSystems() {
  AvatarEmoteCommand.onChange(engine.PlayerEntity, (cmd) => {
    if (!cmd || !seated) return
    const state = cmd.state ?? EmoteState.ES_STARTED
    if (state !== EmoteState.ES_FINISHED && state !== EmoteState.ES_INTERRUPTED) return
    // Our own re-trigger of the looping pose reports the previous one as interrupted: ignore that,
    // or we would re-seat forever. Anything else that ended the pose (a teleport) gets a re-seat.
    if (game.now - lastEmoteRequestAt < 1.0) return
    if (reseatAt === 0 || reseatAt < game.now) reseatAt = game.now + 0.2
  })

  engine.addSystem(() => {
    if (game.phase === 'playing' && inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN)) {
      shakeChains()
    }
    if (seated && reseatAt > 0 && game.now >= reseatAt && game.now >= shakeUntil) {
      reseatAt = 0
      playEmote(EMOTES.seated)
    }
  })
}
