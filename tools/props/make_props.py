"""Locksmith props, headless Blender 5.x:
  Blender --background --factory-startup --python make_props.py -- <out_dir>
Writes padlock.glb (origin at the shackle's hang point, hangs along -Y) and cell_gate.glb (origin at floor centre,
bars along +Y, 2.7 m wide, 4 m tall, in the XY plane; +Z faces the cell).
"""
import bpy, math, os, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for b in (bpy.data.meshes, bpy.data.materials):
        for d in list(b):
            if d.users == 0:
                b.remove(d)

def mat(name, rgb, metallic, roughness):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return m

def box(name, loc, size, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size
    o.data.materials.append(m); return o

def cyl(name, loc, r, h, m, axis='Y', verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc)
    o = bpy.context.object; o.name = name
    if axis == 'Y': o.rotation_euler = (math.radians(90), 0, 0)
    elif axis == 'X': o.rotation_euler = (0, math.radians(90), 0)
    o.data.materials.append(m); return o

def sphere(name, loc, r, m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=r, location=loc)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); return o

def join(objs, name):
    for o in bpy.data.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o

def export(o, path):
    for x in bpy.data.objects: x.select_set(x == o)
    bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_animations=False, export_cameras=False, export_lights=False)
    print('EXPORTED', path, os.path.getsize(path))
    # report bounds (Blender Z-up; glTF Y-up after export)
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
    mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
    print('BOUNDS (blender x,y,z)', [round(v, 3) for v in mn], [round(v, 3) for v in mx], 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))

# Blender is Z-up here; we build with Z as "up" and export Y-up. So "y down negative" below is Blender -Z.
clear()
brass = mat('Brass', (0.78, 0.6, 0.22), 0.9, 0.35)
steel = mat('Steel', (0.75, 0.76, 0.8), 0.9, 0.3)
dark = mat('Keyhole', (0.08, 0.07, 0.05), 0.2, 0.6)
iron = mat('Iron', (0.26, 0.27, 0.3), 0.85, 0.5)

# ---- padlock: hang point at the origin, shackle top just below it, body below the shackle.
parts = []
parts.append(cyl('shackle_l', (0, -0.035, -0.1), 0.011, 0.14, steel, axis='Z'))
parts.append(cyl('shackle_r', (0, 0.035, -0.1), 0.011, 0.14, steel, axis='Z'))
parts.append(cyl('shackle_top', (0, 0, -0.03), 0.011, 0.07, steel, axis='Y'))   # along Blender Y = depth
parts.append(sphere('shackle_c1', (0, -0.035, -0.03), 0.011, steel))
parts.append(sphere('shackle_c2', (0, 0.035, -0.03), 0.011, steel))
parts.append(box('body', (0, 0, -0.23), (0.06, 0.13, 0.15), brass))
parts.append(box('body_bevel', (0, 0, -0.158), (0.052, 0.122, 0.012), brass))
parts.append(box('keyhole', (0.0305, 0, -0.245), (0.004, 0.03, 0.045), dark))
parts.append(cyl('keyhole_top', (0.0305, 0, -0.23), 0.012, 0.004, dark, axis='X'))
parts.append(cyl('ring', (0, 0, 0.0), 0.02, 0.012, iron, axis='Y'))  # the hang ring at the origin
pad = join(parts, 'Padlock')
export(pad, os.path.join(OUT, 'padlock.glb'))

# ---- cell gate: 7 bars, 2 crossbars, hinge plates and a lock plate. Floor centre at origin, Z up.
clear()
iron = mat('Iron', (0.22, 0.23, 0.26), 0.85, 0.5)
rust = mat('Rust', (0.32, 0.2, 0.14), 0.4, 0.8)
parts = []
H = 4.0
for i in range(7):
    x = -1.26 + i * 0.42
    parts.append(cyl('bar%d' % i, (x, 0, H / 2), 0.032, H, iron, axis='Z', verts=12))
    parts.append(sphere('tip%d' % i, (x, 0, H + 0.01), 0.045, iron))
for z in (1.0, 2.7):
    parts.append(box('cross%.0f' % (z * 10), (0, 0, z), (2.72, 0.1, 0.09), iron))
# side frame bars and hinge plates
for x in (-1.36, 1.36):
    parts.append(box('frame%+.0f' % x, (x, 0, H / 2), (0.08, 0.12, H), iron))
for z in (0.7, 3.3):
    parts.append(box('hinge%.0f' % (z * 10), (-1.36, 0.0, z), (0.14, 0.16, 0.2), rust))
parts.append(box('lockplate', (1.2, 0.0, 1.3), (0.28, 0.14, 0.34), rust))
parts.append(cyl('lockhole', (1.2, 0.072, 1.3), 0.02, 0.01, mat('Keyhole', (0.08, 0.07, 0.05), 0.2, 0.6), axis='Y'))
gate = join(parts, 'CellGate')
export(gate, os.path.join(OUT, 'cell_gate.glb'))
print('PROPS DONE')
