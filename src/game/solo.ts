// Single-player view: every player is always seated in the chair, so another visitor would overlap you there.
// An avatar-hiding area covers each chair (and the belt the level 2 chair rides on); each client excludes its
// own avatar, so everyone sees themselves in the chair and nobody else. The areas stay small so they do not
// touch the thug NPCs (a hide area also hides NPC name plates). Local to each client; nothing is synced.

import { engine, Transform, AvatarModifierArea, AvatarModifierType, Name } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/src/players'
import { levelOrigin } from './room'
import { GUARD_IDS } from './guards'

/** Chair zones in room coordinates: centre and size (x, y, z). Level 2 spans the whole belt run. */
const ZONES: Record<number, { centre: Vector3; size: Vector3 }> = {
  1: { centre: Vector3.create(12, 1.5, 9.3), size: Vector3.create(3, 3, 3) },
  2: { centre: Vector3.create(13, 2.2, 9.3), size: Vector3.create(16, 3.2, 3) },
  3: { centre: Vector3.create(14, 1.5, 7.3), size: Vector3.create(3, 3, 3) }
}

export function setupSoloView() {
  const areas = [1, 2, 3].map((level) => {
    const origin = levelOrigin(level)
    const zone = ZONES[level]
    const e = engine.addEntity()
    Name.create(e, { value: `Solo view L${level}` })
    const area = zone.size
    Transform.create(e, { position: Vector3.add(origin, zone.centre), scale: area })
    AvatarModifierArea.create(e, { area, modifiers: [AvatarModifierType.AMT_HIDE_AVATARS], excludeIds: [...GUARD_IDS] })
    return e
  })

  // Exclude our own avatar once the profile is known.
  engine.addSystem(function soloExcludeSelf() {
    const id = getPlayer()?.userId
    if (!id) return
    for (const e of areas) AvatarModifierArea.getMutable(e).excludeIds = [id, id.toLowerCase(), ...GUARD_IDS]
    engine.removeSystem(soloExcludeSelf)
  })
}
