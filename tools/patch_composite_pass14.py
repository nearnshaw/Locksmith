"""Pass 14: swap the level 2 vending machine for a stack of spare-parts crates. Run with the scene closed in the Hub."""
import json, math, sys, os
PATH = os.path.join(sys.argv[1], 'assets/scene/main.composite')
c = json.load(open(PATH)); comps = {x['name']: x for x in c['components']}
TR = comps['core::Transform']['data']; NAME = comps['core-schema::Name']['data']; GLTF = comps['core::GltfContainer']['data']
NODES = comps['inspector::Nodes']['data']['0']['json']['value']
CRATE = 'assets/asset-packs/closed_wooden_crate/Crate_01/Crate_01.glb'
def key(n): return next(k for k, v in NAME.items() if v['json']['value'] == n)
def q(deg): r = math.radians(deg) / 2; return {'x': 0.0, 'y': math.sin(r), 'z': 0.0, 'w': math.cos(r)}
vend = key('Vending machine')
NAME[vend]['json']['value'] = 'Spare parts crate'
GLTF[vend]['json'] = {'src': CRATE, 'visibleMeshesCollisionMask': 0, 'invisibleMeshesCollisionMask': 3}
TR[vend]['json'].update({'position': {'x': 1.4, 'y': 0, 'z': 14.0}, 'rotation': q(12), 'scale': {'x': 1.3, 'y': 1.3, 'z': 1.3}})
nid = max(int(k) for k in TR) + 1
for i, (pos, yaw, s) in enumerate([((1.5, 0.96, 14.05), -8, 1.0), ((1.35, 0, 15.25), 30, 1.1)]):
    k = str(nid + i)
    TR[k] = {'json': {'position': dict(zip('xyz', pos)), 'rotation': q(yaw), 'scale': {'x': s, 'y': s, 'z': s}, 'parent': 600}}
    NAME[k] = {'json': {'value': 'Spare parts crate %d' % (i + 2)}}
    GLTF[k] = {'json': {'src': CRATE, 'visibleMeshesCollisionMask': 0, 'invisibleMeshesCollisionMask': 3}}
    NODES.append({'entity': int(k), 'children': []})
    next(n for n in NODES if n['entity'] == 600)['children'].append(int(k))
json.dump(c, open(PATH, 'w'), indent=2); print('vending machine replaced by crates')
