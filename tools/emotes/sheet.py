# Blender --background --factory-startup --python sheet.py -- out.png cols shot1.png shot2.png ...
import bpy, sys, numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
out, cols, files = argv[0], int(argv[1]), argv[2:]
rows = (len(files) + cols - 1) // cols; tile = 420
canvas = np.ones((rows * tile, cols * tile, 4), dtype=np.float32)
for i, f in enumerate(files):
    img = bpy.data.images.load(f)
    img.scale(tile, tile)
    px = np.array(img.pixels[:], dtype=np.float32).reshape(tile, tile, 4)
    r, c = rows - 1 - (i // cols), i % cols
    canvas[r * tile:(r + 1) * tile, c * tile:(c + 1) * tile] = px
res = bpy.data.images.new('sheet', cols * tile, rows * tile, alpha=True)
res.pixels = canvas.ravel().tolist()
res.filepath_raw = out; res.file_format = 'PNG'; res.save()
print('SHEET', out)
