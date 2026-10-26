"""Locksmith: seated chain-struggle emote on the official Decentraland rig (Blender 5.x, headless).

  Blender --background Avatar_File.blend --python build_shake.py -- pose   # key poses + contact sheet only
  Blender --background Avatar_File.blend --python build_shake.py -- all    # full clip, renders, .blend, export

The clip is a one-shot (45 frames = 1.5 s at 30 fps) that starts and ends in a seated pose matching the
built-in `sittingChair2` idle the scene returns to (hips ~0.65 m, feet planted, hands on the thighs).
"""
import bpy, math, os, sys, json
from mathutils import Vector, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
SHOTS = os.path.join(OUT, 'shots')
os.makedirs(SHOTS, exist_ok=True)
STAGE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'pose'
PARAMS_FILE = os.path.join(HERE, 'params.json')

arm = bpy.data.objects['Armature']
vl = bpy.context.view_layer
scene = bpy.context.scene
scene.render.fps = 30
BASE = {}
PROPS = {
    'CTRL_Avatar_UpperBody': ['FK > IK Arm L', 'FK > IK Arm R', 'FK > IK Leg L', 'FK > IK Leg R',
                              'IsoRot Arm  FK L', 'IsoRot Arm  FK R'],
    'CTRL_Avatar_Head': ['Inherit Rotation'],
}

# ---------------------------------------------------------------- rig helpers (from blender-emote-patterns.md)
def capture_base():
    scene.frame_set(0)
    for pb in arm.pose.bones:
        BASE[pb.name] = (pb.location.copy(), pb.rotation_quaternion.copy(), pb.rotation_euler.copy(),
                         pb.scale.copy(), {k: pb[k] for k in PROPS.get(pb.name, [])})

def reset_all():
    for pb in arm.pose.bones:
        loc, rq, re, sc, props = BASE[pb.name]
        pb.location = loc; pb.rotation_quaternion = rq; pb.rotation_euler = re; pb.scale = sc
        for k, v in props.items():
            pb[k] = v
    vl.update()

def wpos(n): return arm.matrix_world @ arm.pose.bones[n].head
def wtail(n): return arm.matrix_world @ arm.pose.bones[n].tail

def rl(n, axis, deg):
    if isinstance(axis, str):
        axis = {'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[axis]
    pb = arm.pose.bones[n]
    q = Quaternion(axis, math.radians(deg))
    if pb.rotation_mode == 'QUATERNION':
        pb.rotation_quaternion = pb.rotation_quaternion @ q
    else:
        pb.rotation_euler = (pb.rotation_euler.to_quaternion() @ q).to_euler(pb.rotation_mode)

def rw(n, axis, deg):
    if isinstance(axis, str):
        axis = {'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[axis]
    vl.update()
    pb = arm.pose.bones[n]
    M = (arm.matrix_world @ pb.matrix).to_3x3().normalized()
    rl(n, M.inverted() @ Vector(axis), deg)

def move(n, dx=0, dy=0, dz=0):
    vl.update()
    pb = arm.pose.bones[n]
    M = (arm.matrix_world @ pb.matrix).to_3x3().normalized()
    pb.location += (M.inverted() @ Vector((dx, dy, dz))) * 100.0

def setprop(n, key, value): arm.pose.bones[n][key] = value

def key_all(frame, deform=False):
    vl.update()
    for pb in arm.pose.bones:
        if not pb.name.startswith('CTRL_') and not (deform and pb.bone.use_deform):
            continue
        pb.keyframe_insert('location', frame=frame)
        pb.keyframe_insert('rotation_quaternion' if pb.rotation_mode == 'QUATERNION' else 'rotation_euler', frame=frame)
        pb.keyframe_insert('scale', frame=frame)
        for k in PROPS.get(pb.name, []):
            pb.keyframe_insert('["%s"]' % k, frame=frame)

def new_action(name):
    act = bpy.data.actions.new(name)
    slot = act.slots.new('OBJECT', 'Avatar_Animation')
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = act
    arm.animation_data.action_slot = slot
    act.use_fake_user = True
    return act

def auto_sign(bone, axis, metric, prep=None):
    reset_all()
    if prep: prep()
    vl.update(); before = metric()
    rl(bone, axis, 15)
    vl.update(); after = metric()
    reset_all()
    return 1 if after > before else -1

# ---------------------------------------------------------------- signs
capture_base()
S = {}
for s, full in (('L', 'Left'), ('R', 'Right')):
    S['elbow' + s] = auto_sign('CTRL_FK_Avatar_ForeArm.' + s, 'X', lambda: -wpos('Avatar_%sHand' % full).y)
    S['wrist' + s] = auto_sign('CTRL_FK_Avatar_Hand.' + s, 'X', lambda: -wtail('Avatar_%sHand' % full).z)  # + = palm down
    S['curl' + s] = auto_sign('CTRL_Avatar_HandIndex1.' + s, 'X',
                              lambda: -(wpos('Avatar_%sHandIndex4' % full) - wpos('Avatar_%sHand' % full)).length)
S['headdown'] = auto_sign('CTRL_Avatar_Head', 'X', lambda: -wtail('Avatar_Head').y)      # + = face tilts forward/down
S['spinefwd'] = auto_sign('CTRL_FK_Avatar_Spine1', 'X', lambda: -wpos('Avatar_Head').y)  # + = lean forward
S['spinetwist'] = auto_sign('CTRL_FK_Avatar_Spine1', 'Y', lambda: wpos('Avatar_RightShoulder').y)  # + = right shoulder back
S['shoulderup_L'] = auto_sign('CTRL_Avatar_Shoulder.L', 'Z', lambda: wpos('Avatar_LeftArm').z)
S['shoulderup_R'] = auto_sign('CTRL_Avatar_Shoulder.R', 'Z', lambda: wpos('Avatar_RightArm').z)
S['shoulderup_axis'] = 'Z'
# shoulders: if Z does nothing, try X
if abs(S['shoulderup_L']) and True:
    reset_all(); z0 = wpos('Avatar_LeftArm').z; rl('CTRL_Avatar_Shoulder.L', 'Z', 15); vl.update(); dz = abs(wpos('Avatar_LeftArm').z - z0); reset_all()
    if dz < 0.005:
        S['shoulderup_axis'] = 'X'
        S['shoulderup_L'] = auto_sign('CTRL_Avatar_Shoulder.L', 'X', lambda: wpos('Avatar_LeftArm').z)
        S['shoulderup_R'] = auto_sign('CTRL_Avatar_Shoulder.R', 'X', lambda: wpos('Avatar_RightArm').z)
print('SIGNS', S)

# ---------------------------------------------------------------- pose vocabulary
def arm_fwd(s, d): rw('CTRL_FK_Avatar_Arm.' + s, 'X', -d)
def arm_out(s, d): rw('CTRL_FK_Avatar_Arm.' + s, 'Z', d if s == 'L' else -d)
def arm_twist(s, d): rl('CTRL_FK_Avatar_Arm.' + s, 'Y', d)
def elbow(s, d): rl('CTRL_FK_Avatar_ForeArm.' + s, 'X', S['elbow' + s] * d)
def wrist(s, d): rl('CTRL_FK_Avatar_Hand.' + s, 'X', S['wrist' + s] * d)
def curl(s, d):
    for f in ('Index', 'Middle', 'Ring', 'Pinky'):
        for j in '123':
            rl('CTRL_Avatar_Hand%s%s.%s' % (f, j, s), 'X', S['curl' + s] * d)
    rl('CTRL_Avatar_HandThumb2.%s' % s, 'X', S['curl' + s] * d * 0.5)
def head_down(d): rl('CTRL_Avatar_Head', 'X', S['headdown'] * d)
def head_turn(d): rw('CTRL_Avatar_Head', 'Z', d)
def head_tilt(d): rw('CTRL_Avatar_Head', 'Y', d)
def lean(d):  # forward lean distributed over the spine
    for b, w in (('CTRL_FK_Avatar_Spine', 0.3), ('CTRL_FK_Avatar_Spine1', 0.4), ('CTRL_FK_Avatar_Spine2', 0.3)):
        rl(b, 'X', S['spinefwd'] * d * w)
def twist(d):  # torso twist about the vertical axis (+ = right shoulder back)
    for b, w in (('CTRL_FK_Avatar_Spine', 0.3), ('CTRL_FK_Avatar_Spine1', 0.4), ('CTRL_FK_Avatar_Spine2', 0.3)):
        rw(b, 'Z', d * w)
def side(d):  # side bend (+ = toward avatar's left)
    for b, w in (('CTRL_FK_Avatar_Spine', 0.3), ('CTRL_FK_Avatar_Spine1', 0.4), ('CTRL_FK_Avatar_Spine2', 0.3)):
        rw(b, 'Y', -d * w)
def shrug(s, d): rl('CTRL_Avatar_Shoulder.' + s, S['shoulderup_axis'], S['shoulderup_' + s] * d)

DEFAULTS = dict(
    hips_dz=-0.33, hips_dy=0.0, hips_dx=0.0, hips_pitch=0.0,
    feet_fwd=0.30, feet_fwd_R_extra=0.0, feet_apart=0.02, knees_out=0.0,
    lean=18.0, twist=0.0, side=0.0,
    head=14.0, head_turn=0.0, head_tilt=0.0,
    L_fwd=58, L_out=4, L_twist=0, L_elbow=22, L_wrist=0, L_curl=15,
    R_fwd=58, R_out=4, R_twist=0, R_elbow=22, R_wrist=0, R_curl=15,
    shrug_L=0.0, shrug_R=0.0,
)
if os.path.exists(PARAMS_FILE):
    DEFAULTS.update(json.load(open(PARAMS_FILE)))
    print('PARAMS override', PARAMS_FILE)

def pose(**kw):
    p = dict(DEFAULTS)
    for k, v in kw.items():
        p[k] = DEFAULTS[k] + v if k in DEFAULTS else v
    reset_all()
    # feet first (IK stays on): forward and slightly apart, then drop the centre of gravity
    for s, sx in (('L', 1), ('R', -1)):
        # Starting_Pose has the right foot ~8 cm behind the left; even them up.
        move('CTRL_IK_Foot.' + s, dx=sx * p['feet_apart'], dy=-(p['feet_fwd'] + (p['feet_fwd_R_extra'] if s == 'R' else 0.0)))
        if p['knees_out']:
            move('CTRL_Avatar_Knee.' + s, dx=sx * p['knees_out'])
    move('CTRL_Avatar_UpperBody', dx=p['hips_dx'], dy=p['hips_dy'], dz=p['hips_dz'])
    if p['hips_pitch']:
        rw('CTRL_Avatar_UpperBody', 'X', p['hips_pitch'])
    lean(p['lean']); twist(p['twist']); side(p['side'])
    for s in 'LR':
        shrug(s, p['shrug_' + s])
        arm_fwd(s, p[s + '_fwd']); arm_out(s, p[s + '_out']); arm_twist(s, p[s + '_twist'])
        elbow(s, p[s + '_elbow']); wrist(s, p[s + '_wrist']); curl(s, p[s + '_curl'])
    head_down(p['head']); head_turn(p['head_turn']); head_tilt(p['head_tilt'])
    vl.update()

# ---------------------------------------------------------------- numeric checks
def in_area():
    vl.update()
    bad = []
    h = wpos('Avatar_Hips')
    if abs(h.x) > 1.0 or abs(h.y) > 1.0:
        bad.append(('ROOT', tuple(round(v, 2) for v in h)))
    for pb in arm.pose.bones:
        if not pb.bone.use_deform:
            continue
        for p in (wpos(pb.name), wtail(pb.name)):
            if abs(p.x) > 2.0 or abs(p.y) > 2.0 or p.z < -0.001 or p.z > 4.0:
                bad.append((pb.name, tuple(round(v, 2) for v in p)))
    return bad

def report(tag):
    vl.update()
    r3 = lambda v: [round(x, 3) for x in v]
    hl, hr, hd = wpos('Avatar_LeftHand'), wpos('Avatar_RightHand'), wpos('Avatar_Head')
    print('POSE %-8s hips %s head %s handL %s handR %s kneeL %s toeL %s toeR %s | hands %.2f headL %.2f headR %.2f | area %s' % (
        tag, r3(wpos('Avatar_Hips')), r3(hd), r3(hl), r3(hr), r3(wpos('Avatar_LeftLeg')),
        r3(wpos('Avatar_LeftToeBase')), r3(wpos('Avatar_RightToeBase')),
        (hl - hr).length, (hl - hd).length, (hr - hd).length, in_area() or 'ok'))

# ---------------------------------------------------------------- render
def setup_render():
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = scene.render.resolution_y = 420
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'SINGLE'
    scene.display.shading.single_color = (0.8, 0.7, 0.6)
    scene.display.shading.show_cavity = True
    for o in bpy.data.objects:
        if o.name.startswith('ShapeB') or o.name.startswith('WGT_') or o.name in (
                'Animation_Area_Reference', 'Root_Animation_Area', 'Knee'):
            o.hide_render = True
    cam = bpy.data.objects.new('AuthorCam', bpy.data.cameras.new('AuthorCam'))
    cam.data.lens = 40
    scene.collection.objects.link(cam); scene.camera = cam
    return cam

def aim(cam, loc, target):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

def render(path, frame=None):
    if frame is not None:
        scene.frame_set(frame)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

VIEWS = {'front': ((1.6, -2.2, 1.1), (0, -0.2, 0.6)),
         'frontal': ((0, -2.6, 0.9), (0, -0.2, 0.6)),
         'side': ((2.7, -0.2, 0.8), (0, -0.2, 0.6)),
         'top': ((0, -0.3, 3.2), (0, -0.3, 0.6))}

# ---------------------------------------------------------------- the clip
# (frame, pose overrides). 45 frames = 1.5 s. Two yanks, a twist, a slump, back to the seat.
CLIP = [
    (1, {}),
    (5, dict(lean=-10, head=-14, shrug_L=12, shrug_R=12, L_fwd=-4, R_fwd=-4, L_out=6, R_out=6,
             L_elbow=22, R_elbow=22, L_curl=30, R_curl=30, hips_dz=0.02)),                        # yank: wrists pull back
    (9, dict(lean=-4, twist=14, side=6, head=-4, head_turn=18, L_elbow=16, R_elbow=8,
             L_curl=25, R_curl=25)),                                                              # twist left
    (14, dict(lean=8, head=10, L_out=10, R_out=10, L_elbow=10, R_elbow=10, L_curl=35, R_curl=35,
              shrug_L=8, shrug_R=8)),                                                            # strain forward
    (19, dict(lean=-4, twist=-14, side=-6, head=-4, head_turn=-18, L_elbow=8, R_elbow=16,
              L_curl=25, R_curl=25)),                                                            # twist right
    (24, dict(lean=-14, head=-18, shrug_L=16, shrug_R=16, L_fwd=-6, R_fwd=-6, L_out=8, R_out=8,
              L_elbow=28, R_elbow=28, L_curl=35, R_curl=35, hips_dz=0.03, head_tilt=6)),         # big yank
    (29, dict(lean=10, head=14, L_elbow=4, R_elbow=4, L_curl=20, R_curl=20, head_tilt=-4)),      # slump
    (37, dict(lean=4, head=4, L_elbow=2, R_elbow=2, L_curl=10, R_curl=10)),
    (45, {}),
]
LAST = CLIP[-1][0]

cam = setup_render()

if STAGE == 'sweep':
    for cand in json.load(open(os.path.join(HERE, 'sweep.json'))):
        saved = dict(DEFAULTS); DEFAULTS.update(cand)
        pose(); report(json.dumps(cand, separators=(',', ':')))
        vl.update()
        print('   elbowL', [round(x, 3) for x in wpos('Avatar_LeftForeArm')], 'kneeL', [round(x, 3) for x in wpos('Avatar_LeftLeg')],
              'shoulderL', [round(x, 3) for x in wpos('Avatar_LeftArm')])
        DEFAULTS.clear(); DEFAULTS.update(saved)
    sys.exit(0)

if STAGE == 'pose':
    act = new_action('PoseTest')
    which = [(1, 'seat'), (5, 'yank'), (9, 'twistL'), (14, 'pull'), (24, 'bigyank'), (29, 'slump')]
    files = []
    for i, (f, tag) in enumerate(which):
        kw = dict(CLIP[[c[0] for c in CLIP].index(f)][1])
        pose(**kw); report(tag); key_all(i + 1, deform=(i == 0))
        for v in ('frontal', 'side', 'front'):
            p = os.path.join(SHOTS, 'pose_%02d_%s_%s.png' % (i, tag, v)); aim(cam, *VIEWS[v]); render(p, i + 1); files.append(p)
    json.dump(files, open(os.path.join(OUT, 'pose_files.json'), 'w'))
    print('POSE STAGE DONE', len(files), 'renders')
    sys.exit(0)

# full build
act = new_action('ChainStruggle')
for frame, kw in CLIP:
    pose(**kw)
    report('f%d' % frame)
    key_all(frame, deform=(frame == 1 or frame == LAST))
scene.frame_start = 1; scene.frame_end = LAST

# renders of a few frames incl. in-betweens (evaluated from the action)
files = []
for f in (1, 5, 9, 14, 19, 24, 29, 37, 45):
    for v in ('frontal', 'side'):
        p = os.path.join(SHOTS, 'clip_f%02d_%s.png' % (f, v)); aim(cam, *VIEWS[v]); render(p, f); files.append(p)
json.dump(files, open(os.path.join(OUT, 'clip_files.json'), 'w'))

# editable .blend before stripping
bpy.data.objects.remove(cam, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'locksmith_emotes.blend'))

# strip and export
if bpy.data.actions.get('Starting_Pose'):
    bpy.data.actions.remove(bpy.data.actions['Starting_Pose'])
if bpy.data.actions.get('PoseTest'):
    bpy.data.actions.remove(bpy.data.actions['PoseTest'])
for o in list(bpy.data.objects):
    if o.name != 'Armature':
        bpy.data.objects.remove(o, do_unlink=True)

def export_clip(act, last_frame, path, step=1):
    arm.animation_data.action = act
    arm.animation_data.action_slot = act.slots[0]
    scene.frame_start = 1; scene.frame_end = last_frame; scene.frame_set(1)
    for o in scene.objects:
        o.select_set(o == arm)
    vl.objects.active = arm
    kwargs = dict(filepath=path, export_format='GLB', use_selection=True, export_def_bones=True,
                  export_force_sampling=True, export_frame_step=step, export_frame_range=True,
                  export_animation_mode='ACTIVE_ACTIONS', export_animations=True,
                  export_anim_slide_to_zero=True, export_apply=False, export_materials='NONE',
                  export_cameras=False, export_lights=False, export_yup=True)
    try:
        bpy.ops.export_scene.gltf(**kwargs)
    except TypeError:
        for k in ('export_anim_slide_to_zero', 'export_materials', 'export_animation_mode'):
            kwargs.pop(k, None)
        bpy.ops.export_scene.gltf(**kwargs)
    print('EXPORTED', path, os.path.getsize(path))

export_clip(act, LAST, os.path.join(OUT, 'chain_struggle_emote.glb'))
print('BUILD DONE')
