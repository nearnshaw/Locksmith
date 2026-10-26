# Emote tooling (not part of the deployed scene)

`chain_struggle_emote.glb` (assets/animations) is the seated chain-struggle clip the player plays on E.
It was authored headless on the official Decentraland avatar rig (`Avatar_File.blend`, bundled with the
Decentraland Tools Blender add-on) with Blender 5.1:

```
Blender --background Avatar_File.blend --python build_shake.py -- pose   # key poses + contact sheet
Blender --background Avatar_File.blend --python build_shake.py -- sweep  # numbers for base-pose candidates (sweep.json)
Blender --background Avatar_File.blend --python build_shake.py -- all    # full clip, renders, .blend, GLB export
python3 verify_emote_glb.py out/chain_struggle_emote.glb
```

- `params.json` holds the base seat (hips 0.65 m and 0.20 m back, lean 32°, hands on the thighs) tuned so the
  clip starts and ends where the built-in `sittingChair2` idle leaves the avatar. Keyframes in `build_shake.py`
  are deltas on that base.
- `locksmith_emotes.blend` is the editable result (meshes included) for hand tweaks in Blender.
- `clip_sheet.png` shows frames 1, 5, 9, 14, 19, 24, 29, 37, 45 (frontal + side).
