# Hero renders of a Decentraland scene's own GLBs for its marketing kit (headless Blender, Cycles).
# Copy to <scene>/promote/tools/render_shots.py, then rewrite the SHOTS section for this scene.
#
#   B=/Applications/Blender.app/Contents/MacOS/Blender
#   $B -b -P promote/tools/render_shots.py -- preview [shot ...]   # 480 px, 12 samples -> promote/images/preview/
#   $B -b -P promote/tools/render_shots.py -- final   [shot ...]   # 1600 px, 128 samples -> promote/images/renders/
#   $B -b -P promote/tools/render_shots.py -- keyart preview       # same at 1/4 size, 12 samples -> promote/images/preview/
#   $B -b -P promote/tools/render_shots.py -- keyart               # KEYART_SHOT at KEYART_SIZES -> promote/images/keyart/
#   $B -b -P promote/tools/render_shots.py -- clip preview shot    # 640x360 EEVEE camera move -> promote/images/preview/<shot>_clip.mp4
#   $B -b -P promote/tools/render_shots.py -- clip shot [shot ...] # 1920x1080 EEVEE, CLIP_SECONDS long -> promote/clips/<shot>.mp4
#
# Always run the preview modes first and look at every PNG before the final pass.
# Clips are only made on request, for a post video (see the skill's references/video-posts.md): the same
# shot, 16:9, with a slow camera move (CLIP_MOVE / CLIP_MOVES) rendered in EEVEE at CLIP_FPS. Nothing in
# the scene animates: no avatars, no runtime effects. A 6 s 1080p clip took about 2 minutes on Apple Silicon.
# Finals take 1-3 min each (whole-interior scenes are at the slow end): render them one or two shots
# per command, or in the background, so a shell timeout does not kill the batch half-way.
import bpy, math, sys, os, time
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # scene root
P = os.path.join(ROOT, 'promote')

# ------------------------------------------------------------------ per-scene settings (edit)
MODELS = os.path.join(ROOT, 'assets', 'Models')   # relative GLB paths in load() resolve here
KEYART_SHOT = 'chair'                             # not used: the key art is an in-world capture (see posts.json keyart)
KEYART_SIZES = [(1920, 1080), (1080, 1080)]       # expanded kit: add (1080, 1350), (1080, 1920)
MONO = '/System/Library/Fonts/Supplemental/Courier New Bold.ttf'   # for in-scene 3D text (signs, boards)
CLIP_SECONDS = 6                                  # length of every -- clip
CLIP_FPS = 30                                     # matches the Remotion project in promote/video/
CLIP_SAMPLES = 16                                 # EEVEE TAA samples per frame; 48 looked no better and cost 3x
CLIP_MOVE = dict(dolly=-0.10, orbit=4.0, rise=0.0)   # default move: push in 10 % of dist, orbit 4 deg, no rise
CLIP_MOVES = {}                                   # per-shot overrides, e.g. {'hero': dict(orbit=12, dolly=0)}

# ------------------------------------------------------------------ mode
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = argv[0] if argv else 'preview'
DRAFT = MODE == 'preview' or (MODE in ('keyart', 'clip') and 'preview' in argv[1:])
ONLY = [KEYART_SHOT] if MODE == 'keyart' else [a for a in argv[1:] if a != 'preview']
OUT = os.path.join(P, 'images', 'preview') + '/' if DRAFT else (
    os.path.join(P, 'clips') + '/' if MODE == 'clip' else os.path.join(P, 'images', {'final': 'renders', 'keyart': 'keyart'}[MODE]) + '/')
os.makedirs(OUT, exist_ok=True)
RES = (360 if DRAFT else 1080) if MODE == 'clip' else (480 if DRAFT else 1600)
SAMPLES = 12 if DRAFT else (160 if MODE == 'keyart' else 128)
CAM = {}   # the last camera() call, so clip mode can animate it


# ------------------------------------------------------------------ helpers
def reset(aspect=1.0, exposure=-0.7):
    """Empty Cycles scene, AgX High Contrast, near-black world. aspect = width / height.
    In clip mode the engine is EEVEE and the frame is always 16:9 (the aspect argument is ignored)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    if MODE == 'clip':
        aspect = 16 / 9
        scn.render.engine = 'BLENDER_EEVEE'
        scn.eevee.taa_render_samples = 8 if DRAFT else CLIP_SAMPLES
        scn.eevee.use_raytracing = True
        scn.eevee.use_shadows = True
        scn.eevee.shadow_pool_size = '1024'   # a whole interior with many point lights overflows the 512 MB default
        scn.render.fps = CLIP_FPS
        scn.frame_start, scn.frame_end = 1, int(CLIP_SECONDS * CLIP_FPS)
    else:
        scn.render.engine = 'CYCLES'
        scn.cycles.samples = SAMPLES
        scn.cycles.use_denoising = True
        try:  # Apple Silicon GPU; falls back to CPU silently
            prefs = bpy.context.preferences.addons['cycles'].preferences
            prefs.compute_device_type = 'METAL'
            prefs.get_devices()
            for d in prefs.devices:
                d.use = True
            scn.cycles.device = 'GPU'
        except Exception as ex:
            print('GPU setup failed, using CPU:', ex)
    scn.render.resolution_x = int(round(RES * aspect))
    scn.render.resolution_y = RES
    scn.view_settings.view_transform = 'AgX'
    scn.view_settings.look = 'AgX - High Contrast'
    scn.view_settings.exposure = exposure
    scn.render.image_settings.file_format = 'PNG'
    world = bpy.data.worlds.new('w'); scn.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.004, 0.008, 1)
    return scn


def haze(density=0.04, color=(0.8, 0.78, 0.7)):
    """World volume scatter: visible light shafts. 0.02 subtle, 0.06-0.07 thick."""
    wn = bpy.context.scene.world.node_tree
    vol = wn.nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Density'].default_value = density
    vol.inputs['Anisotropy'].default_value = 0.4
    vol.inputs['Color'].default_value = (*color, 1)
    wn.links.new(vol.outputs['Volume'], wn.nodes['World Output'].inputs['Volume'])


def bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    if not pts:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def load(path, at=(0, 0, 0), rot=0, scale=1.0, align_long_x=False, anchor='bottom'):
    """Import a GLB under an empty, normalised by its world bounding box so its footprint centre sits
    at `at` (Blender coords: X right, Y away from camera at az=0, Z up). anchor='bottom' puts the
    lowest point on at[2]; 'center' centres it vertically. align_long_x turns long pieces (walls,
    benches, counters) so their long axis runs along X before `rot` (degrees, about Z) is applied."""
    if not os.path.isabs(path):
        path = os.path.join(MODELS, path)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    # Collider meshes (*_collider) are invisible in-world but import as plain white geometry: drop them.
    for o in [o for o in new if '_collider' in o.name.lower() or o.name.lower().endswith('collider')]:
        new.remove(o); bpy.data.objects.remove(o, do_unlink=True)
    root = bpy.data.objects.new(os.path.basename(path) + '_root', None)
    bpy.context.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None or o.parent not in new:
            o.parent = root
    bpy.context.view_layer.update()
    lo, hi = bbox(new)
    if align_long_x and (hi.y - lo.y) > (hi.x - lo.x):
        rot += 90
    root.rotation_euler = (0, 0, math.radians(rot))
    root.scale = (scale, scale, scale)
    bpy.context.view_layer.update()
    lo, hi = bbox(new)
    c = (lo + hi) / 2
    dz = lo.z if anchor == 'bottom' else c.z
    root.location = (at[0] - c.x, at[1] - c.y, at[2] - dz)
    bpy.context.view_layer.update()
    return new


def room(floor, wall=None, ceiling=None, tile=8.0, back_y=5.0, centre_wall=None, ceiling_z=6.0):
    """A 3x3 patch of the scene's floor tiles centred on the origin (tiles at -tile/0/+tile, so no seam
    runs through the middle of the shot), a back wall at y=back_y made of three pieces, and an optional
    ceiling row. Put a doorway piece in `centre_wall`; never stack it in front of a plain wall."""
    objs = []
    for x in (-tile, 0, tile):
        for y in (-tile, 0, tile):
            objs += load(floor, (x, y, 0))
    if wall:
        for x in (-tile, tile):
            objs += load(wall, (x, back_y, 0), align_long_x=True)
        objs += load(centre_wall or wall, (0, back_y, 0), align_long_x=True)
    if ceiling:
        for x in (-tile, 0, tile):
            objs += load(ceiling, (x, 0, ceiling_z))
    return objs


def light_area(loc, energy=400, color=(1.0, 0.93, 0.78), size=(4.0, 0.6), rot=(0, 0, 0)):
    """Rectangular area light. Overhead fluorescent: loc z just under the ceiling, rot (0,0,0).
    Backlight through a doorway: behind the opening, rot=(radians(90),0,0), big size, high energy."""
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot)
    a = bpy.context.active_object.data
    a.shape = 'RECTANGLE'; a.size = size[0]; a.size_y = size[1]; a.energy = energy; a.color = color
    return bpy.context.active_object


def light_point(loc, energy=600, color=(1, 0.1, 0.06), radius=0.8):
    bpy.ops.object.light_add(type='POINT', location=loc)
    l = bpy.context.active_object.data
    l.energy = energy; l.color = color; l.shadow_soft_size = radius
    return bpy.context.active_object


def _pose(target, az, el, dist):
    az_r, el_r = math.radians(az), math.radians(el)
    d = Vector((math.cos(el_r) * math.sin(az_r), -math.cos(el_r) * math.cos(az_r), math.sin(el_r)))
    pos = Vector(target) + d * dist
    return pos, (Vector(target) - pos).to_track_quat('-Z', 'Y').to_euler()


def camera(target, az=0, el=12, dist=6.0, lens=40, fstop=4.0, focus=None):
    """Camera looking at `target`. az=0 looks along +Y from the -Y side; positive az orbits
    counter-clockwise seen from above. el in degrees above the target. DOF focused on the target.
    Clip mode animates this camera along CLIP_MOVE from the pose given here."""
    pos, rot = _pose(target, az, el, dist)
    bpy.ops.object.camera_add(location=pos)
    cam = bpy.context.active_object
    cam.rotation_euler = rot
    cam.data.lens = lens
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = focus or dist
    cam.data.dof.aperture_fstop = fstop
    bpy.context.scene.camera = cam
    CAM.update(obj=cam, target=Vector(target), az=az, el=el, dist=dist, focus=focus)
    return cam


def text(body, at, size=0.5, color=(1, 0.6, 0.1), emit=6.0, font=MONO, rot=(90, 0, 0), align='CENTER'):
    """Emissive 3D text, e.g. to fill a sign or departures board the scene fills at runtime."""
    bpy.ops.object.text_add(location=at, rotation=tuple(math.radians(r) for r in rot))
    t = bpy.context.active_object
    t.data.body = body; t.data.font = bpy.data.fonts.load(font); t.data.size = size
    t.data.align_x = align; t.data.align_y = 'CENTER'
    m = bpy.data.materials.new('txt'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Emission Color'].default_value = (*color, 1)
    b.inputs['Emission Strength'].default_value = emit
    t.data.materials.append(m)
    return t


def render_clip(name):
    """Keyframe the shot's camera from its pose to pose + CLIP_MOVE and render CLIP_SECONDS of H.264."""
    scn = bpy.context.scene
    cam, mv = CAM['obj'], {**CLIP_MOVE, **CLIP_MOVES.get(name, {})}
    n = scn.frame_end
    for frame, k in ((1, 0.0), (n, 1.0)):
        dist = CAM['dist'] * (1 + mv['dolly'] * k)
        pos, rot = _pose(CAM['target'], CAM['az'] + mv['orbit'] * k, CAM['el'] + mv['rise'] * k, dist)
        cam.location, cam.rotation_euler = pos, rot
        cam.data.dof.focus_distance = (CAM['focus'] or CAM['dist']) * dist / CAM['dist']
        cam.keyframe_insert('location', frame=frame)
        cam.keyframe_insert('rotation_euler', frame=frame)
        cam.data.dof.keyframe_insert('focus_distance', frame=frame)
    scn.frame_set(1)
    if hasattr(scn.render.image_settings, 'media_type'):   # Blender 5+
        scn.render.image_settings.media_type = 'VIDEO'
    scn.render.image_settings.file_format = 'FFMPEG'
    scn.render.ffmpeg.format = 'MPEG4'
    scn.render.ffmpeg.codec = 'H264'
    scn.render.ffmpeg.constant_rate_factor = 'HIGH'
    scn.render.ffmpeg.gopsize = CLIP_FPS
    scn.render.use_file_extension = True
    suffix = '_clip' if DRAFT else ''
    scn.render.filepath = OUT + name + suffix + '.mp4'
    t0 = time.time()
    bpy.ops.render.render(animation=True)
    # Blender may append the frame range to a movie file name; normalise to <name>.mp4.
    made = [f for f in os.listdir(OUT) if f.startswith(name + suffix) and f.endswith('.mp4')]
    for f in made:
        if f != name + suffix + '.mp4':
            os.replace(OUT + f, OUT + name + suffix + '.mp4')
    print('RENDERED %s (%.0f s, %d frames at %dx%d)' % (OUT + name + suffix + '.mp4', time.time() - t0, n,
                                                       scn.render.resolution_x, scn.render.resolution_y))


def render(name):
    scn = bpy.context.scene
    if MODE == 'clip':
        return render_clip(name)
    if MODE == 'keyart':
        for w, h in KEYART_SIZES:
            scn.render.resolution_x, scn.render.resolution_y = (w // 4, h // 4) if DRAFT else (w, h)
            scn.render.filepath = OUT + '%s_%dx%d.png' % (name, w, h)
            t0 = time.time()
            bpy.ops.render.render(write_still=True)
            print('RENDERED %s (%.0f s)' % (scn.render.filepath, time.time() - t0))
        return
    scn.render.filepath = OUT + name + '.png'
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print('RENDERED %s (%.0f s)' % (scn.render.filepath, time.time() - t0))


# ------------------------------------------------------------------ SHOTS (Locksmith)
# Built only from the scene's own GLBs and the same primitives the composite uses (belt, lava, tank glass).
# The tied-up player and the thugs are AvatarShapes: they cannot be rendered here (footage posts cover them).
AP = os.path.join(ROOT, 'assets', 'asset-packs')
STONE_FLOOR = os.path.join(AP, 'large_stone_floor/Stone_Module_4M/Stone_Module_4M.glb')
STONE_WALL = os.path.join(AP, 'stone_brick_wall/Module_Stone_Straight_01/Module_Stone_Straight_01.glb')
STONE_DOOR = os.path.join(AP, 'stone_brick_threshold/Module_Stone_Straight_Door_01/Module_Stone_Straight_Door_01.glb')
CONCRETE = os.path.join(AP, 'concrete_wall/Concrete_Wall.glb')
CHAIR = os.path.join(AP, 'orange_folding_chair/orange_folding_chair/orange_folding_chair.glb')
CRATE = os.path.join(AP, 'closed_wooden_crate/Crate_01/Crate_01.glb')
SKELETON = os.path.join(AP, 'sitting_skeleton/sitting_skeleton/sitting_skeleton.glb')
VAULT = os.path.join(AP, 'lab_vault_door/lab_vault_door.glb')
SIGN = os.path.join(AP, 'warning_sign/Warning_Sign.glb')
STOP = os.path.join(AP, 'button_pedestal/button_pedestal.glb')
FONT = '/System/Library/Fonts/Supplemental/Impact.ttf'
WARM = (1.0, 0.55, 0.22)


def mat(name, color, metallic=0.0, rough=0.6, emit=0.0, alpha=1.0, transmission=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*color, 1)
        b.inputs['Emission Strength'].default_value = emit
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    return m


def box(loc, size, m, rot_z=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=(0, 0, math.radians(rot_z)))
    o = bpy.context.active_object; o.scale = size; o.data.materials.append(m)
    return o


def chain(points, m, link=0.07):
    """Iron links (small tori) along a polyline, alternating 90 degrees, like the restraints in the game."""
    k = 0
    for a, b in zip(points, points[1:]):
        a, b = Vector(a), Vector(b)
        n = max(1, int((b - a).length / (link * 1.3)))
        d = (b - a).normalized()
        for i in range(n):
            p = a + (b - a) * (i / n)
            bpy.ops.mesh.primitive_torus_add(major_radius=link * 0.55, minor_radius=link * 0.14, location=p)
            t = bpy.context.active_object
            t.rotation_euler = d.to_track_quat('X', 'Z').to_euler()
            t.rotation_euler.rotate_axis('X', math.radians(90 if k % 2 else 0))
            t.data.materials.append(m); k += 1


def torch(at):
    load('antorcha.glb', at)
    light_point((at[0], at[1] - 0.45, at[2] + 1.9), energy=160, color=WARM, radius=0.3)


def stone_room(doorway=True, back_y=3.2):
    room(STONE_FLOOR, STONE_WALL, tile=4.0, back_y=back_y, centre_wall=STONE_DOOR if doorway else None)


def shot_chair():
    """The seat: the orange folding chair, a chain across it and the brass padlock hanging off the side."""
    reset(exposure=-0.3); haze(0.012, color=(1.0, 0.8, 0.6))
    stone_room()
    load('cell_gate.glb', (0, 3.0, 0))
    load(CHAIR, (0, 0.4, 0), rot=18, scale=0.9)
    iron = mat('iron', (0.28, 0.29, 0.32), metallic=0.9, rough=0.35)
    chain([(-0.42, 0.55, 0.62), (-0.2, 0.25, 0.6), (0.2, 0.18, 0.6), (0.42, 0.45, 0.62)], iron)
    chain([(0.42, 0.45, 0.62), (0.46, 0.45, 0.5)], iron)
    load('padlock.glb', (0.47, 0.45, 0.2), rot=-20)
    torch((-2.2, 2.75, 0.9)); torch((2.2, 2.75, 0.9))
    light_area((0, -1.5, 4.5), energy=40, color=(0.6, 0.7, 1.0), size=(3, 3))
    light_point((1.0, -0.9, 1.5), energy=90, color=(1, 0.8, 0.55), radius=0.6)
    camera((0.12, 0.4, 0.6), az=-24, el=10, dist=2.5, lens=40, fstop=2.8)
    render('chair')


def shot_crate():
    """The box of lockpicks, labelled, 3.4 metres away. The chair edge out of focus in the foreground."""
    reset(exposure=-0.4); haze(0.012, color=(1.0, 0.8, 0.6))
    stone_room(doorway=False)
    load(CRATE, (0, 1.2, 0), rot=-12, scale=1.3)
    gold = (0.95, 0.72, 0.22)
    text('LOCKPICKS', (0.02, 0.66, 0.62), size=0.24, color=gold, emit=2.5, font=FONT, rot=(90, 0, -12))
    text('(assorted, 24 pc)', (0.02, 0.66, 0.42), size=0.09, color=(0.95, 0.9, 0.8), emit=1.5, font=MONO, rot=(90, 0, -12))
    load(CHAIR, (-0.9, -2.4, 0), rot=150, scale=0.9)
    torch((1.6, 2.75, 0.9))
    light_point((0.7, -0.5, 1.5), energy=110, color=(1, 0.75, 0.45), radius=0.5)
    light_area((0, -2, 4.5), energy=40, color=(0.6, 0.7, 1.0), size=(3, 3))
    camera((0, 1.1, 0.55), az=8, el=4, dist=4.6, lens=50, fstop=2.0, focus=4.6)
    render('crate')


def shot_belt():
    """Conveyor 3: the chair on its pallet on the raised belt, the long lava pool glowing below its end."""
    reset(exposure=-0.9); haze(0.015, color=(1.0, 0.6, 0.35))
    floor = mat('floor', (0.16, 0.15, 0.15), rough=0.9)
    box((0, 0, -0.05), (30, 24, 0.1), floor)
    for x in range(-8, 10, 2):
        load(CONCRETE, (x, 7.0, 0), align_long_x=True)
    H = 0.6
    concrete = mat('plinth', (0.1, 0.09, 0.09), rough=0.9)
    box((-1.0, 0, H / 2), (14, 2.3, H), concrete)            # plinth, ends at the pit edge x = 6
    rail = mat('rail', (0.85, 0.45, 0.12), metallic=0.6, rough=0.45)
    slat = mat('slat', (0.12, 0.12, 0.13), metallic=0.4, rough=0.6)
    box((-1.0, -0.95, H + 0.14), (14, 0.1, 0.12), rail); box((-1.0, 0.95, H + 0.14), (14, 0.1, 0.12), rail)
    for i in range(16):
        box((-7.6 + i * 0.85, 0, H + 0.12), (0.7, 1.8, 0.05), slat)
    box((4.6, 0, H + 0.17), (1.1, 1.1, 0.04), mat('pallet', (0.55, 0.36, 0.2), rough=0.8))
    load(CHAIR, (4.6, 0.05, H + 0.19), rot=-90, scale=0.9)
    lava = mat('lava', (1.0, 0.32, 0.04), emit=9.0, rough=0.3)
    box((8.0, 0, 0.05), (3.9, 9.6, 0.1), lava)               # pit x 6.05..9.95, 9.6 m long
    rim = mat('rim', (0.1, 0.09, 0.09), rough=0.9)
    for (cx, cy, sx, sy) in ((8.0, 4.95, 4.4, 0.3), (8.0, -4.95, 4.4, 0.3), (10.1, 0, 0.3, 10.2), (5.95, 0, 0.3, 10.2)):
        box((cx, cy, 0.17), (sx, sy, 0.34), rim)
    light_point((8.0, 0, 1.2), energy=1500, color=(1.0, 0.35, 0.08), radius=2.5)
    light_point((8.0, 3.5, 1.0), energy=500, color=(1.0, 0.35, 0.08), radius=2.0)
    light_point((8.0, -3.5, 1.0), energy=500, color=(1.0, 0.35, 0.08), radius=2.0)
    load(SIGN, (5.4, 4.0, 0), rot=180)
    light_area((0, 0, 6), energy=120, color=(0.7, 0.75, 1.0), size=(10, 2))
    camera((6.0, 0, 0.5), az=-18, el=12, dist=7.0, lens=32, fstop=5)
    render('belt')


def shot_tank():
    """The tank room: a shark behind glass, the vault door, the countdown board, water to the chest."""
    reset(exposure=-0.2); haze(0.015, color=(0.6, 0.8, 1.0))
    for x in range(-8, 10, 2):
        load(CONCRETE, (x, 6.5, 0), align_long_x=True)
    floor = mat('floor', (0.1, 0.11, 0.12), rough=0.9)
    box((0, 0, -0.05), (30, 20, 0.1), floor)
    glass = mat('glass', (0.6, 0.85, 1.0), rough=0.05, alpha=0.12)
    box((0, 4.2, 1.7), (9.0, 3.6, 3.4), glass)
    light_point((1.5, 4.4, 2.6), energy=400, color=(0.4, 0.8, 1.0), radius=1.0)
    light_point((-2.5, 4.4, 2.6), energy=250, color=(0.4, 0.8, 1.0), radius=1.0)
    load('shark.glb', (-2.5, 4.8, 1.1), rot=90, scale=0.45)
    load(VAULT, (0, 2.35, 0), rot=0, scale=0.55)
    board = mat('board', (0.05, 0.04, 0.04), rough=0.8)
    box((0, 2.3, 4.25), (3.6, 0.15, 0.8), board)
    text('SHARK RELEASE IN 0:52', (0, 2.2, 4.25), size=0.32, color=(1.0, 0.15, 0.08), emit=5.0, font=FONT, rot=(90, 0, 0))
    water = mat('water', (0.12, 0.38, 0.5), rough=0.08, transmission=0.7)
    box((0, -2.0, 0.55), (30, 12, 0.02), water)
    light_area((0, 4.2, 3.2), energy=1400, color=(0.45, 0.8, 1.0), size=(8, 3))
    light_point((-5.5, 1.5, 3.5), energy=200, color=(1.0, 0.2, 0.1), radius=1.0)
    light_area((0, -4, 5), energy=80, color=(0.8, 0.85, 1.0), size=(8, 4))
    camera((0.4, 3.2, 1.8), az=-12, el=6, dist=10.5, lens=32, fstop=11)
    render('tank')


def shot_cell():
    """The cell: the iron gate in its arch, torchlight, and the previous captive in the corner."""
    reset(exposure=-0.5); haze(0.02, color=(1.0, 0.75, 0.5))
    stone_room()
    load('cell_gate.glb', (0, 3.0, 0))
    load(SKELETON, (2.6, 2.0, 0), rot=200, scale=0.55)
    load('barrel-4.glb', (-2.8, 2.2, 0), rot=10)
    torch((-1.6, 2.75, 0.9)); torch((1.6, 2.75, 0.9))
    light_area((0, 5.0, 2.0), energy=500, color=(1.0, 0.6, 0.3), size=(3, 4), rot=(math.radians(90), 0, 0))
    light_point((2.2, 1.0, 1.2), energy=60, color=(1, 0.75, 0.5), radius=0.6)
    camera((0.4, 2.4, 1.6), az=-10, el=6, dist=6.0, lens=32, fstop=4)
    render('cell')


SHOTS = {
    'chair': shot_chair,
    'crate': shot_crate,
    'belt': shot_belt,
    'tank': shot_tank,
    'cell': shot_cell,
}

for name, fn in SHOTS.items():
    if ONLY and name not in ONLY:
        continue
    print('=== shot', name)
    fn()
