import { engine, Transform, CameraModeArea } from '@dcl/sdk/ecs'

/** DEBUG ONLY: drop the third-person locks so an Explorer free camera can inspect the rooms. Set false to ship. */
const DEBUG_FREE_CAMERA = false
import { setupUi } from './ui'
import { setupInteractions } from './game/room'
import { createRestraints, setupPlayerSystems, seatPlayer, freezePlayer } from './game/player'
import { createGuards } from './game/guards'
import { setupDirector } from './game/levels'
import { setupSoloView } from './game/solo'

export function main() {
  // The rooms come from assets/scene/main.composite; main() runs after it is loaded.
  if (DEBUG_FREE_CAMERA) for (const [e] of [...engine.getEntitiesWith(CameraModeArea)]) CameraModeArea.deleteFrom(e)
  setupInteractions()
  setupSoloView()
  createGuards()
  createRestraints()
  setupPlayerSystems()
  setupDirector()
  setupUi()

  // Seat the player as soon as the avatar exists in the scene.
  let seatedOnce = false
  engine.addSystem(function seatOnLoad() {
    if (seatedOnce) return
    if (!Transform.getOrNull(engine.PlayerEntity)) return
    seatedOnce = true
    freezePlayer()
    void seatPlayer()
    engine.removeSystem(seatOnLoad)
  })
}
