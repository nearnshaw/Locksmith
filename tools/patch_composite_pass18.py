"""Pass 18: taller level 2 room (walls 7.2 m, ceiling above), a crate seat under the level 1 skeleton. Scene closed in the Hub."""
import json, sys, os, copy, math
PATH = os.path.join(sys.argv[1], 'assets/scene/main.composite')
c = json.load(open(PATH)); comps = {x['name']: x for x in c['components']}
TR = comps['core::Transform']['data']; NAME = comps['core-schema::Name']['data']
NODES = comps['inspector::Nodes']['data']['0']['json']['value']
def key(n): return next(k for k, v in NAME.items() if v['json']['value'] == n)
L2 = 600
for k, v in NAME.items():
    nm = v['json']['value']; j = TR.get(k, {}).get('json', {})
    if j.get('parent') == L2 and nm.startswith('Wall '):
        j['scale']['y'] = 1.8
TR[key('Ceiling L2')]['json']['position']['y'] = 7.3
TR[key('Room light L2')]['json']['position']['y'] = 6.8
lk = key('Room light L2')
if lk in comps['core::LightSource']['data']:
    comps['core::LightSource']['data'][lk]['json']['range'] = max(comps['core::LightSource']['data'][lk]['json'].get('range', 0), 16)
cam = key('Third person area L2')
area = comps['core::CameraModeArea']['data'][cam]['json']['area']; area['y'] = max(area['y'], 8)
TR[cam]['json']['position']['y'] = 3.6
# a crate under the skeleton, pushed back under its hips
sk = TR[key('Skeleton')]['json']; src = key('Box of lockpicks')
k = str(max(int(x) for x in TR) + 1)
for comp in c['components']:
    if src in comp['data'] and comp['name'] in ('core::GltfContainer', 'core::Transform', 'core-schema::Name'):
        comp['data'][k] = copy.deepcopy(comp['data'][src])
NAME[k]['json']['value'] = 'Skeleton seat'
yaw = 315
back = (math.sin(math.radians(yaw)) * -0.25, math.cos(math.radians(yaw)) * -0.25)
TR[k]['json'] = {'position': {'x': sk['position']['x'] + back[0], 'y': 0, 'z': sk['position']['z'] + back[1]},
                 'rotation': sk['rotation'], 'scale': {'x': 0.9, 'y': 0.62, 'z': 0.9}, 'parent': 512}
NODES.append({'entity': int(k), 'children': []}); next(n for n in NODES if n['entity'] == 512)['children'].append(int(k))
json.dump(c, open(PATH, 'w'), indent=2); print('level 2 raised, skeleton seat added')
