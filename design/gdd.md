# Locksmith

*Working design · direction: general game design (see `decisions.md`, 2026-10-23). The section layout comes from the Creator Success template this document grew from; program quotas and gates do not apply unless the owner chooses that route. Thirteen owner play passes so far; see `design/01-find-the-fun/exploration-2026-10-23-no-agency.md`.*

**Decentraland Creator Success Program**

| | |
|---|---|
| Public experience title | Locksmith — IP & [Content Policy](https://decentraland.org/content/) status: owner declaration: `TBD: owner to confirm the title and all text is original`; name screening: not searched (date: 2026-10-23); unresolved: "Locksmith" is a common word, other games may use it |
| Deployment target | `TBD: not discussed yet` |
| Studio / team name | `TBD: not discussed yet` |
| Date | 2026-10-23 |
| Contact (Discord + email) | `TBD: not discussed yet` |

---

## 0. TL;DR

| | |
|---|---|
| **Player promise** | You are the realm's best locksmith, tied to a chair. You try everything to escape, while nothing you try can possibly work. |
| **Primary player** | `TBD: not discussed yet` — see §8 |
| **Current status** | greybox (code in this repo, `npm run start`; not yet seen in-world by the agent) |
| **Requested round** | `TBD: not discussed yet` |
| **Live at end of the round** | `TBD: not discussed yet` |

---

## 1. Player Promise

**One-line promise**

> You are the realm's best locksmith, tied to a chair. You try everything to escape, while nothing you try can possibly work.

**One familiar comparison.**

It's like an escape room, but the joke is that the door was never going to open. [agent-decided]

**Why this game**

Escape games promise that a clever player always finds the way out. Locksmith is a parody of that promise: the player is set up as the perfect escape artist, given a tutorial, a stat screen and a padlock to click, and none of it matters. The game must stay funny rather than frustrating: every attempt gets an answer, and the barrier is always clear.

---

## 2. First Minutes & How to Play

| Time | Player experience |
|---|---|
| **0–5 seconds after control** | You are on a folding chair, chained, in a torch-lit cell. A brass padlock locks a waist chain at your right hip; the prompt says "Use lockpick". A thought says "Standard procedure. Reach for the lockpick." The HUD says "Lockpicks: 0". Two thugs stand in front of you. *(proposed cue, pass 9)* |
| **5–10 seconds** | You click the lock. "You reach for your lockpick. You have 0 lockpicks." You press E. The chains rattle. The chains hold. A guard glances over. |
| **10–60 seconds** | The thugs talk about how well they searched you, in speech bubbles over their heads. A tip appears: "A lockpick can be improvised from a hairpin, a bit of wire, a splinter of wood." You click the crate labelled LOCKPICKS. It is 3.4 metres away. You click the chair: "No. It's metal." Keep trying and the thugs' comments escalate from polite to irritated to grudging respect *(proposed, pass 9)*. |
| **1–3 minutes** | The thugs finish their shift and move you. Level 2: same chair on a belt that starts six seconds in and carries you toward the lava; a STOP pedestal three metres away; a wrench on the floor you leave behind. |
| **3–10 minutes** | Level 3: chest-deep water, a shark tank with a vault door, a countdown, a release lever on a dock. The door opens, the shark swims to you, cut to black, a scream, the title. The end card counts your attempts. Lockpicks used: 0. |
| **Natural stopping point** | The end card. `[OPEN: waiting on §4 — is there a reason to return at all for a 5-minute joke?]` |

**Player-facing How to Play**

- Click the padlock to use your lockpick
- Press E to shake the chains
- Another player can watch you fail `[agent-decided]`

**Player mode** *(recorded 2026-10-23 under the platform-fit player-mode check)*: solo. The game state is local to each client; other visitors share the rooms but not the countdown or the dialogue. Known gap: two visitors at once would both be seated on the same chair. `[OPEN: owner choice — accept the overlap for a one-shot joke, or seat extra visitors on neighbouring chairs (see ideas.md)]`

---

## 3. Core Loop

| # | Step (verb) | What the player does (Player input → what they see or hear → what changes) | Why do it again? |
|---|---|---|---|
| 1 | Spot | Look around → a tip or an object promises a way out (crate, key, button, lever) → it becomes clickable | The next object looks even more useful |
| 2 | Try | Click the lock, press E, or click the object → a deadpan line explains exactly why it cannot work → the counter goes up | Each line is new; the guards react |
| 3 | Watch the danger | Do nothing or anything → the belt, the lava, the countdown advance → the level ends | The next danger is bigger and sillier |

| | |
|---|---|
| **One complete loop takes** | 10–20 seconds. Completion: the denial line appears. Outcome: a laugh, a counter, and the danger a little closer. |
| **Decision, challenge, or expression** | Which fake exit to try first; how to spend the 10 skill points (all in Lockpicking is the intended joke); how many times to shake. |
| **Shortest satisfying visit / typical session** | 2 / 5 minutes. The whole game is about 5 minutes. |
| **Why repetition 10 remains appealing** | Every attempt gets a different answer, the guards comment on your attempts, and each level has a new danger. [HYPOTHESIS H1-01] |

**Pillars**

1. Total helplessness, perfectly clear
2. Every attempt gets an answer
3. The joke escalates, the danger never pays off

---

## 4. Why Players Come Back

`[OPEN: postponed — the owner has not said whether return matters for a 5-minute parody. If it does, the candidate hooks parked in design/ideas.md are: a daily "attempt count" leaderboard and a "time spent not escaping" record.]`

### 4.1 The next-day (D1) sentence

`TBD: not discussed yet`

### 4.2 The progression chain

`TBD: not discussed yet`

### 4.3 Two return hooks

`TBD: not discussed yet`

---

## 5. Social by Design

| | |
|---|---|
| **The repeatable social loop** | `TBD: not discussed yet` |
| **The disappearance test** | Nothing breaks: this is a solo comedy with other players as witnesses. [agent-decided] |
| **Quiet hours & player counts** | A solo player enjoys the full game. Guards are scene-side NPCs, so they exist for every player. Each player sees only their own game state (counters, level) because nothing is synced. [agent-decided] Tested count: not tested. |
| **Visible play (the bystander test)** | Someone sees an avatar tied to a metal chair, rattling chains, in front of two unbothered guards. |
| **Shareable play (the memorable moment)** | The end card: "Lockpicks used: 0. Rank: Grandmaster Locksmith (Theoretical)". |
| **Bring-a-friend** | `TBD: not discussed yet` |

---

## 6. Mobile-First

| Core-loop verb | How it works with touch controls |
|---|---|
| Spot | Look around with the camera; objects show their prompt on hover/aim |
| Try | Tap the padlock or an object; the native E button shakes the chains; menus use large buttons |
| Watch the danger | No input needed |

**UI plan.** Large centred cards for title, stats and tutorial; a small HUD anchored top-right; dialogue and responses bottom-centre. Nothing interactive in the bottom-right corner. Not yet checked on a device. [agent-decided]

**Performance.** `TBD: not measured. Greybox is primitives only; target device and client to be named.`

**Desktop-only dependencies.** The player freeze (InputModifier) and masked emotes work on the desktop client; on older mobile clients the player could walk away from the chair. `TBD: confirm on the current mobile client.`

---

## 7. World, Look & Story

**Story / world**

You are you (the game uses your avatar's name): the most famous escape artist alive, captured with your hands tied. Each room has a new deadly deadline and a tool just out of reach.

**Visual direction.** The same iron-framed chair, bolted to a pallet, in the middle of every room; the room changes, the chair does not. Three rooms built from catalog models (stone cell with barrels, a table, a chandelier, a skeleton and a rat; concrete belt hall dressed as a maintenance floor; flooded tank room), a brass padlock on a waist chain at the player's right hip. Two short cinematic shots: the shark leaving the tank, the chair nearing the lava.

---

## 8. Audience & Comparables

**Primary player + arrival context**

Proposed, not yet discussed with the owner: Decentraland regulars who enjoy a short joke experience and will share it (a clip of the shark ending is the natural share), plus friends of the owner who know escape rooms. Five minutes, no prerequisites, one visit. `[agent-decided]`

**How the first group arrives**

Proposed: a link or event post in the owner's existing Decentraland channels; the title and the "Lockpicks: 0" HUD do the pitch on arrival. Detailed audience work, if wanted, goes in `design/acquisition.md` (not created). `[agent-decided]`

**Deliberately not for**

Players who want a real puzzle to solve. [agent-decided]

### Comparables

| | Comparable A — The Stanley Parable (outside Decentraland) | Comparable B — There Is No Game: Wrong Dimension (outside Decentraland) |
|---|---|---|
| What we observed works | From the sources in `references.md` (not played for this pass): a narrator who answers every act of defiance, polite at first and increasingly irritated, so the player's lack of real agency becomes the comedy rather than the frustration. | A voice that tells you to stop playing while the interface itself is the puzzle; frustration is staged and answered, never left silent. Reviewers note it can "wear out its welcome". |
| What does not fit our audience or context—and why | Hours of branching content and a single narrator; Locksmith is five minutes with two thugs and a PA. | Point-and-click precision on a flat screen; in Decentraland the player is an avatar in third person with a reticle. |
| What we will do differently | Keep every attempt answered (thought box) and let the thugs' reactions escalate with persistence (implemented pass 9, owner to judge). | Keep the joke short: three levels, under six minutes, the UI jokes (stats, tutorial) front-loaded before play. |

*Source findings vs our inference: the rows above paraphrase the linked articles; the "what we do differently" column is the agent's proposal.*

---

## 9. 4 Week Plan (v1 scope)

| Week | What is playable / done |
|---|---|
| 1 — Prototype definition | Greybox of the three levels (done 2026-10-23, not yet played) |
| 2 — Core interaction + first-group test | `TBD: not discussed yet` |
| 3 — Core systems refinement | `TBD: not discussed yet` |
| 4 — Playable release, including testing and deployment | `TBD: not discussed yet` |

**What keeps the experience changing after launch**

`TBD: not discussed yet`

**Not building in v1**

- A custom tied-up idle (the seated idle is still the built-in sitting emote; the shake is a custom seated chain-struggle clip since pass 11). [agent-decided]
- Sound (chain rattle, alarm, lava). [agent-decided]
- A shark model (placeholder: grey boxes; the free `shark` model in the OpenDCL catalog is the candidate). [agent-decided]
- Standing non-goal: never a real way out, because the impossible barrier is the joke. (owner, from the seed)

**Top risk + fallback.** The game reads as frustrating instead of funny. Fallback: shorten each level, add more response lines so no line repeats within a level, and make the barrier explicit earlier ("Lockpicks: 0" visible from the first second).

---

**One last question** — `TBD:`
