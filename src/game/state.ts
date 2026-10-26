// Module-level game state. The UI reads it every frame; systems write it.

export type Phase = 'title' | 'stats' | 'tutorial' | 'intro' | 'playing' | 'transition' | 'ending'

export const STAT_NAMES = ['Lockpicking', 'Strength', 'Charisma', 'Stealth', 'Luck'] as const
export type StatName = (typeof STAT_NAMES)[number]
export const TOTAL_POINTS = 12
/** You arrive famous. The game will not let you forget it: Lockpicking never drops below this. */
export const LOCKPICKING_MIN = 8

export interface DialogueLine {
  speaker: string
  text: string
  seconds: number
  /** Exchange this line belongs to (a question and its answer...). Interruptions replay the exchange from its start. */
  ex?: string
}

function defaultStats(): Record<StatName, number> {
  return { Lockpicking: LOCKPICKING_MIN, Strength: 0, Charisma: 0, Stealth: 0, Luck: 0 }
}

export const game = {
  phase: 'title' as Phase,
  /** Scene clock in seconds, advanced by the director system. */
  now: 0,
  level: 0,
  levelTime: 0,
  levelDuration: 0,
  stats: defaultStats(),
  lockpicks: 0,
  tensionWrenches: 0,
  counters: { lockAttempts: 0, shakes: 0, propClicks: 0 },
  tutorialPage: 0,
  /** Shown under the stat rows when a rule blocks a change (e.g. removing Lockpicking). */
  statsNote: '',

  // Transient UI state
  /** Your own reaction to something you tried (the "thought" box). */
  toast: '',
  toastUntil: 0,
  hint: '',
  dialogue: null as DialogueLine | null,
  dialogueUntil: 0,
  dialogueQueue: [] as DialogueLine[],
  fade: 0,
  fadeTarget: 0,
  caption: '',
  dangerLabel: '',
  dangerClock: '',
  levelTitle: '',
  titleCard: false,
  hintUntil: 0,
  nextHintAt: 0,
  dialogueGapUntil: 0,
  /** True in the last 1.5 s before a level ends: no new notifications or lines (nobody could read them). */
  endingSoon: false
}

export function pointsLeft(): number {
  let used = 0
  for (const s of STAT_NAMES) used += game.stats[s]
  return TOTAL_POINTS - used
}

export function resetRun() {
  game.level = 0
  game.levelTime = 0
  game.levelDuration = 0
  game.lockpicks = 0
  game.tensionWrenches = 0
  game.counters = { lockAttempts: 0, shakes: 0, propClicks: 0 }
  game.toast = ''
  game.toastUntil = 0
  game.hint = ''
  game.dialogue = null
  game.dialogueUntil = 0
  game.dialogueQueue = []
  game.caption = ''
  game.dangerLabel = ''
  game.dangerClock = ''
  game.levelTitle = ''
  game.titleCard = false
  game.hintUntil = 0
  game.nextHintAt = 0
  game.dialogueGapUntil = 0
  game.endingSoon = false
}

/** Replace {LP} {S} {C} {ST} {L} with the player's stats. */
export function fillStats(text: string): string {
  return text
    .replace(/\{LP\}/g, String(game.stats.Lockpicking))
    .replace(/\{S\}/g, String(game.stats.Strength))
    .replace(/\{C\}/g, String(game.stats.Charisma))
    .replace(/\{ST\}/g, String(game.stats.Stealth))
    .replace(/\{L\}/g, String(game.stats.Luck))
}

export function showToast(text: string, seconds: number = 6) {
  if (game.endingSoon) return
  game.toast = fillStats(text)
  game.toastUntil = game.now + seconds
}

export function lineSeconds(text: string): number {
  const words = text.split(' ').length
  // Reading time: a short line stays 4.5 s, a long one up to 11 s.
  return Math.max(4.5, Math.min(11, 2.5 + words * 0.5))
}

/** Queue a dialogue line. It is shown when nothing else is on screen (see the director). */
export function say(speaker: string, text: string, seconds?: number) {
  game.dialogueQueue.push({ speaker, text: fillStats(text), seconds: seconds ?? lineSeconds(text) })
}

export function clearDialogue() {
  game.dialogue = null
  game.dialogueQueue = []
  game.dialogueUntil = 0
}

/** m:ss, always two digits of seconds ("0:10", never "0:1"). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r < 10 ? '0' + r : r}`
}
