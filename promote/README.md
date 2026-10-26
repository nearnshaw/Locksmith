# Locksmith marketing kit

Made with the `promote-scene` skill (decentraland/sdk-skills PR #129) on 2026-10-25. Open `index.html` in a browser: it works offline, previews every post as an X or Instagram card, and has Copy text / Copy image / Download buttons. This folder is in `.dclignore`, so it is never deployed.

## What is here

| Path | What it is |
|---|---|
| `index.html` + `kit-data.js` | The kit page. `kit-data.js` is generated from `posts.json` with the images embedded. |
| `posts.json` | Source of truth: 18 posts (4 launch, 4 coming soon, 5 footage, 3 quote, 2 behind the scenes), listing copy, hashtags, brand colours. |
| `copy.md` | Every post and the listing copy as plain text. |
| `footage-shotlist.md` | What to record in the Explorer for the footage posts and the Foundation's screenshot and trailer asks. |
| `logo/` | `locksmith_wordmark.png` (transparent), `locksmith_lockup_on_black.png` (wordmark + "The escape artist. The famous one."), `locksmith_icon_1024.png` ("LOCKPICKS 0" avatar icon). |
| `images/renders/` | Five 1600 px hero renders built from the scene's own models: `chair`, `crate`, `belt`, `tank`, `cell`. |
| `images/keyart/cell_1920x1080.png` | Text-free key-art plate: an in-world capture of the cell (the player's nametag painted out). |
| `images/social/` | Key art with the wordmark at 1920×1080 and 1080×1080, the X header 1500×500, and three quote cards (`quote_lockpicks`, `quote_conveyor`, `quote_hopeless`). |
| `tools/` | The scripts that made all of it. |

## Link

Not published yet: every launch post keeps a `{LINK}` placeholder. After deploying, set `"link"` in `posts.json` (`https://decentraland.org/jump/?position=0,0` for Genesis City at the current base parcel, or `https://decentraland.org/jump/?realm=<name>` for a World) and rebuild.

## Regenerate (from the scene root, in this order)

```
B=/Applications/Blender.app/Contents/MacOS/Blender
python3 promote/tools/make_logo.py
$B -b -P promote/tools/render_shots.py -- preview            # check promote/images/preview/
$B -b -P promote/tools/render_shots.py -- final chair crate  # 1-2 min per shot; split the pass
$B -b -P promote/tools/render_shots.py -- final belt tank cell
python3 promote/tools/compose_social.py
python3 promote/tools/build_kit.py
```

## Notes

- **What could not be rendered.** The tied-up player and the two thugs are avatars, which only exist in the Explorer. They appear only in the key-art capture and in the footage posts, never in the Blender renders. The lava, belt, tank glass and water are rebuilt from the same simple shapes the scene uses. `render_shots.py` drops `*_collider` meshes on import (the skill's version did not, which rendered them as white boxes over the models).
- **Placeholders.** All five footage posts need recordings (see `footage-shotlist.md`). The Foundation also asks for one clean in-world 16:9 screenshot with people playing, 2–4 gameplay stills and an optional trailer under 30 s: all still to capture.
- **Kept out of the copy.** The endings (what happens at the end of the belt, what the shark does, the end card) and the game's inspirations.
- **Handles** are `@yourhandle` everywhere until you give real ones.
- **Marketing package status.** Done: title, link derivation, listing copy (short 141 characters, long), key art 16:9 and 1:1, social images, logo. In the kit: posts, quote cards, X header. Shot list: in-world screenshot, gameplay stills, trailer. Missing: real handles, the live link, a valid tag list in `scene.json` (see the report), event banners (not requested).

## Rights

- **Title.** "Locksmith" is a common word and other games may use it. This kit has not checked names or trademarks; that is for you to do before launch.
- **Music.** The countdown music is "Spy Glass" by Kevin MacLeod (incompetech.com), CC BY 4.0. Credit it in the scene description and in any post or clip that uses it.
- **Models.** Creator Hub asset packs and the OpenDCL catalog; the padlock, cell gate and seated emote were made for this scene.
- **Avatars.** Use only your own avatar in public footage.
- Decentraland brand guidelines and logo files: https://drive.google.com/drive/folders/1qX5snvvTxc-8fmX9RepW7BcPfWio1la7 · Content Policy: https://decentraland.org/content
