"""Locksmith tutorial pages v4: big, simple, almost no text.
  python3 -I make_tutorial_v4.py <out_dir>
Writes tutorial_1.png and tutorial_2.png (1600 x 900). Shown at ~1120 px wide, so every label is >= 52 px here.
"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1]
W, H = 1600, 900
BG = (22, 20, 26); PANEL = (34, 31, 40); BRASS = (201, 152, 58); BRASS_D = (138, 100, 34)
STEEL = (178, 184, 196); STEEL_D = (110, 116, 128); GOLD = (246, 196, 64); GREEN = (88, 214, 120)
AMBER = (255, 168, 40); WHITE = (244, 238, 226); DIM = (160, 150, 140); RED = (232, 78, 64)

def font(size, heavy=True):
    paths = ['/System/Library/Fonts/Supplemental/Arial Black.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'] if heavy \
        else ['/System/Library/Fonts/Supplemental/Arial Bold.ttf']
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()

def canvas():
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    return im, d

def label(d, xy, text, size, fill=WHITE, anchor='la', heavy=True):
    f = font(size, heavy)
    x, y = xy
    d.text((x + 3, y + 3), text, font=f, fill=(0, 0, 0), anchor=anchor)
    d.text((x, y), text, font=f, fill=fill, anchor=anchor)

def keycap(d, cx, cy, key, size=96):
    r = size // 2
    d.rounded_rectangle((cx - r, cy - r + 8, cx + r, cy + r + 8), radius=18, fill=(12, 12, 14))
    d.rounded_rectangle((cx - r, cy - r, cx + r, cy + r), radius=18, fill=(236, 230, 214), outline=(90, 84, 74), width=4)
    label(d, (cx, cy + 2), key, int(size * 0.55), fill=(30, 28, 26), anchor='mm')

def mouse_icon(d, cx, cy, s=1.0):
    w, h = int(70 * s), int(108 * s)
    d.rounded_rectangle((cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2), radius=int(34 * s), fill=(236, 230, 214), outline=(90, 84, 74), width=4)
    d.line((cx, cy - h // 2 + 6, cx, cy - h // 10), fill=(90, 84, 74), width=4)
    # up arrow beside it
    ax = cx + w // 2 + 34
    d.polygon([(ax, cy - 44), (ax - 22, cy - 12), (ax + 22, cy - 12)], fill=GOLD)
    d.rectangle((ax - 8, cy - 14, ax + 8, cy + 40), fill=GOLD)

# ------------------------------------------------------------------ page 1: lift the pins to the line
im, d = canvas()
# lock housing, with the plug below the shear line
X0, X1, Y0, Y1 = 90, 1010, 120, 760
SHEAR = 470
d.rounded_rectangle((X0, Y0, X1, Y1), radius=36, fill=(58, 48, 34), outline=BRASS_D, width=6)
d.rounded_rectangle((X0 + 20, SHEAR, X1 - 20, Y1 - 24), radius=24, fill=(92, 74, 44))
# pin chambers
pins = [(220, 'set'), (390, 'set'), (560, 'lift'), (730, 'down'), (900, 'down')]
for x, state in pins:
    d.rectangle((x - 46, Y0 + 30, x + 46, Y1 - 120), fill=(30, 26, 22))
    if state == 'set':
        top = SHEAR - 150
        d.rounded_rectangle((x - 38, top, x + 38, SHEAR - 4), radius=10, fill=STEEL, outline=STEEL_D, width=3)       # driver pin
        d.rounded_rectangle((x - 38, SHEAR + 4, x + 38, SHEAR + 150), radius=10, fill=BRASS, outline=BRASS_D, width=3)  # key pin
        d.ellipse((x - 30, Y0 + 50, x + 30, Y0 + 110), fill=GREEN)
        d.line((x - 14, Y0 + 82, x - 2, Y0 + 96, x + 18, Y0 + 66), fill=(16, 60, 30), width=8, joint='curve')
    elif state == 'lift':
        off = 34  # just below the line: lifting
        d.rounded_rectangle((x - 38, SHEAR - 150 + off, x + 38, SHEAR - 4 + off), radius=10, fill=STEEL, outline=AMBER, width=5)
        d.rounded_rectangle((x - 38, SHEAR + 4 + off, x + 38, SHEAR + 150 + off), radius=10, fill=BRASS, outline=AMBER, width=5)
        d.polygon([(x, Y0 + 44), (x - 26, Y0 + 92), (x + 26, Y0 + 92)], fill=AMBER)
    else:
        off = 90
        d.rounded_rectangle((x - 38, SHEAR - 150 + off, x + 38, SHEAR - 4 + off), radius=10, fill=STEEL, outline=STEEL_D, width=3)
        d.rounded_rectangle((x - 38, SHEAR + 4 + off, x + 38, SHEAR + 110 + off), radius=10, fill=BRASS, outline=BRASS_D, width=3)
# the gold shear line, dashed and glowing
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
gd.line((X0 + 10, SHEAR, X1 - 10, SHEAR), fill=GOLD + (170,), width=22)
glow = glow.filter(ImageFilter.GaussianBlur(10)); im.paste(glow, (0, 0), glow); d = ImageDraw.Draw(im)
for x in range(X0 + 16, X1 - 16, 46):
    d.line((x, SHEAR, x + 28, SHEAR), fill=GOLD, width=8)
# the pick: runs along the keyway below the pins and hooks up under pin 3 only
KY = Y1 - 70
d.rounded_rectangle((20, KY - 26, 150, KY + 26), radius=16, fill=(70, 70, 78), outline=(30, 30, 34), width=3)
d.line((150, KY, 530, KY), fill=STEEL, width=12)
d.line((530, KY, 560, SHEAR + 150 + 34 + 6), fill=STEEL, width=12)
# right column: three huge steps
CX = 1300
label(d, (CX, 120), 'LIFT', 70, GOLD, anchor='mm')
mouse_icon(d, CX - 40, 240)
label(d, (CX, 420), 'STOP AT', 58, WHITE, anchor='mm')
label(d, (CX, 486), 'THE LINE', 58, GOLD, anchor='mm')
d.line((CX - 160, 540, CX + 160, 540), fill=GOLD, width=10)
label(d, (CX, 640), 'CLICK', 70, GREEN, anchor='mm')
d.ellipse((CX - 46, 700, CX + 46, 792), fill=GREEN)
d.line((CX - 22, 748, CX - 4, 768, CX + 26, 726), fill=(16, 60, 30), width=10, joint='curve')
im.save(os.path.join(OUT, 'tutorial_1.png'), optimize=True)

# ------------------------------------------------------------------ page 2: tension, order, turn
im, d = canvas()
cols = [(267, 'TENSION'), (800, 'ORDER'), (1333, 'TURN')]
for cx, title in cols:
    d.rounded_rectangle((cx - 240, 70, cx + 240, 700), radius=36, fill=PANEL, outline=(60, 56, 66), width=4)
    label(d, (cx, 140), title, 64, GOLD, anchor='mm')
# 1. tension wrench + hold F
cx = 267
d.line((cx - 120, 300, cx + 70, 300), fill=STEEL, width=26)
d.line((cx + 70, 300, cx + 70, 400), fill=STEEL, width=26)
d.rounded_rectangle((cx - 150, 284, cx - 90, 316), radius=8, fill=STEEL_D)
keycap(d, cx, 540, 'F', 120)
label(d, (cx, 650), 'HOLD', 46, WHITE, anchor='mm')
# 2. binding order chips
cx = 800
order = ['3', '1', '5', '2', '4']
for i, n in enumerate(order):
    x = cx - 180 + i * 90; y = 330 + (40 if i % 2 else 0)
    col = GREEN if i < 2 else (AMBER if i == 2 else (72, 68, 78))
    d.ellipse((x - 40, y - 40, x + 40, y + 40), fill=col)
    label(d, (x, y + 2), n, 46, (20, 18, 16) if i <= 2 else WHITE, anchor='mm')
    if i < 4:
        d.line((x + 42, y + (20 if i % 2 == 0 else -20), x + 48, y + (20 if i % 2 == 0 else -20)), fill=DIM, width=6)
label(d, (cx, 520), 'ONE PIN', 52, WHITE, anchor='mm')
label(d, (cx, 590), 'AT A TIME', 52, WHITE, anchor='mm')
# 3. plug dial + hold E
cx = 1333
d.ellipse((cx - 110, 220, cx + 110, 440), fill=(92, 74, 44), outline=BRASS, width=10)
d.rounded_rectangle((cx - 16, 250, cx + 16, 410), radius=8, fill=(30, 26, 22))
d.arc((cx - 150, 180, cx + 150, 480), start=-60, end=40, fill=GREEN, width=14)
ang = math.radians(40); ax, ay = cx + 150 * math.cos(ang), 330 + 150 * math.sin(ang)
d.polygon([(ax + 24, ay - 6), (ax - 18, ay - 20), (ax - 2, ay + 26)], fill=GREEN)
keycap(d, cx, 540, 'E', 120)
label(d, (cx, 650), 'HOLD', 46, WHITE, anchor='mm')
# bottom strip: the punchline
d.rounded_rectangle((150, 748, 1450, 860), radius=28, fill=(48, 20, 18), outline=RED, width=5)
label(d, (800, 804), 'EACH LOCK OPENED COSTS 1 LOCKPICK', 50, WHITE, anchor='mm')
im.save(os.path.join(OUT, 'tutorial_2.png'), optimize=True)
print('tutorial v4 written to', OUT)
