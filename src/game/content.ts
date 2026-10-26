// All player-facing copy for Locksmith lives here.

import { getPlayer } from '@dcl/sdk/src/players'

/** The hero is the player. Falls back while the profile is still loading. */
export function heroName(): string {
  const name = getPlayer()?.name
  return name && name.trim().length > 0 ? name.trim() : 'You'
}

export const TITLE_TAGLINE = 'An escape game.'
export function titleBlurb(): string {
  return `You are ${heroName()}. The escape artist. The famous one.\nThis should be easy.`
}

export const STAT_BLURB: Record<string, string> = {
  Lockpicking: 'Open any lock. Non-refundable.',
  Strength: 'Lift, push, break.',
  Charisma: 'Talk your way out.',
  Stealth: 'Go unnoticed.',
  Luck: 'Find things.'
}

export const STATS_LOCKED_NOTE = "You can't un-know lockpicking. Minimum 8. You're famous for it."

export interface TutorialPage {
  title: string
  image: string
  text: string
}

export const TUTORIAL_PAGES: TutorialPage[] = [
  {
    title: 'Lockpicking 1/2: Lift the pins',
    image: 'assets/images/tutorial_1.png',
    text:
      'Lift each pin to the gold line. Click to set it.'
  },
  {
    title: 'Lockpicking 2/2: Tension, then turn',
    image: 'assets/images/tutorial_2.png',
    text:
      'Hold F for tension. Set the pins in binding order. Hold E to turn.'
  }
]

export function introCaption(): string {
  return `You wake up. Hands tied. A chair.`
}

export interface LevelCopy {
  title: string
  dangerLabel: string
  endCaption: string
  hints: string[]
}

export const LEVELS: LevelCopy[] = [
  {
    title: 'LEVEL 1 - THE CELL',
    dangerLabel: 'Belt room in',
    endCaption: 'The thugs drag you, chair and all, down a corridor.\nYou count the doors. Six locks. All simple.\nYou are carried past every one of them.',
    hints: [
      'TIP: A lockpick can be improvised from everyday objects: a hairpin, a bit of wire, a splinter of wood.',
      'TIP: Experts can open a 6-pin lock in under 10 seconds. You are an expert.',
      'TIP: Chatty guards are careless guards.',
      'TIP: Tension first, then pins. Hold F for the tension wrench.',
      'TIP: Something useful is always within reach. Sometimes it is even labelled.'
    ]
  },
  {
    title: 'LEVEL 2 - CONVEYOR 3',
    dangerLabel: 'Lava in',
    endCaption: 'Conveyor 3 broke down.\nA maintenance ticket was filed.\nYou have been moved.',
    hints: [
      'TIP: Conveyor belts have emergency stops. Look for the one that says STOP.',
      'TIP: Heat expands metal. Chains are metal.',
      'TIP: Tools are often left lying around in industrial areas.',
      'TIP: Stay calm. Panic is the enemy of the locksmith.',
      'TIP: You have 0 lockpicks. This tip is accurate.'
    ]
  },
  {
    title: 'LEVEL 3 - THE TANK',
    dangerLabel: 'Shark release in',
    endCaption: 'The gate opens.\nThe shark is released.\nIt is, in the end, very simple.',
    hints: [
      'TIP: Every gate has a release lever. Find it.',
      'TIP: Sharks dislike noise. Shake something.',
      'TIP: Glass tanks have a weak point. Strike it hard.',
      'TIP: Breathe. Count the pins in your head: 3, 1, 5, 2, 6, 4.',
      'TIP: You still have 0 lockpicks.'
    ]
  }
]

export const LOCK_RESPONSES: string[] = [
  'You reach for your lockpick. You have 0 lockpicks.',
  'You check your pockets. With your mind. Still 0 lockpicks.',
  'Standard 6-pin tumbler. You could open it in 4 seconds. With a lockpick.',
  'You picture the binding order: 3, 1, 5, 2, 6, 4. Beautiful. Useless.',
  'Lockpicks: 0. The number has not changed since you last looked, 3 seconds ago.',
  'You apply tension with your wrists. Tension is not a lockpick.',
  'Your Lockpicking skill of {LP} looks on, quietly.',
  'The padlock is 2 cm from your fingers. Both are behind your back. They cannot see each other.',
  'You try your fingernail. The fingernail breaks. Lockpicks: 0. Fingernails: 9.',
  'You consider the lock from a philosophical angle. The lock does not consider you.',
  'You hum the tension-wrench song to calm down. It does not summon a tension wrench.',
  'Zero. Still zero. You are extremely good at counting to zero.'
]

export const LOCK_RESPONSE_MAX_LOCKPICKING = 'Maximum Lockpicking. Nobody alive could open this faster. Lockpicks: 0.'
export const LOCK_RESPONSE_LUCK = 'Luck {L}: you find a lockpick! ...No. You imagined it. 0 lockpicks.'

export const SHAKE_RESPONSES: string[] = [
  'You shake the chains. The chains rattle. The chains hold.',
  'You shake harder. One link clinks. It is a confident clink.',
  'Strength {S}: the chains notice. They do not care.',
  'Your hands are tied behind your back. Shaking is most of what they can do. They do it.',
  'You shake with technique this time. Technique is not a lockpick either.',
  'The chains are rated for 20 kN. You are rated for 0 lockpicks.',
  'You rattle. Nothing happens. You rattle again, in case.',
  'A satisfying rattle. Satisfying is not the same as free.'
]

export const SHAKE_RESPONSE_STRONG = 'Strength {S}: a link bends! ...No. It was the light. The chains hold.'

export const END_TITLE = 'THE END'
export const END_RANK = 'Rank: Grandmaster Escape Artist (Theoretical)'
