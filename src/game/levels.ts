// The director: level timelines, dangers, transitions and the ending.

import { engine, Entity, Transform, TextShape, AudioSource, Name, Animator, TouchScreenControls, SkyboxTime, TransitionMode, VirtualCamera, MainCamera, inputSystem, InputAction, PointerEventType } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { game, say, clearDialogue, showToast, resetRun, formatClock, lineSeconds, Phase, fillStats, DialogueLine } from './state'
import { introCaption, LEVELS } from './content'
import { prop, onPropClicked, toWorld, BELT_CHAIR_START } from './room'
import { seatPlayer, seatWorld, keepOnSeat, onLockUsed, onChainsShaken } from './player'
import { setGuardsForLevel, setTalking, onGuardTalked, GUARD_1, GUARD_2 } from './guards'

const PA = 'PA SYSTEM'
const VOICE = 'INTERCOM'

interface TimedEvent {
  t: number
  run: () => void
}
interface Scheduled {
  at: number
  run: () => void
}

let events: TimedEvent[] = []
let nextEvent = 0
let scheduled: Scheduled[] = []
let reacted: Record<string, boolean> = {}
let hintIndex = 0
let sharkDir = 1
let gateOpened = false
let sharkBiting = false
let sharkLeg = 0
let beltRunning = false
let lastSeatCheck = 0
let beltStoppedAt = 0
// Cinematic shots (VirtualCamera) at key moments; one camera entity, reused.
let cineCam = engine.RootEntity
let cineTarget = engine.RootEntity
let cineActive = false
let cineUntil = 0
let cineDone: (() => boolean) | null = null
let lavaShot = false
let sharkShot = false
// Flying the shot camera home before releasing it: the engine's own blend back passed through an odd
// intermediate pose, so the scripted camera first glides to where the player camera sits, then lets go.
let cineReturning = false
let cineReturnT = 0
let cineReturnFrom = Vector3.Zero()
let cineReturnTargetFrom = Vector3.Zero()
let cineSubject: Entity = engine.RootEntity
let cineSubjectOffset = Vector3.Zero()
const CINE_RETURN_SECONDS = 0.9
let cineHomePos = Vector3.Zero()
let cineHomeLook = Vector3.Zero()
/** Where the third-person camera sits relative to the seated player (measured in the Explorer with CAMERA_OFFSET). */
const HOME_CAMERA_DELTA = Vector3.create(1.5, 2.28, -4.05)
const HOME_LOOK_DELTA = Vector3.create(-0.23, 2.03, 0.64)

const LEVEL_DURATION = [0, 120, 122, 150] // about two minutes each; level 3 ends by the shark cut (~118 s), the duration is a safety net
const SKYBOX_FIXED_TIME = 68400 // 19:00, dusk: torches matter
/** DEBUG ONLY: 0 = normal flow; 1..3 skips the title and starts that level 2 s after load. Set 0 to ship. */
const DEBUG_START_LEVEL = 0
const TITLE_SFX = 'assets/Audio/chest-close.mp3'
const SCREAM_SFX = 'assets/Audio/wilhelm.ogg'
const MUSIC = 'assets/Audio/spy-glass-loop.ogg' // "Spy Glass" by Kevin MacLeod (incompetech.com), CC BY 4.0: 64.6 s crossfaded loop of the steady section
const CLUNK_SFX = 'assets/Audio/clunk.ogg'
const HINT_SECONDS = 8
const HINT_GAP_SECONDS = 24
const QUIET_AFTER_DIALOGUE = 6
const DIALOGUE_GAP = 1.5
let sfx = engine.RootEntity
let scream = engine.RootEntity
let music = engine.RootEntity
let clunk = engine.RootEntity

// Level 2: the belt. Off at first; the PA switches it on and it crawls toward the lava.
const BELT_START_AT = 10
const BELT_SPEED = 0.107 // m/s. Very slowly: the pallet reaches the edge of the pit at ~110 s.
const BELT_MIN_X = 6.0
const SLAT_COUNT = 15
const SLAT_STEP = 0.95
const BELT_SPAN = SLAT_COUNT * SLAT_STEP
const PALLET_END_X = 19.2 // the belt jams with the pallet's front edge just over the pit
const LAVA_EDGE_X = 19.6

// Level 3: the shark.
const SHARK_MIN_X = 10.5
const SHARK_MAX_X = 17.5
const SHARK_SPEED = 1.1
const SHARK_TANK_POS = Vector3.create(14, 1.7, 24.2)
// Released: line up with the gate inside the tank, swim straight out through it, clear the door, then the chair.
// The shark turns in place at each waypoint before it swims on (see updateLevel3), so it never crosses the gate at an angle.
const SHARK_PATH = [Vector3.create(14, 1.4, 23.4), Vector3.create(14, 1.0, 21.9), Vector3.create(14, 0.75, 20.0), Vector3.create(14, 0.75, 8.6)]
const SHARK_ALIGN_DEG = 10 // swim only once the nose is within this many degrees of the leg direction
const SHARK_CUT_DISTANCE = 1.3 // cut to black just before the bite (the nose is ~1 m ahead of the centre)
const SHARK_RELEASE_AT = 100

function schedule(delay: number, run: () => void) {
  scheduled.push({ at: game.now + delay, run })
}

function once(key: string, run: () => void) {
  const k = `${game.level}:${key}`
  if (reacted[k]) return
  reacted[k] = true
  run()
}

/** Show a line right now, interrupting whatever is on screen. Used for lines whose text is a live number. */
function sayNow(speaker: string, text: string, isReply: boolean = false) {
  if (game.endingSoon) return
  const t = fillStats(text)
  game.dialogue = { speaker, text: t, seconds: lineSeconds(t) }
  game.dialogueUntil = game.now + game.dialogue.seconds
  game.hint = ''
  game.nextHintAt = Math.max(game.nextHintAt, game.dialogueUntil + QUIET_AFTER_DIALOGUE)
  setTalking(speaker, t)
  if (!isReply) noteLineStarted(game.dialogue)
}

// ---------- Exchanges ----------
// Lines written as a back-and-forth (a question and its answer, a set-up and its punchline) share an exchange
// id. If the player interrupts one, the exchange is replayed from its first line afterwards, so an answer is
// never heard without its question. Lines outside any exchange just resume.
const EX_SIZE: Record<string, number> = {}
let exShown: Record<string, DialogueLine[]> = {}
let lastShownEx = ''

/** Queue a line that belongs to exchange `ex` (of `size` lines in total). */
function sx(ex: string, size: number, speaker: string, text: string) {
  EX_SIZE[ex] = size
  say(speaker, text)
  game.dialogueQueue[game.dialogueQueue.length - 1].ex = ex
}

function noteLineStarted(line: DialogueLine) {
  lastShownEx = line.ex ?? ''
  if (!line.ex) return
  const shown = (exShown[line.ex] = exShown[line.ex] ?? [])
  if (shown.length >= (EX_SIZE[line.ex] ?? 1)) shown.length = 0 // a finished exchange starting over
  shown.push(line)
}

/**
 * Cut to a scripted camera for a key moment. The camera sits at `local` (room coordinates of `level`) and
 * keeps looking at `lookAt.entity` (plus an offset); the shot ends when `done` returns true or after `maxSeconds`,
 * and the view blends back to the player's own camera. One shot at a time.
 */
function startShot(level: number, local: Vector3, lookAt: { entity: Entity; offset?: Vector3 }, maxSeconds: number, done: (() => boolean) | null) {
  const cam = Transform.getMutable(cineCam)
  cam.position = toWorld(level, local)
  const target = Transform.getMutable(cineTarget)
  target.parent = lookAt.entity
  target.position = lookAt.offset ?? Vector3.Zero()
  cineSubject = lookAt.entity
  cineSubjectOffset = lookAt.offset ?? Vector3.Zero()
  cineReturning = false
  // Remember where the player's camera was, so the shot can glide back to exactly that pose.
  const home = Transform.getOrNull(engine.CameraEntity)
  if (home) {
    cineHomePos = Vector3.clone(home.position)
    cineHomeLook = Vector3.add(home.position, Vector3.scale(Vector3.rotate(Vector3.Forward(), home.rotation), 6))
  } else {
    const seat = seatWorld()
    cineHomePos = Vector3.add(seat, HOME_CAMERA_DELTA)
    cineHomeLook = Vector3.add(seat, HOME_LOOK_DELTA)
  }
  VirtualCamera.createOrReplace(cineCam, {
    lookAtEntity: cineTarget,
    fov: 48,
    defaultTransition: { transitionMode: VirtualCamera.Transition.Time(1.2) }
  })
  MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: cineCam })
  cineActive = true
  cineUntil = game.now + maxSeconds
  cineDone = done
  console.log(`Locksmith cine: shot start t=${game.now.toFixed(2)}`)
}

/**
 * End the shot. By default the scripted camera first glides to the player camera's spot (CINE_RETURN_SECONDS),
 * then the view is released, so the engine's blend back has nothing to jump across. `immediate` releases now
 * (level transitions, where the screen is black anyway).
 */
function endShot(immediate: boolean = false) {
  if (cineActive) {
    cineActive = false
    cineDone = null
    if (!immediate) {
      const cam = Transform.get(cineCam)
      cineReturnFrom = Vector3.clone(cam.position)
      // Freeze the look target where the subject is right now (subjects are children of the level root).
      const subject = Transform.getOrNull(cineSubject)
      const local = subject ? Vector3.add(subject.position, cineSubjectOffset) : Vector3.Zero()
      cineReturnTargetFrom = toWorld(game.level, local)
      const target = Transform.getMutable(cineTarget)
      target.parent = engine.RootEntity
      target.position = cineReturnTargetFrom
      cineReturning = true
      cineReturnT = 0
      console.log(`Locksmith cine: glide home t=${game.now.toFixed(2)}`)
      return
    }
  }
  if (!cineActive && !cineReturning && !immediate) return
  cineReturning = false
  const main = MainCamera.getMutableOrNull(engine.CameraEntity)
  if (main) main.virtualCameraEntity = undefined
  console.log(`Locksmith cine: released t=${game.now.toFixed(2)}`)
}

/** Glide the shot camera home, then release the view. */
function updateCineReturn(dt: number) {
  if (!cineReturning) return
  cineReturnT += dt
  const k = Math.min(1, cineReturnT / CINE_RETURN_SECONDS)
  const e = k * k * (3 - 2 * k) // smoothstep
  Transform.getMutable(cineCam).position = Vector3.lerp(cineReturnFrom, cineHomePos, e)
  Transform.getMutable(cineTarget).position = Vector3.lerp(cineReturnTargetFrom, cineHomeLook, e)
  if (k >= 1) endShot(true)
}

function setMusic(on: boolean) {
  const src = AudioSource.getMutableOrNull(music)
  if (src) src.playing = on
}

function setPhase(phase: Phase) {
  game.phase = phase
  // The tick-tock runs only while a countdown is running.
  setMusic(phase === 'playing')
  const modal = phase === 'title' || phase === 'stats' || phase === 'tutorial' || phase === 'ending'
  // Full-screen cards hide the mobile touch controls; gameplay shows them again (no-ops on desktop).
  if (modal) {
    TouchScreenControls.hideAll()
    TouchScreenControls.hideJoystick()
  } else {
    TouchScreenControls.showAll()
    TouchScreenControls.showJoystick()
  }
}

// ---------- Public flow ----------

export function setupDirector() {
  // The "LOCKSMITH" title hit between levels. One entity, one clip, follows the player.
  sfx = engine.addEntity()
  Name.create(sfx, { value: 'Title sound' })
  Transform.create(sfx, { parent: engine.PlayerEntity })
  AudioSource.create(sfx, { audioClipUrl: TITLE_SFX, playing: false, volume: 1 })
  scream = engine.addEntity()
  Name.create(scream, { value: 'Scream sound' })
  Transform.create(scream, { parent: engine.PlayerEntity })
  AudioSource.create(scream, { audioClipUrl: SCREAM_SFX, playing: false, volume: 1 })
  cineCam = engine.addEntity()
  Name.create(cineCam, { value: 'Cinematic camera' })
  Transform.create(cineCam, { position: Vector3.create(8, 2, 8) })
  cineTarget = engine.addEntity()
  Name.create(cineTarget, { value: 'Cinematic look target' })
  Transform.create(cineTarget, {})

  music = engine.addEntity()
  Name.create(music, { value: 'Countdown music' })
  Transform.create(music, { parent: engine.PlayerEntity })
  AudioSource.create(music, { audioClipUrl: MUSIC, playing: false, loop: true, volume: 0.32 })
  clunk = engine.addEntity()
  Name.create(clunk, { value: 'Clunk sound' })
  Transform.create(clunk, { parent: engine.PlayerEntity })
  AudioSource.create(clunk, { audioClipUrl: CLUNK_SFX, playing: false, volume: 1 })

  onLockUsed(reactToLock)
  onChainsShaken(reactToShake)
  onPropClicked(reactToProp)
  onGuardTalked((guard, line) => guardReply(guard, line))
  SkyboxTime.createOrReplace(engine.RootEntity, { fixedTime: SKYBOX_FIXED_TIME, transitionMode: TransitionMode.TM_FORWARD })
  engine.addSystem(directorSystem)
  // The title screen shows over the cell.
  resetLevelProps(2)
  resetLevelProps(3)
  setGuardsForLevel(1)
  setPhase('title')
  if (DEBUG_START_LEVEL > 0) {
    schedule(2, () => {
      resetRun()
      reacted = {}
      beginLevel(DEBUG_START_LEVEL)
    })
  }
}

export function goToStats() {
  game.statsNote = ''
  setPhase('stats')
}

export function goToTutorial() {
  game.tutorialPage = 0
  setPhase('tutorial')
}

export function startGame() {
  resetRun()
  reacted = {}
  setPhase('intro')
  // The curtain stays closed: the title cards sat on solid black, so the room is not glimpsed here either.
  game.fade = 1
  game.fadeTarget = 1
  schedule(1.2, () => {
    game.caption = introCaption()
  })
  schedule(6.5, () => beginLevel(1))
}

export function playAgain() {
  resetRun()
  reacted = {}
  game.caption = ''
  game.fadeTarget = 0
  resetLevelProps(2)
  resetLevelProps(3)
  setGuardsForLevel(1)
  void seatPlayer()
  setPhase('title')
}

// ---------- Levels ----------

function beginLevel(level: number) {
  console.log(`Locksmith level ${level} start`)
  const copy = LEVELS[level - 1]
  game.level = level
  game.levelTime = 0
  game.endingSoon = false
  exShown = {}
  lastShownEx = ''
  game.levelDuration = LEVEL_DURATION[level]
  game.levelTitle = copy.title
  game.caption = copy.title
  game.fadeTarget = 1
  game.hint = ''
  game.dangerLabel = copy.dangerLabel
  game.dangerClock = ''
  clearDialogue()
  setTalking(null)
  endShot(true)
  lavaShot = false
  sharkShot = false

  setGuardsForLevel(level)
  resetLevelProps(level)
  void seatPlayer()

  events = buildEvents(level)
  nextEvent = 0
  hintIndex = 0

  schedule(2.4, () => {
    game.caption = ''
    game.fadeTarget = 0
    setPhase('playing')
    game.nextHintAt = game.now + 2
    game.hintUntil = 0
  })
  // Readability: the first useful action is named in the first seconds of the first room.
  if (level === 1) schedule(3.4, () => showToast('Right. Standard procedure. Reach for the lockpick. Shake the chains if that fails.', 7))
}

function endLevel() {
  const copy = LEVELS[game.level - 1]
  setPhase('transition')
  endShot(true)
  game.fadeTarget = 1
  game.dangerClock = ''
  game.hint = ''
  clearDialogue()
  setTalking(null)
  schedule(1.4, () => {
    game.caption = copy.endCaption
    // Guards are rebuilt in the next room while the screen is black, so nobody is seen running there.
    if (game.level < 3) setGuardsForLevel(game.level + 1)
  })
  // Every death ends on the title: big letters and a heavy hit.
  schedule(6.4, () => {
    game.caption = ''
    game.titleCard = true
    AudioSource.playSound(sfx, TITLE_SFX)
  })
  schedule(9.4, () => {
    game.titleCard = false
    if (game.level < 3) beginLevel(game.level + 1)
    else showEnding()
  })
}

/** Level 3's ending: hard cut to black just before the bite, a scream, the title, the end card. */
function sharkCut() {
  setPhase('transition')
  game.fade = 1
  game.fadeTarget = 1
  game.caption = ''
  game.dangerClock = ''
  game.hint = ''
  clearDialogue()
  setTalking(null)
  AudioSource.playSound(scream, SCREAM_SFX)
  schedule(1.6, () => {
    game.titleCard = true
    AudioSource.playSound(sfx, TITLE_SFX)
  })
  schedule(4.6, () => {
    game.titleCard = false
    showEnding()
  })
}

function showEnding() {
  game.caption = ''
  setPhase('ending')
}

function setLocal(name: string, position: Vector3, rotation?: Quaternion) {
  const e = prop(name)
  if (!e) return
  const tr = Transform.getMutable(e)
  tr.position = position
  if (rotation) tr.rotation = rotation
}

function resetLevelProps(level: number) {
  if (level === 2) {
    beltRunning = false
    setLocal('Chair pallet L2', BELT_CHAIR_START)
    for (let i = 0; i < SLAT_COUNT; i++) setLocal(`Belt slat ${i + 1}`, Vector3.create(BELT_MIN_X + 0.5 + i * SLAT_STEP, 0.7, 9))
  }
  if (level === 3) {
    gateOpened = false
    sharkBiting = false
    sharkLeg = 0
    sharkDir = 1
    setLocal('Shark', SHARK_TANK_POS, Quaternion.fromEulerDegrees(0, 90, 0))
    const shark = prop('Shark')
    if (shark && Animator.getOrNull(shark)) {
      Animator.stopAllAnimations(shark, true)
      Animator.playSingleAnimation(shark, 'swim', false)
    }
    const gate = prop('Tank gate')
    if (gate && Animator.getOrNull(gate)) {
      Animator.stopAllAnimations(gate, true)
      Animator.playSingleAnimation(gate, 'close', true)
    }
    setCountdownText(SHARK_RELEASE_AT)
  }
}

// ---------- Timelines ----------

function buildEvents(level: number): TimedEvent[] {
  if (level === 1) {
    return [
      { t: 8, run: () => sx('pockets', 2, GUARD_1, 'You checked his pockets well, right?') },
      { t: 13, run: () => sx('pockets', 2, GUARD_2, "Yes yes, I'm sure. Every inch.") },
      { t: 24, run: () => sx('famous', 2, GUARD_1, "Ok, because this guy here... he's famous for being an expert at escaping all sorts of traps. If he had just one lockpick...") },
      { t: 34, run: () => sx('famous', 2, GUARD_2, 'Naah man, chill. Really, he has nothing on him. Absolutely sure.') },
      { t: 58, run: () => sx('spoon', 4, GUARD_1, 'Did you hear he once got out of a safe with a spoon?') },
      { t: 63, run: () => sx('spoon', 4, GUARD_2, 'Did you leave him a spoon?') },
      { t: 67, run: () => sx('spoon', 4, GUARD_1, '...No.') },
      { t: 70, run: () => sx('spoon', 4, GUARD_2, 'Then.') },
      { t: 88, run: () => sx('look', 2, GUARD_1, 'He keeps looking at the lockpick box.') },
      { t: 92, run: () => sx('look', 2, GUARD_2, "Let him look. Looking's free.") },
      { t: 106, run: () => sx('beltroom', 3, GUARD_2, 'Boss says move him to the belt room.') },
      { t: 111, run: () => sx('beltroom', 3, GUARD_1, 'The belt room? Harsh.') },
      { t: 115, run: () => sx('beltroom', 3, GUARD_2, 'Yeah.') }
    ]
  }
  if (level === 2) {
    return [
      { t: 4, run: () => say(PA, 'Conveyor 3 will start shortly. Destination: lava.') },
      { t: BELT_START_AT, run: startBelt },
      { t: 14, run: () => say(PA, 'Conveyor 3 is now active. Please remain seated. You will.') },
      { t: 32, run: () => say(PA, 'Passengers are reminded that Conveyor 3 is a non-stop service.') },
      { t: 52, run: () => sayNow(PA, `Estimated time to lava: ${Math.round(lavaEta())} seconds. Conveyor 3 apologises for the speed.`) },
      { t: 72, run: () => say(PA, 'Thank you for travelling with Conveyor 3. There was no alternative.') },
      { t: 90, run: () => say(PA, 'Please keep hands and feet inside the vehicle. Not that you have a choice.') }
    ]
  }
  return [
    { t: 3, run: () => sayNow(VOICE, `Shark release in ${sharkSecondsLeft()} seconds.`) },
    { t: 14, run: () => sx('checked', 4, VOICE, 'Has he been checked for lockpicks?') },
    { t: 19, run: () => sx('checked', 4, GUARD_2, "He's tied to a chair. In a flooded room. Next to a shark.") },
    { t: 30, run: () => sx('checked', 4, VOICE, 'Fair point. Updating his status to: hopeless.') },
    { t: 40, run: () => sx('checked', 4, VOICE, "The shark's status remains: hopeful.") },
    // Live numbers: these interrupt whatever is on screen so the number is right when you read it.
    { t: 60, run: () => sayNow(VOICE, `${sharkSecondsLeft()} seconds.`) },
    { t: 85, run: () => sayNow(VOICE, `${sharkSecondsLeft()} seconds.`) },
    { t: 95, run: () => sayNow(VOICE, `${sharkSecondsLeft()}.`) },
    { t: SHARK_RELEASE_AT, run: releaseShark },
    { t: SHARK_RELEASE_AT + 3, run: () => say(GUARD_2, 'There it goes.') },
    { t: SHARK_RELEASE_AT + 8, run: () => sx('seated', 2, VOICE, 'Please remain seated.') },
    { t: SHARK_RELEASE_AT + 13, run: () => sx('seated', 2, GUARD_2, "He's remaining seated.") }
  ]
}

/**
 * A thug answers you in his own bubble. Whatever was being said is interrupted and picked up again
 * right after (live countdown numbers are dropped instead, they would be stale).
 */
function guardReply(guard: string, line: string) {
  if (game.phase !== 'playing' || game.endingSoon) return
  const current = game.dialogue
  const interruptingReply = current !== null && current.text === lastReply
  if (!interruptingReply) {
    // The exchange being interrupted: the current line's, or (between two of its lines) the last one shown.
    const ex = current ? current.ex : lastShownEx
    const shown = ex ? exShown[ex] ?? [] : []
    const unfinished = ex !== undefined && ex !== '' && shown.length > 0 && (current !== null || shown.length < (EX_SIZE[ex] ?? 1))
    if (unfinished && ex) {
      game.dialogueQueue.unshift(...shown)
      exShown[ex] = []
    } else if (current && !(current.speaker === VOICE && /\d/.test(current.text))) {
      game.dialogueQueue.unshift(current) // a lone line just resumes (live countdown numbers are dropped)
    }
  }
  lastReply = line
  sayNow(guard, line, true)
}
let lastReply = ''

function sharkSecondsLeft(): number {
  return Math.max(0, Math.round(SHARK_RELEASE_AT - game.levelTime))
}

// ---------- Reactions ----------

function reactToLock() {
  if (game.level === 1) {
    once('lock', () => {
      sx('reach', 3, GUARD_1, "He's doing the thing. Look. He's reaching.")
      sx('reach', 3, GUARD_2, 'Reaching for what?')
      sx('reach', 3, GUARD_1, '...Nothing, apparently.')
    })
    // Escalation, after the Stanley Parable's narrator: polite, then irritated, then grudging respect.
    if (game.counters.lockAttempts === 4) once('lock4', () => say(GUARD_1, 'He keeps doing that.'))
    if (game.counters.lockAttempts === 7) once('lock7', () => { sx('giveone', 2, GUARD_2, 'Should we... give him one? Just to see?'); sx('giveone', 2, GUARD_1, 'No.') })
    if (game.counters.lockAttempts === 11) once('lock11', () => say(GUARD_2, "He's very persistent for a man with zero lockpicks."))
    if (game.counters.lockAttempts === 16) once('lock16', () => { sx('admire', 2, GUARD_1, 'I almost admire it.'); sx('admire', 2, GUARD_2, 'Almost.') })
  } else if (game.level === 2) {
    once('lock', () => say(PA, 'Movement detected at seat one. Movement is permitted. Leaving is not.'))
    if (game.counters.lockAttempts >= 12) once('lock12', () => say(PA, 'Conveyor 3 admires your work ethic.'))
  } else if (game.level === 3) {
    if (gateOpened) once('lock-late', () => say(GUARD_2, 'Still reaching? Respect.'))
    else once('lock', () => say(GUARD_2, "He's doing the reaching thing again."))
  }
}

function reactToShake() {
  if (game.level === 1) {
    once('shake', () => {
      sx('shaking', 2, GUARD_2, 'Is he... shaking?')
      sx('shaking', 2, GUARD_1, 'Let him. Those chains are rated for a lot more shaking than that.')
    })
    if (game.counters.shakes === 5) once('shake5', () => say(GUARD_1, 'Those chains were expensive. Shake away.'))
    if (game.counters.shakes === 10) once('shake10', () => { sx('ten', 3, GUARD_2, 'Ten. I counted.'); sx('ten', 3, GUARD_1, 'Why?'); sx('ten', 3, GUARD_2, 'Something to do.') })
  } else if (game.level === 2) {
    once('shake', () => say(PA, 'Rattling detected. Rattling is permitted.'))
  } else if (game.level === 3) {
    if (gateOpened) once('shake-late', () => say(GUARD_2, 'Shaking just makes you look tastier. I read that somewhere.'))
    else once('shake', () => say(VOICE, 'Shark enrichment: approved.'))
  }
}

function reactToProp(id: string) {
  if (game.level === 1) {
    if (id === 'box') once('box', () => { sx('eyebox', 4, GUARD_1, "He's eyeing the box."); sx('eyebox', 4, GUARD_2, "It's three metres away."); sx('eyebox', 4, GUARD_1, 'It says LOCKPICKS on it.'); sx('eyebox', 4, GUARD_2, "It's labelled. That's good labelling.") })
    if (id === 'hairpin') once('hairpin', () => { sx('hairpin', 3, GUARD_2, 'Is that a hairpin on the floor?'); sx('hairpin', 3, GUARD_1, "It's fine. His hands are behind his back."); sx('hairpin', 3, GUARD_2, 'Right. Right.') })
    if (id === 'key') once('key', () => { sx('keyhook', 3, GUARD_1, 'Should the key be hanging there?'); sx('keyhook', 3, GUARD_2, "It's the key to the broom cupboard."); sx('keyhook', 3, GUARD_1, "Oh. Then it's fine.") })
    if (id === 'chair') once('chair', () => say(GUARD_2, 'Metal chair. Good call, by the way.'))
  } else if (game.level === 2) {
    if (id === 'stop') once('stop', () => say(PA, 'The emergency stop is for emergencies. This is scheduled.'))
    if (id === 'wrench') once('wrench', () => say(PA, 'Lost property can be collected after the lava.'))
  } else if (game.level === 3) {
    if (gateOpened) {
      if (id === 'lever') once('lever-late', () => say(GUARD_2, 'Lever would have been good about a minute ago.'))
      if (id === 'shark') once('shark-late', () => say(GUARD_2, "Don't make eye contact. Actually, do. It doesn't matter."))
      return
    }
    if (id === 'lever') once('lever', () => { sx('leverlook', 2, GUARD_2, "He's looking at the lever."); sx('leverlook', 2, VOICE, 'Everyone looks at the lever.') })
    if (id === 'tank') once('tank', () => say(GUARD_2, 'Glass is forty millimetres. Sir.'))
    if (id === 'bait') once('bait', () => say(GUARD_2, "That's for the shark."))
  }
}

// ---------- Dangers ----------

function setCountdownText(seconds: number) {
  const t = prop('Countdown board text')
  if (!t) return
  const ts = TextShape.getMutableOrNull(t)
  if (ts) ts.text = `SHARK RELEASE IN ${formatClock(seconds)}`
}

function releaseShark() {
  if (gateOpened) return
  gateOpened = true
  console.log('Locksmith shark released')
  const gate = prop('Tank gate')
  if (gate && Animator.getOrNull(gate)) Animator.playSingleAnimation(gate, 'open', true)
  sayNow(VOICE, 'Release.')
  setCountdownText(0)
}

function startBelt() {
  beltRunning = true
  lastSeatCheck = game.now
}

/** Seconds until the pallet reaches the lava edge at belt speed (plus the wait before the belt starts). */
function lavaEta(): number {
  const pallet = prop('Chair pallet L2')
  const x = pallet ? Transform.get(pallet).position.x : BELT_CHAIR_START.x
  const travel = Math.max(0, LAVA_EDGE_X - x) / BELT_SPEED
  const wait = beltRunning ? 0 : Math.max(0, BELT_START_AT - game.levelTime)
  return travel + wait
}

function updateLevel2(dt: number) {
  if (beltRunning) {
    const step = BELT_SPEED * dt
    // The slats run toward the lava and wrap around under the belt. (The wrench lies on the floor: you leave it.)
    const movers: string[] = []
    for (let i = 0; i < SLAT_COUNT; i++) movers.push(`Belt slat ${i + 1}`)
    for (const name of movers) {
      const e = prop(name)
      if (!e) continue
      const tr = Transform.getMutable(e)
      let x = tr.position.x + step
      if (x > BELT_MIN_X + BELT_SPAN) x -= BELT_SPAN
      tr.position = Vector3.create(x, tr.position.y, tr.position.z)
    }
    // The pallet (chair + player) rides the belt and stops just short.
    const pallet = prop('Chair pallet L2')
    if (pallet) {
      const tr = Transform.getMutable(pallet)
      const x = Math.min(PALLET_END_X, tr.position.x + step)
      tr.position = Vector3.create(x, tr.position.y, tr.position.z)
      if (x >= PALLET_END_X) {
        beltRunning = false
        beltStoppedAt = game.now
        // The belt jams right at the edge: say so, so the stop is not a mystery.
        AudioSource.playSound(clunk, CLUNK_SFX)
        showToast('CLUNK. The belt jams. Right at the edge. Not your doing. You are not sure how you feel about that.', 8)
        sayNow(PA, 'Conveyor 3 has stopped due to a technical difficulty. Maintenance has been notified. Please remain seated.')
      }
    }
    // Moving colliders carry the avatar; if not, snap back every couple of seconds.
    if (game.now - lastSeatCheck > 2.5) {
      lastSeatCheck = game.now
      keepOnSeat()
    }
    // Cinematic: the last metres. A low camera past the lava's far rim watches the chair creep toward it,
    // lava in the foreground, until the belt has jammed and the clunk has landed.
    if (pallet && !lavaShot && lavaEta() < 9) {
      lavaShot = true
      startShot(2, Vector3.create(22.6, 1.4, 14.8), { entity: pallet, offset: Vector3.create(0, 0.8, 0) }, 14, () => !beltRunning && game.now > beltStoppedAt + 2.5)
    }
  }
  game.dangerClock = formatClock(lavaEta())
}

/** Turn (smoothly) to face a horizontal direction. The shark model's nose points along its local +Z. */
function faceToward(tr: { rotation: Quaternion }, dir: Vector3, dt: number, rate: number = 2.5) {
  if (Vector3.lengthSquared(dir) < 1e-6) return
  const yaw = (Math.atan2(dir.x, dir.z) * 180) / Math.PI
  const target = Quaternion.fromEulerDegrees(0, yaw, 0)
  tr.rotation = Quaternion.slerp(tr.rotation, target, Math.min(1, dt * rate))
}

/** Degrees between where `rotation` points (local +Z) and the horizontal direction `dir`. */
function yawError(rotation: Quaternion, dir: Vector3): number {
  const facing = Vector3.rotate(Vector3.Forward(), rotation)
  const a = Math.atan2(facing.x, facing.z)
  const b = Math.atan2(dir.x, dir.z)
  let d = Math.abs(a - b) * (180 / Math.PI)
  if (d > 180) d = 360 - d
  return d
}

/** Seconds until level 3 ends: the shark cut (remaining path at swim speed) or the level timer, whichever is first. */
function level3SecondsLeft(): number {
  const timer = game.levelDuration - game.levelTime
  const shark = prop('Shark')
  if (!gateOpened || !shark || sharkBiting) return sharkBiting ? 0 : timer
  let pos = Transform.get(shark).position
  let dist = 0
  for (let i = sharkLeg; i < SHARK_PATH.length; i++) {
    dist += Vector3.distance(pos, SHARK_PATH[i])
    pos = SHARK_PATH[i]
  }
  return Math.min(timer, Math.max(0, dist - SHARK_CUT_DISTANCE) / (SHARK_SPEED * 0.8))
}

function updateLevel3(dt: number) {
  // Nothing new is shown in the last 1.5 s: there would be no time to read it.
  game.endingSoon = level3SecondsLeft() < 1.5
  const shark = prop('Shark')
  if (shark) {
    const tr = Transform.getMutable(shark)
    if (!gateOpened) {
      // Patrol the tank, turning to face the way it swims.
      let x = tr.position.x + sharkDir * SHARK_SPEED * dt
      if (x > SHARK_MAX_X) { x = SHARK_MAX_X; sharkDir = -1 }
      if (x < SHARK_MIN_X) { x = SHARK_MIN_X; sharkDir = 1 }
      tr.position = Vector3.create(x, SHARK_TANK_POS.y, SHARK_TANK_POS.z)
      faceToward(tr, Vector3.create(sharkDir, 0, 0), dt)
    } else {
      // Out through the gate, nose first, then down the room toward the chair. Slowly. It is a shark.
      const waypoint = SHARK_PATH[Math.min(sharkLeg, SHARK_PATH.length - 1)]
      const to = Vector3.subtract(waypoint, tr.position)
      const dist = Vector3.length(to)
      const flat = Vector3.create(to.x, 0, to.z)
      // Turn first, then swim: a shark that is still swinging round would clip the door frame.
      const aligned = Vector3.lengthSquared(flat) < 1e-4 || yawError(tr.rotation, flat) < SHARK_ALIGN_DEG
      if (dist > 0.05 && aligned) {
        const step = Math.min(dist, SHARK_SPEED * 0.8 * dt)
        tr.position = Vector3.add(tr.position, Vector3.scale(Vector3.normalize(to), step))
      }
      faceToward(tr, flat, dt, aligned ? 2.5 : 1.6)
      // Only the final leg (toward the chair) can trigger the cut; reaching an earlier waypoint just advances.
      const onLastLeg = sharkLeg === SHARK_PATH.length - 1
      if (!onLastLeg && dist < 0.25) {
        sharkLeg++
        // Cinematic: the shark leaves the tank. As it lines up behind the open door, a low camera beside the
        // gate, just above the water, picks it up, watches it come out nose first and follows it down the room.
        if (sharkLeg === 1 && !sharkShot) {
          sharkShot = true
          startShot(3, Vector3.create(17.3, 1.35, 19.4), { entity: shark }, 13, () => Transform.get(shark).position.z < 14.5)
        }
      }
      if (onLastLeg && dist < SHARK_CUT_DISTANCE && !sharkBiting) {
        sharkBiting = true
        if (Animator.getOrNull(shark)) Animator.playSingleAnimation(shark, 'bite', false)
        sharkCut()
      }
    }
  }
  const remaining = Math.max(0, SHARK_RELEASE_AT - game.levelTime)
  if (!gateOpened) setCountdownText(remaining)
  game.dangerLabel = gateOpened ? 'Shark:' : LEVELS[2].dangerLabel
  game.dangerClock = gateOpened ? 'released' : formatClock(remaining)
}

// ---------- The system ----------

function directorSystem(dt: number) {
  game.now += dt

  // Fade toward its target.
  if (game.fade !== game.fadeTarget) {
    const step = dt * 0.9
    game.fade = game.fade < game.fadeTarget ? Math.min(game.fadeTarget, game.fade + step) : Math.max(game.fadeTarget, game.fade - step)
  }

  // Scheduled one-shots.
  if (scheduled.length > 0) {
    const due = scheduled.filter((s) => s.at <= game.now)
    if (due.length > 0) {
      scheduled = scheduled.filter((s) => s.at > game.now)
      for (const s of due) s.run()
    }
  }

  // Toast expiry.
  if (game.toast && game.now >= game.toastUntil) game.toast = ''

  // DEBUG ONLY: with a debug start level set, key 1 fires a short test shot at the chair to check the handback.
  if (DEBUG_START_LEVEL > 0 && !cineActive && !cineReturning && inputSystem.isTriggered(InputAction.IA_ACTION_3, PointerEventType.PET_DOWN)) {
    const chair = prop(`Chair L${game.level}`)
    if (chair) startShot(game.level, Vector3.add(Transform.get(chair).position, Vector3.create(3.5, 1.2, 1.5)), { entity: chair, offset: Vector3.create(0, 0.9, 0) }, 3, null)
  }
  // Cinematic shots end on their cue or their time limit, then glide home before releasing the view.
  if (cineActive && (game.now >= cineUntil || (cineDone !== null && cineDone()))) endShot()
  updateCineReturn(dt)

  // Dialogue queue. A line only starts when no hint is on screen and after a short gap, so the
  // player never has two things to read at once; the queue absorbs the delay.
  if (game.dialogue && game.now >= game.dialogueUntil) {
    game.dialogue = null
    setTalking(null)
    game.dialogueGapUntil = game.now + DIALOGUE_GAP
    game.nextHintAt = Math.max(game.nextHintAt, game.now + QUIET_AFTER_DIALOGUE)
  }
  const hintShowing = game.hint !== '' && game.now < game.hintUntil
  if (!game.dialogue && game.dialogueQueue.length > 0 && game.phase === 'playing' && !game.endingSoon && game.now >= game.dialogueGapUntil && !hintShowing) {
    const line = game.dialogueQueue.shift()!
    game.dialogue = line
    game.dialogueUntil = game.now + line.seconds
    game.hint = ''
    game.nextHintAt = Math.max(game.nextHintAt, game.dialogueUntil + QUIET_AFTER_DIALOGUE)
    setTalking(line.speaker, line.text)
    noteLineStarted(line)
  }

  if (game.phase !== 'playing') return

  game.levelTime += dt

  // Hints: one at a time, only when nothing is being said, and never right after a line.
  if (game.hint && game.now >= game.hintUntil) game.hint = ''
  if (!game.hint && !game.dialogue && !game.endingSoon && game.dialogueQueue.length === 0 && game.now >= game.nextHintAt) {
    const hints = LEVELS[game.level - 1].hints
    game.hint = hints[hintIndex % hints.length]
    hintIndex++
    game.hintUntil = game.now + HINT_SECONDS
    game.nextHintAt = game.now + HINT_GAP_SECONDS
  }

  // Timeline.
  while (nextEvent < events.length && events[nextEvent].t <= game.levelTime) {
    events[nextEvent].run()
    nextEvent++
  }

  // Danger.
  if (game.level === 1) {
    game.dangerClock = formatClock(game.levelDuration - game.levelTime)
  } else if (game.level === 2) {
    updateLevel2(dt)
  } else if (game.level === 3) {
    updateLevel3(dt)
  }

  if (game.levelTime >= game.levelDuration) endLevel()
}

export { showToast }
