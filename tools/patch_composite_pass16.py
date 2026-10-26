"""Pass 16: larger lava pool, maintenance barrier flat against the east wall. Run with the scene closed in the Hub."""
import json, math, sys, os, copy
PATH = os.path.join(sys.argv[1], 'assets/scene/main.composite')
c = json.load(open(PATH)); comps = {x['name']: x for x in c['components']}
TR = comps['core::Transform']['data']; NAME = comps['core-schema::Name']['data']
NODES = comps['inspector::Nodes']['data']['0']['json']['value']
def key(n): return next(k for k, v in NAME.items() if v['json']['value'] == n)
def setp(n, **kw):
    j = TR[key(n)]['json']
    for a, v in kw.items(): j[a].update(v)
def q(deg): r = math.radians(deg) / 2; return {'x': 0.0, 'y': math.sin(r), 'z': 0.0, 'w': math.cos(r)}
# pit: x 19.65..23.55, z 4.2..13.8 (was z 7.1..10.9)
setp('Lava pit', position={'x': 21.6, 'z': 9.0}, scale={'x': 3.9, 'z': 9.6})
setp('Lava rim N', position={'x': 21.65, 'z': 13.95}, scale={'x': 4.4})
setp('Lava rim S', position={'x': 21.65, 'z': 4.05}, scale={'x': 4.4})
setp('Lava rim E', position={'x': 23.7, 'z': 9.0}, scale={'z': 10.2})
for n, (x, z) in {'Lava bubble 1': (20.6, 5.6), 'Lava bubble 2': (22.4, 9.6), 'Lava bubble 3': (21.3, 12.6), 'Lava bubble 4': (22.0, 7.4)}.items():
    setp(n, position={'x': x, 'z': z})
glow = key('Lava glow'); comps['core::LightSource']['data'][glow]['json']['range'] = 14
comps['core::LightSource']['data'][glow]['json']['intensity'] = 16000
# two more smoke emitters along the longer pool (copies of the existing one)
smoke = key('Lava smoke'); nid = max(int(k) for k in TR) + 1
for i, z in enumerate((5.5, 12.5)):
    k = str(nid + i)
    for comp in c['components']:
        if smoke in comp['data'] and comp['name'] not in ('inspector::Nodes',):
            comp['data'][k] = copy.deepcopy(comp['data'][smoke])
    NAME[k]['json']['value'] = 'Lava smoke %d' % (i + 2)
    TR[k]['json']['position']['z'] = z
    NODES.append({'entity': int(k), 'children': []})
    next(n for n in NODES if n['entity'] == TR[k]['json']['parent'])['children'].append(int(k))
# barrier flat against the east wall, facing into the room, clear of the pool
setp('Hazard barrier', position={'x': 23.75, 'z': 17.4}, rotation=q(90))
json.dump(c, open(PATH, 'w'), indent=2); print('lava enlarged, barrier moved')
