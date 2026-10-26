# Gameplay takes for Locksmith, recorded with capture_play.py through the Explorer MCP server.
#
#   python3 promote/tools/capture_play.py take full-run
#
# One continuous run of the whole game (about 7 minutes): the scene must be built with DEBUG_START_LEVEL = 1
# (skips the title, stats and tutorial cards, which are UI and do not show in world-only frames) and
# DEBUG_FREE_CAMERA = true (so set_camera_pose can frame the front shot; the game's own cinematic shots still
# play). Each take waits for a log line the scene prints ("Locksmith level N start", "Locksmith cine: shot start",
# "Locksmith shark released"), then records. Do not write anything under the scene folder while this runs.
import time

PLAYER = (16.0, 0.12, 15.38)          # the seat in the cell (world)


def logs_since(ex, seq):
    r = ex.logs(sinceSeq=seq, limit=200)
    text = r if isinstance(r, str) else str(r)
    latest = seq
    for part in text.split():
        if part.startswith('latestSeq='):
            latest = int(part.split('=')[1])
    return text, latest


def wait_log(ex, needle, seq, timeout=400):
    t0 = time.time()
    while time.time() - t0 < timeout:
        text, latest = logs_since(ex, seq)
        if needle in text:
            return time.time(), latest
        seq = latest
        time.sleep(0.5)
    raise RuntimeError('no log line %r within %ds' % (needle, timeout))


def press_e(ex):
    return ex.press('primary', x=0, y=-50, z=0)   # an aim with nothing clickable: the press reaches the scene root


def full_run(ex, rec):
    _, seq = logs_since(ex, 0)
    ex.call('reload_scene')
    t1, seq = wait_log(ex, 'level 1 start', seq)
    play = t1 + 2.4                                # the black intro card fades for 2.4 s

    # 1. the cell, default camera: the thugs' first exchange in their bubbles
    time.sleep(max(0, play + 6.5 - time.time()))
    with rec.take('cell-talk'):
        time.sleep(11)

    # 2. shaking the chains, default camera: the struggle from behind and Crowbar's 'Is he... shaking?'
    press_e(ex); time.sleep(0.3)
    with rec.take('shake'):
        time.sleep(0.2); press_e(ex)
        time.sleep(13)

    # 3. the struggle from the front (a free camera between the chair and the thugs)
    ex.call('set_camera_pose', x=16.0, y=1.35, z=17.3, lookAtX=16.0, lookAtY=0.85, lookAtZ=15.3)
    time.sleep(1.5)
    with rec.take('shake-front'):
        time.sleep(0.3); press_e(ex); time.sleep(2.6); press_e(ex); time.sleep(2.8)
    ex.call('set_camera_mode', mode='third_person'); time.sleep(1.0)

    # 4. the spoon exchange (default camera)
    time.sleep(max(0, play + 57 - time.time()))
    with rec.take('spoon'):
        time.sleep(24)

    # 5. level 2: the belt carrying the chair, then the lava approach and the game's cinematic angle
    t2, seq = wait_log(ex, 'level 2 start', seq)
    play2 = t2 + 2.4
    time.sleep(max(0, play2 + 30 - time.time()))
    with rec.take('belt-ride'):
        time.sleep(8)
    _, seq = wait_log(ex, 'cine: shot start', seq)
    with rec.take('lava-approach'):
        time.sleep(16)

    # 6. level 3: the countdown, the vault door, the shark lining up and coming out (cut before it arrives)
    t3, seq = wait_log(ex, 'level 3 start', seq)
    play3 = t3 + 2.4
    time.sleep(max(0, play3 + 18 - time.time()))
    with rec.take('tank-wait'):
        time.sleep(8)
    time.sleep(max(0, play3 + 95 - time.time()))
    with rec.take('tank-release'):
        time.sleep(21)


TAKES = {'full-run': full_run}
