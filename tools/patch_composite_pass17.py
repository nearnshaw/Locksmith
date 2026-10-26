"""Pass 17: raised conveyor on a plinth, west rim for the lava pit, no end-stop bumper. Run with the scene closed in the Hub."""
import json, sys, os, copy
PATH = os.path.join(sys.argv[1], 'assets/scene/main.composite')
c = json.load(open(PATH)); comps = {x['name']: x for x in c['components']}
TR = comps['core::Transform']['data']; NAME = comps['core-schema::Name']['data']
NODES = comps['inspector::Nodes']['data']['0']['json']['value']
H = 0.6  # belt raise
def key(n): return next(k for k, v in NAME.items() if v['json']['value'] == n)
def remove(k):
    for comp in c['components']: comp['data'].pop(k, None)
    e = int(k)
    for n in NODES:
        if e in n['children']: n['children'].remove(e)
    NODES[:] = [n for n in NODES if n['entity'] != e]
def clone(src_name, new_name, pos, scale):
    src = key(src_name); k = str(max(int(x) for x in TR) + 1)
    for comp in c['components']:
        if src in comp['data'] and comp['name'] != 'inspector::Nodes':
            comp['data'][k] = copy.deepcopy(comp['data'][src])
    NAME[k]['json']['value'] = new_name
    TR[k]['json']['position'] = dict(zip('xyz', pos)); TR[k]['json']['scale'] = dict(zip('xyz', scale))
    NODES.append({'entity': int(k), 'children': []})
    next(n for n in NODES if n['entity'] == TR[k]['json']['parent'])['children'].append(int(k))
    return k
# raise everything that is the belt
for n in ['Belt rail front', 'Belt rail back', 'Belt roller start', 'Belt roller end', 'Belt motor', 'Chair pallet L2'] + ['Belt slat %d' % i for i in range(1, 16)]:
    TR[key(n)]['json']['position']['y'] += H
# the bumper goes: nothing stands between the chair and the lava
for n in ['Belt end stop', 'Belt end stop stripe 1', 'Belt end stop stripe 2', 'Belt end stop stripe 3']:
    remove(key(n))
# concrete plinth under the belt, ending flush with the pit's edge (x 19.6)
k = clone('Belt motor', 'Belt plinth', (12.6, H / 2, 9.0), (14.0, H, 2.3))
comps['core::Material']['data'][k] = copy.deepcopy(comps['core::Material']['data'][key('Lava rim N')])
if 'core::MeshCollider' in comps:
    comps['core::MeshCollider']['data'][k] = {'json': {'collisionMask': 3, 'mesh': {'$case': 'box', 'box': {}}}}
# the missing west rim of the pit
clone('Lava rim S', 'Lava rim W', (19.55, 0.17, 9.0), (0.3, 0.34, 10.2))
json.dump(c, open(PATH, 'w'), indent=2); print('belt raised, plinth and west rim added, bumper removed')
