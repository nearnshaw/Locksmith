// Coded React-ECS UI for Locksmith. Not editable in the Creator Hub UI Designer: the tutorial
// pages, stat rows, dialogue queue and response toasts are data-driven.
//
// Layout rule: ONE full-canvas root, and every panel is an absolutely positioned full-canvas
// layer. Absolute layers do not take part in flex layout, so a toast or dialogue line appearing
// never shifts the HUD or anything else.
//
// Two kinds of text during play, kept visually apart:
//   - Thoughts (your own reaction to something you tried): left side, teal panel, "YOU" tag.
//   - Speech (guards, PA, intercom): bottom centre, warm panel, speaker chip.

import ReactEcs, { ReactEcsRenderer, UiEntity, Label, Button } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { game, STAT_NAMES, StatName, pointsLeft, TOTAL_POINTS, LOCKPICKING_MIN } from './game/state'
import { TITLE_TAGLINE, titleBlurb, STAT_BLURB, STATS_LOCKED_NOTE, TUTORIAL_PAGES, END_TITLE, END_RANK, heroName } from './game/content'
import { goToStats, goToTutorial, startGame, playAgain } from './game/levels'
import { isGuard } from './game/guards'

/** CC BY 4.0 attribution for the countdown music (see CREDITS.md). */
const MUSIC_CREDIT = 'Music: "Spy Glass" by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0'

const PANEL = Color4.create(0.08, 0.08, 0.11, 0.94)
const PANEL_SOFT = Color4.create(0.1, 0.1, 0.14, 0.86)
const BACKDROP = Color4.create(0, 0, 0, 0.6)
// Before the game starts the cards sit on solid black: the rooms are not spoiled by the title screen.
const CURTAIN = Color4.create(0.02, 0.02, 0.03, 1)
const GOLD = Color4.create(0.95, 0.75, 0.2, 1)
const RED = Color4.create(0.95, 0.3, 0.25, 1)
const WHITE = Color4.White()
const DIM = Color4.create(0.75, 0.74, 0.7, 1)
const BTN = Color4.create(0.95, 0.75, 0.2, 1)
const BTN_TEXT = Color4.create(0.1, 0.08, 0.04, 1)
const BTN_DARK = Color4.create(0.22, 0.22, 0.28, 1)
const BTN_DISABLED = Color4.create(0.3, 0.3, 0.33, 1)
// Thoughts: cool teal. Speech: warm brown with a gold speaker chip.
const THOUGHT_PANEL = Color4.create(0.04, 0.13, 0.17, 0.92)
const THOUGHT_ACCENT = Color4.create(0.3, 0.85, 0.9, 1)
const THOUGHT_TEXT = Color4.create(0.85, 0.97, 1, 1)
const SPEECH_PANEL = Color4.create(0.16, 0.1, 0.05, 0.95)
const SPEECH_ACCENT = GOLD

/** A full-canvas absolute layer. Pointer-transparent unless `block` is set (modals only). */
function layer(extra: Record<string, unknown> = {}, block: boolean = false): Record<string, unknown> {
  return {
    positionType: 'absolute',
    position: { top: 0, left: 0 },
    width: '100%',
    height: '100%',
    pointerFilter: block ? 'block' : 'none',
    ...extra
  }
}

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(Root, { virtualWidth: 1920, virtualHeight: 1080 })
}

const Root = () => (
  <UiEntity uiTransform={{ width: '100%', height: '100%' }}>
    {Hud()}
    {HintBar()}
    {ThoughtBox()}
    {SpeechBox()}
    {FadeOverlay()}
    {TitleCard()}
    {TitleScreen()}
    {StatsScreen()}
    {TutorialScreen()}
    {EndingScreen()}
  </UiEntity>
)

// ---------- Gameplay HUD (top-right) ----------

function Hud() {
  if (game.phase !== 'playing' && game.phase !== 'transition') return null
  return (
    <UiEntity uiTransform={layer()}>
      <UiEntity
        uiTransform={{ positionType: 'absolute', position: { top: 32, right: 32 }, width: 440, height: 200, flexDirection: 'column', padding: 16 }}
        uiBackground={{ color: PANEL_SOFT }}
      >
        <Label value={game.levelTitle} fontSize={20} color={GOLD} textAlign="middle-left" textWrap="nowrap" uiTransform={{ width: '100%', height: 28 }} />
        {/* The clock is its own fixed-width label so it never wraps or clips ("0:10" must read as ten). */}
        <UiEntity uiTransform={{ width: '100%', height: 34, flexDirection: 'row', alignItems: 'center' }}>
          <Label value={game.dangerLabel} fontSize={22} color={RED} textAlign="middle-left" textWrap="nowrap" uiTransform={{ width: 250, height: 34 }} />
          <Label value={game.dangerClock} fontSize={20} color={RED} textAlign="middle-left" textWrap="nowrap" uiTransform={{ width: 150, height: 34 }} />
        </UiEntity>
        <UiEntity uiTransform={{ width: '100%', height: 56, flexDirection: 'row', alignItems: 'center', margin: { top: 6 } }}>
          <UiEntity uiTransform={{ width: 48, height: 48, margin: { right: 10 } }} uiBackground={{ textureMode: 'stretch', texture: { src: 'assets/images/icon_no_lockpick.png' } }} />
          <Label value={`Lockpicks: ${game.lockpicks}`} fontSize={26} color={WHITE} textAlign="middle-left" textWrap="nowrap" uiTransform={{ width: 340, height: 48 }} />
        </UiEntity>
        <Label
          value={`Lockpicking skill: ${game.stats.Lockpicking} / ${TOTAL_POINTS}      [E] Shake chains`}
          fontSize={16}
          color={DIM}
          textAlign="middle-left"
          textWrap="nowrap"
          uiTransform={{ width: '100%', height: 24, margin: { top: 4 } }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------- Hint ticker (top-center) ----------

function HintBar() {
  if (game.phase !== 'playing' || !game.hint) return null
  return (
    <UiEntity uiTransform={layer()}>
      <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 32, left: 470 }, width: 960, height: 52, padding: { left: 20, right: 20 } }} uiBackground={{ color: PANEL_SOFT }}>
        <Label value={game.hint} fontSize={20} color={GOLD} textAlign="middle-center" uiTransform={{ width: '100%', height: '100%' }} />
      </UiEntity>
    </UiEntity>
  )
}

// ---------- Thoughts: your reaction to what you just tried (left, teal) ----------

function ThoughtBox() {
  if (game.phase !== 'playing' || !game.toast) return null
  return (
    <UiEntity uiTransform={layer()}>
      <UiEntity uiTransform={{ positionType: 'absolute', position: { bottom: 360, left: 48 }, width: 640, height: 130, flexDirection: 'row' }} uiBackground={{ color: THOUGHT_PANEL }}>
        <UiEntity uiTransform={{ width: 8, height: '100%' }} uiBackground={{ color: THOUGHT_ACCENT }} />
        <UiEntity uiTransform={{ width: 616, height: '100%', flexDirection: 'column', padding: { top: 10, bottom: 10, left: 16, right: 16 } }}>
          <Label value={`${heroName().toUpperCase()}  (thinking)`} fontSize={15} color={THOUGHT_ACCENT} textAlign="middle-left" textWrap="nowrap" uiTransform={{ width: '100%', height: 20 }} />
          <Label value={game.toast} fontSize={22} color={THOUGHT_TEXT} textAlign="middle-left" textWrap="wrap" uiTransform={{ width: '100%', height: 84 }} />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

// ---------- Speech: PA and intercom (top centre, under the hint, clear of the chair) ----------
// Guards speak through in-world bubbles above their heads (guards.ts); only bodiless voices use this box.

function SpeechBox() {
  const line = game.dialogue
  if (game.phase !== 'playing' || !line || isGuard(line.speaker)) return null
  return (
    <UiEntity uiTransform={layer()}>
      <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 96, left: 460 }, width: 1000, height: 130, flexDirection: 'row' }} uiBackground={{ color: SPEECH_PANEL }}>
        <UiEntity uiTransform={{ width: 8, height: '100%' }} uiBackground={{ color: SPEECH_ACCENT }} />
        <UiEntity uiTransform={{ width: 976, height: '100%', flexDirection: 'column', padding: { top: 10, bottom: 10, left: 16, right: 16 } }}>
          <UiEntity uiTransform={{ height: 26, flexDirection: 'row' }}>
            <UiEntity uiTransform={{ width: line.speaker.length * 11 + 24, height: 26 }} uiBackground={{ color: SPEECH_ACCENT }}>
              <Label value={line.speaker.toUpperCase()} fontSize={15} color={BTN_TEXT} textAlign="middle-center" textWrap="nowrap" uiTransform={{ width: '100%', height: 26 }} />
            </UiEntity>
          </UiEntity>
          <Label value={`"${line.text}"`} fontSize={24} color={WHITE} textAlign="middle-left" textWrap="wrap" uiTransform={{ width: '100%', height: 78 }} />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

// ---------- Fade + captions ----------

function FadeOverlay() {
  if (game.fade <= 0.01 && !game.caption) return null
  return (
    <UiEntity uiTransform={layer({ justifyContent: 'center', alignItems: 'center' })} uiBackground={{ color: Color4.create(0, 0, 0, game.fade) }}>
      <Label value={game.caption} fontSize={36} color={WHITE} textAlign="middle-center" textWrap="wrap" uiTransform={{ width: 1200, height: 240, display: game.caption ? 'flex' : 'none' }} />
    </UiEntity>
  )
}

// ---------- Title card between levels ----------

function TitleCard() {
  if (!game.titleCard) return null
  return (
    <UiEntity uiTransform={layer({ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' })}>
      <UiEntity uiTransform={{ width: 160, height: 160, margin: { bottom: 10 } }} uiBackground={{ textureMode: 'stretch', texture: { src: 'assets/images/icon_padlock.png' } }} />
      <Label value="LOCKSMITH" fontSize={150} color={GOLD} textAlign="middle-center" uiTransform={{ width: 1400, height: 190 }} />
    </UiEntity>
  )
}

// ---------- Title ----------

function TitleScreen() {
  if (game.phase !== 'title') return null
  return (
    <UiEntity uiTransform={layer({ justifyContent: 'center', alignItems: 'center' }, true)} uiBackground={{ color: CURTAIN }}>
      <UiEntity uiTransform={{ width: 820, height: 480, flexDirection: 'column', alignItems: 'center', padding: 32 }} uiBackground={{ color: PANEL }}>
        <UiEntity uiTransform={{ width: 96, height: 96, margin: { bottom: 8 } }} uiBackground={{ textureMode: 'stretch', texture: { src: 'assets/images/icon_padlock.png' } }} />
        <Label value="LOCKSMITH" fontSize={64} color={GOLD} textAlign="middle-center" uiTransform={{ width: '100%', height: 80 }} />
        <Label value={TITLE_TAGLINE} fontSize={22} color={DIM} textAlign="middle-center" uiTransform={{ width: '100%', height: 32 }} />
        <Label value={titleBlurb()} fontSize={22} color={WHITE} textAlign="middle-center" textWrap="wrap" uiTransform={{ width: 700, height: 100, margin: { top: 16 } }} />
        <Button value="Start" variant="primary" fontSize={24} color={BTN_TEXT} uiTransform={{ width: 320, height: 60, margin: { top: 24 } }} uiBackground={{ color: BTN }} onMouseDown={goToStats} />
      </UiEntity>
    </UiEntity>
  )
}

// ---------- Stats ----------

function minFor(stat: StatName): number {
  return stat === 'Lockpicking' ? LOCKPICKING_MIN : 0
}

function adjustStat(stat: StatName, delta: number) {
  const next = game.stats[stat] + delta
  if (next < minFor(stat)) {
    game.statsNote = STATS_LOCKED_NOTE
    return
  }
  if (next > TOTAL_POINTS) return
  if (delta > 0 && pointsLeft() <= 0) return
  game.statsNote = ''
  game.stats[stat] = next
}

/** Every free point into one stat. Lockpicking keeps its minimum whatever you pick. */
function allIn(stat: StatName) {
  for (const s of STAT_NAMES) game.stats[s] = minFor(s)
  game.stats[stat] += TOTAL_POINTS - LOCKPICKING_MIN
  game.statsNote = stat === 'Lockpicking' ? '' : STATS_LOCKED_NOTE
}

function StatRow(stat: StatName) {
  const value = game.stats[stat]
  const atMin = value <= minFor(stat)
  const locked = stat === 'Lockpicking'
  return (
    <UiEntity key={stat} uiTransform={{ width: '100%', height: 64, flexDirection: 'row', alignItems: 'center', margin: { bottom: 6 }, padding: { left: 12, right: 12 } }} uiBackground={{ color: PANEL_SOFT }}>
      <UiEntity uiTransform={{ width: 300, height: 56, flexDirection: 'column', justifyContent: 'center' }}>
        <Label value={locked ? `${stat}  (min ${LOCKPICKING_MIN})` : stat} fontSize={24} color={locked ? GOLD : WHITE} textAlign="middle-left" textWrap="nowrap" uiTransform={{ width: '100%', height: 30 }} />
        <Label value={STAT_BLURB[stat]} fontSize={14} color={DIM} textAlign="middle-left" textWrap="nowrap" uiTransform={{ width: '100%', height: 20 }} />
      </UiEntity>
      <Button value="-" variant="secondary" fontSize={28} color={atMin ? DIM : WHITE} uiTransform={{ width: 56, height: 48 }} uiBackground={{ color: atMin ? BTN_DISABLED : BTN_DARK }} onMouseDown={() => adjustStat(stat, -1)} />
      <Label value={String(value)} fontSize={30} font="monospace" color={GOLD} textAlign="middle-center" textWrap="nowrap" uiTransform={{ width: 96, height: 48 }} />
      <Button value="+" variant="secondary" fontSize={28} color={WHITE} uiTransform={{ width: 56, height: 48 }} uiBackground={{ color: BTN_DARK }} onMouseDown={() => adjustStat(stat, 1)} />
      <Button value="All in" variant="secondary" fontSize={16} color={BTN_TEXT} uiTransform={{ width: 90, height: 44, margin: { left: 14 } }} uiBackground={{ color: BTN }} onMouseDown={() => allIn(stat)} />
    </UiEntity>
  )
}

function StatsScreen() {
  if (game.phase !== 'stats') return null
  const left = pointsLeft()
  const ready = left === 0
  return (
    <UiEntity uiTransform={layer({ justifyContent: 'center', alignItems: 'center' }, true)} uiBackground={{ color: CURTAIN }}>
      <UiEntity uiTransform={{ width: 820, height: 680, flexDirection: 'column', alignItems: 'center', padding: 28 }} uiBackground={{ color: PANEL }}>
        <Label value={`${heroName()} - skill points`} fontSize={34} color={GOLD} textAlign="middle-center" uiTransform={{ width: '100%', height: 44 }} />
        <Label
          value={`Eight of your twelve points are already in Lockpicking, and they are staying there. Spend the other four.`}
          fontSize={17}
          color={DIM}
          textAlign="middle-center"
          textWrap="nowrap"
          uiTransform={{ width: '100%', height: 28, margin: { bottom: 12 } }}
        />
        <UiEntity uiTransform={{ width: 740, height: 356, flexDirection: 'column' }}>{STAT_NAMES.map((s) => StatRow(s))}</UiEntity>
        <Label value={game.statsNote} fontSize={17} color={GOLD} textAlign="middle-center" textWrap="wrap" uiTransform={{ width: '100%', height: 26, margin: { top: 4 } }} />
        <Label value={`Points left: ${left}`} fontSize={24} font="monospace" color={ready ? WHITE : RED} textAlign="middle-center" uiTransform={{ width: '100%', height: 36, margin: { top: 4 } }} />
        <Button
          value={ready ? 'Study the lockpicking mechanics' : 'Spend all your points first'}
          variant="primary"
          fontSize={22}
          color={ready ? BTN_TEXT : WHITE}
          disabled={!ready}
          uiTransform={{ width: 440, height: 58, margin: { top: 10 } }}
          uiBackground={{ color: ready ? BTN : BTN_DISABLED }}
          onMouseDown={() => {
            if (pointsLeft() === 0) goToTutorial()
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}

// ---------- Tutorial ----------

function TutorialScreen() {
  if (game.phase !== 'tutorial') return null
  const page = TUTORIAL_PAGES[game.tutorialPage]
  const last = game.tutorialPage === TUTORIAL_PAGES.length - 1
  return (
    <UiEntity uiTransform={layer({ justifyContent: 'center', alignItems: 'center' }, true)} uiBackground={{ color: CURTAIN }}>
      <UiEntity uiTransform={{ width: 1240, height: 900, flexDirection: 'column', alignItems: 'center', padding: 24 }} uiBackground={{ color: PANEL }}>
        <Label value={page.title} fontSize={40} color={GOLD} textAlign="middle-center" uiTransform={{ width: '100%', height: 52 }} />
        <UiEntity uiTransform={{ width: 1152, height: 648, margin: { top: 10 } }} uiBackground={{ textureMode: 'stretch', texture: { src: page.image } }} />
        <Label value={page.text} fontSize={30} color={WHITE} textAlign="middle-center" textWrap="wrap" uiTransform={{ width: 1150, height: 56, margin: { top: 12 } }} />
        <UiEntity uiTransform={{ width: 1150, height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: { top: 8 } }}>
          <Button
            value="Back"
            variant="secondary"
            fontSize={20}
            color={WHITE}
            uiTransform={{ width: 160, height: 52, display: game.tutorialPage > 0 ? 'flex' : 'none' }}
            uiBackground={{ color: BTN_DARK }}
            onMouseDown={() => {
              if (game.tutorialPage > 0) game.tutorialPage--
            }}
          />
          <Label value={`${game.tutorialPage + 1} / ${TUTORIAL_PAGES.length}`} fontSize={20} color={DIM} textAlign="middle-center" uiTransform={{ width: 200, height: 52 }} />
          <Button
            value={last ? "I'm ready. Let me at that lock." : 'Next'}
            variant="primary"
            fontSize={20}
            color={BTN_TEXT}
            uiTransform={{ width: last ? 360 : 160, height: 52 }}
            uiBackground={{ color: BTN }}
            onMouseDown={() => {
              if (last) startGame()
              else game.tutorialPage++
            }}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

// ---------- Ending ----------

function EndRow(label: string, value: string, highlight: boolean = false) {
  return (
    <UiEntity key={label} uiTransform={{ width: '100%', height: 36, flexDirection: 'row', justifyContent: 'space-between' }}>
      <Label value={label} fontSize={22} color={DIM} textAlign="middle-left" uiTransform={{ width: 460, height: 36 }} />
      <Label value={value} fontSize={22} color={highlight ? GOLD : WHITE} textAlign="middle-right" uiTransform={{ width: 240, height: 36 }} />
    </UiEntity>
  )
}

function EndingScreen() {
  if (game.phase !== 'ending') return null
  const c = game.counters
  const rows: [string, string, boolean][] = [
    ['Levels escaped', '0 / 3', false],
    ['Lockpicks found', '0', false],
    ['Lockpicks used', '0', true],
    ['Lockpick attempts', String(c.lockAttempts), false],
    ['Chains shaken', String(c.shakes), false],
    ['Objects longed for', String(c.propClicks), false],
    ['Lockpicking skill', `${game.stats.Lockpicking} (unused)`, false]
  ]
  return (
    <UiEntity uiTransform={layer({ justifyContent: 'center', alignItems: 'center' }, true)} uiBackground={{ color: BACKDROP }}>
      <UiEntity uiTransform={{ width: 820, height: 660, flexDirection: 'column', alignItems: 'center', padding: 32 }} uiBackground={{ color: PANEL }}>
        <Label value={END_TITLE} fontSize={56} color={GOLD} textAlign="middle-center" uiTransform={{ width: '100%', height: 72 }} />
        <Label value="The shark was released. You were, famously, the best." fontSize={20} color={DIM} textAlign="middle-center" uiTransform={{ width: '100%', height: 30, margin: { bottom: 14 } }} />
        <UiEntity uiTransform={{ width: 700, height: 262, flexDirection: 'column' }}>{rows.map((r) => EndRow(r[0], r[1], r[2]))}</UiEntity>
        <Label value={END_RANK} fontSize={24} color={GOLD} textAlign="middle-center" uiTransform={{ width: '100%', height: 40, margin: { top: 14 } }} />
        <Button value="Play again (it will not help)" variant="primary" fontSize={22} color={BTN_TEXT} uiTransform={{ width: 420, height: 58, margin: { top: 18 } }} uiBackground={{ color: BTN }} onMouseDown={playAgain} />
        <Label value={MUSIC_CREDIT} fontSize={13} color={DIM} textAlign="middle-center" uiTransform={{ width: '100%', height: 22, margin: { top: 14 } }} />
      </UiEntity>
    </UiEntity>
  )
}
