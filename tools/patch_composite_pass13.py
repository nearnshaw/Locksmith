"""Pass 13 composite patch — run ONLY with the scene closed in the Creator Hub.
  python3 -I patch_composite_pass13.py "<scene dir>"
- Replaces the nine cell-door primitives with one GLB gate ('Cell gate').
- Dresses level 1 (cell) and level 2 (conveyor hall) with catalog props.
- Adds a backing panel behind the level 3 lever so its conduit runs into something.
Keeps inspector::Nodes etc. consistent (edit mode). Makes a backup next to the composite.
"""
import json, math, shutil, sys, os

ROOT = sys.argv[1]
PATH = os.path.join(ROOT, 'assets/scene/main.composite')
shutil.copy(PATH, PATH.replace('main.composite', 'main.before-pass13.composite.bak.json'))
c = json.load(open(PATH))
comps = {x['name']: x for x in c['components']}
TR = comps['core::Transform']['data']
NAME = comps['core-schema::Name']['data']
GLTF = comps['core::GltfContainer']['data']
MESH = comps['core::MeshRenderer']['data']
COL = comps['core::MeshCollider']['data']
MAT = comps['core::Material']['data']
ANIM = comps['core::Animator']['data']
NODES = comps['inspector::Nodes']['data']['0']['json']['value']
L1, L2, L3 = 512, 600, 682

def node(entity):
    for n in NODES:
        if n['entity'] == entity:
            return n
    raise KeyError(entity)

def by_name(n):
    for k, v in NAME.items():
        if v['json']['value'] == n:
            return k
    return None

next_id = max(int(k) for k in TR) + 1
def alloc():
    global next_id
    i = next_id; next_id += 1
    return str(i)

def quat_y(deg):
    r = math.radians(deg) / 2
    return {'x': 0.0, 'y': math.sin(r), 'z': 0.0, 'w': math.cos(r)}

def add_entity(name, parent, pos, yaw=0.0, scale=(1, 1, 1)):
    k = alloc()
    TR[k] = {'json': {'position': {'x': pos[0], 'y': pos[1], 'z': pos[2]}, 'rotation': quat_y(yaw),
                      'scale': {'x': scale[0], 'y': scale[1], 'z': scale[2]}, 'parent': parent}}
    NAME[k] = {'json': {'value': name}}
    NODES.append({'entity': int(k), 'children': []})
    node(parent)['children'].append(int(k))
    return k

def add_gltf(k, src, has_collider, pointer_only=False):
    if has_collider:
        GLTF[k] = {'json': {'src': src, 'visibleMeshesCollisionMask': 0, 'invisibleMeshesCollisionMask': 3}}
    else:
        GLTF[k] = {'json': {'src': src, 'visibleMeshesCollisionMask': 1 if pointer_only else 0, 'invisibleMeshesCollisionMask': 0}}

def add_animator(k, clip, playing=True, loop=True):
    ANIM[k] = {'json': {'states': [{'clip': clip, 'playing': playing, 'loop': loop}]}}

def remove_entity(k):
    for comp in c['components']:
        comp['data'].pop(k, None)
    e = int(k)
    for n in NODES:
        if e in n['children']:
            n['children'].remove(e)
    NODES[:] = [n for n in NODES if n['entity'] != e]

# ---------------------------------------------------------------- 1. the cell gate
for n in ['Cell bar %d' % i for i in range(1, 8)] + ['Cell crossbar low', 'Cell crossbar high']:
    k = by_name(n)
    if k: remove_entity(k)
k = add_entity('Cell gate', L1, (14, 0, 19.55))
GLTF[k] = {'json': {'src': 'assets/Models/cell_gate.glb', 'visibleMeshesCollisionMask': 3, 'invisibleMeshesCollisionMask': 0}}

# ---------------------------------------------------------------- 2. level 1 dressing (room 24 x 20, chair at 12,0,9)
AP = 'assets/asset-packs/'
k = add_entity('Barrels', L1, (3.0, 0, 17.0), 25); add_gltf(k, 'assets/Models/barrel-4.glb', True)
k = add_entity('Old table', L1, (2.4, 0, 6.2), 90, (0.6, 0.6, 0.6)); add_gltf(k, AP + 'old_wooden_table/old_wooden_table/old_wooden_table.glb', True)
k = add_entity('Stool A', L1, (3.6, 0, 5.1), 15); add_gltf(k, AP + 'wooden_stool/wooden_stool/wooden_stool.glb', True)
k = add_entity('Stool B', L1, (3.5, 0, 7.4), -30); add_gltf(k, AP + 'wooden_stool/wooden_stool/wooden_stool.glb', True)
k = add_entity('Skeleton', L1, (21.6, 0, 3.2), 315, (0.55, 0.55, 0.55)); add_gltf(k, AP + 'sitting_skeleton/sitting_skeleton/sitting_skeleton.glb', False, pointer_only=True)
k = add_entity('Chandelier', L1, (12, 3.6, 12), 0); add_gltf(k, AP + 'iron_ring_chandelier/iron_ring_chandelier/iron_ring_chandelier.glb', False)
k = add_entity('Cobweb', L1, (22.4, 0, 18.4), 225); add_gltf(k, AP + 'draped_cobweb/draped_cobweb/draped_cobweb.glb', False)
k = add_entity('Rat', L1, (18.6, 0, 15.3), 230, (1.4, 1.4, 1.4)); add_gltf(k, 'assets/Models/mouse.glb', False, pointer_only=True); add_animator(k, 'Mouse_Action')

# ---------------------------------------------------------------- 3. level 2 dressing (belt x 6-20 at z 9, lava x 19.6-23.4 z 7-11)
k = add_entity('Pressure tank A', L2, (4.0, 0, 2.3), 0); add_gltf(k, AP + 'pipe_tank/pipe_tank/pipe_tank.glb', True)
k = add_entity('Pressure tank B', L2, (8.2, 0, 2.3), 0); add_gltf(k, AP + 'pipe_tank/pipe_tank/pipe_tank.glb', True)
k = add_entity('Junction box', L2, (14.5, 0, 0.6), 0); add_gltf(k, 'assets/Models/cable-box.glb', True)
add_animator(k, 'main', playing=False, loop=False)  # keep the lid still
k = add_entity('Utility box A', L2, (2.2, 0, 15.6), 0); add_gltf(k, AP + 'metal_utility_box/metal_utility_box/metal_utility_box.glb', True)
k = add_entity('Utility box B', L2, (17.3, 0, 1.2), 30); add_gltf(k, AP + 'metal_utility_box/metal_utility_box/metal_utility_box.glb', True)
k = add_entity('Hazard barrier', L2, (21.5, 0, 12.8), 0); add_gltf(k, AP + 'hazard_barrier/hazard_barrier/hazard_barrier.glb', False)
k = add_entity('Shelving A', L2, (3.6, 0, 19.3), 180); add_gltf(k, AP + 'wire_shelving_unit/wire_shelving_unit/wire_shelving_unit.glb', True)
k = add_entity('Shelving B', L2, (4.7, 0, 19.3), 180); add_gltf(k, AP + 'wire_shelving_unit/wire_shelving_unit/wire_shelving_unit.glb', True)
k = add_entity('Vending machine', L2, (1.2, 0, 14.0), 90); add_gltf(k, AP + 'vending_machine/vending_machine/vending_machine.glb', True)
k = add_entity('Ladder', L2, (15.5, 0, 19.0), 180); add_gltf(k, AP + 'red_ladder/red_ladder/red_ladder.glb', True)
k = add_entity('Control console', L2, (4.3, 0, 12.0), 160); add_gltf(k, 'assets/Models/computer-02.glb', True)
k = add_entity('Air vent', L2, (23.6, 3.3, 15), 270); add_gltf(k, AP + 'wall_air_vent/wall_air_vent/wall_air_vent.glb', False)

# ---------------------------------------------------------------- 4. level 3: a backing panel for the lever's conduit
lever = by_name('Lever')
lp = TR[lever]['json']['position']; lq = TR[lever]['json']['rotation']
yaw = math.degrees(2 * math.atan2(lq['y'], lq['w']))
# The switch box is ~0.1 m deep; the panel stands 0.14 m behind its back face, same facing, on the dock deck.
back = -0.16
s, co = math.sin(math.radians(yaw)), math.cos(math.radians(yaw))
px, pz = lp['x'] + back * s, lp['z'] + back * co
steel = {'json': {'material': {'$case': 'pbr', 'pbr': {'albedoColor': {'r': 0.3, 'g': 0.32, 'b': 0.35, 'a': 1}, 'metallic': 0.8, 'roughness': 0.45}}}}
k = add_entity('Lever panel', L3, (px, lp['y'] + 1.3, pz), yaw, (0.7, 2.6, 0.12))
MESH[k] = {'json': {'mesh': {'$case': 'box', 'box': {'uvs': []}}}}
MAT[k] = steel
k = add_entity('Lever panel cap', L3, (px, lp['y'] + 2.68, pz), yaw, (0.8, 0.16, 0.3))
MESH[k] = {'json': {'mesh': {'$case': 'box', 'box': {'uvs': []}}}}
MAT[k] = steel

json.dump(c, open(PATH, 'w'), indent=2)
print('patched; next entity id', next_id, 'nodes', len(NODES))
