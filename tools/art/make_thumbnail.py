from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import sys
src, icon_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB'); W, H = im.size  # 1728 x 1018
crop_h = int(W * 9 / 16); y0 = 30
im = im.crop((0, y0, W, y0 + crop_h))
# paint out the player's nametag (full-frame ~ 812..908 x 594..622) with a sample from just below it
x1, y1, x2, y2 = 812 - 14, 594 - y0 - 10, 908 + 14, 622 - y0 + 10
src_patch = im.crop((x1, y1 + 48, x2, y2 + 48)).filter(ImageFilter.GaussianBlur(1.2))
mask = Image.new('L', (x2 - x1, y2 - y1), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, x2 - x1 - 1, y2 - y1 - 1), radius=12, fill=255)
im.paste(src_patch, (x1, y1), mask.filter(ImageFilter.GaussianBlur(3)))
# grade
im = ImageEnhance.Brightness(im).enhance(1.08); im = ImageEnhance.Contrast(im).enhance(1.14); im = ImageEnhance.Color(im).enhance(1.18)
r, g, b = im.split(); r = r.point(lambda v: min(255, int(v * 1.04 + 3))); b = b.point(lambda v: int(v * 0.94)); im = Image.merge('RGB', (r, g, b))
im = im.resize((1280, 720), Image.LANCZOS)
vig = Image.new('L', (1280, 720), 0); ImageDraw.Draw(vig).ellipse((-240, -180, 1520, 900), fill=255); vig = vig.filter(ImageFilter.GaussianBlur(150))
im = Image.composite(im, Image.new('RGB', (1280, 720), (10, 5, 4)), vig.point(lambda v: 100 + v * 155 // 255))
def font(name, size):
    for p in ['/System/Library/Fonts/Supplemental/%s' % name, '/System/Library/Fonts/%s' % name]:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()
# Text stays inside the centred square (x 280..1000 of 1280) so a square crop keeps all of it.
SQ0, SQ1, MID = 300, 980, 640
title_f = font('Impact.ttf', 132)
sub_f, tag_f = font('Avenir Next Condensed.ttc', 40), font('Avenir Next Condensed.ttc', 32)
icon = Image.open(icon_path).convert('RGBA'); icon.thumbnail((92, 92))
tw = title_f.getbbox('LOCKSMITH')[2]
total = icon.width + 22 + tw
while total > SQ1 - SQ0:
    title_f = font('Impact.ttf', title_f.size - 4); tw = title_f.getbbox('LOCKSMITH')[2]; total = icon.width + 22 + tw
x0 = MID - total // 2
plate = Image.new('RGBA', (1280, 720), (0, 0, 0, 0)); ImageDraw.Draw(plate).rounded_rectangle((SQ0 - 20, 24, SQ1 + 20, 300), radius=34, fill=(0, 0, 0, 130)); plate = plate.filter(ImageFilter.GaussianBlur(24))
im = Image.alpha_composite(im.convert('RGBA'), plate).convert('RGB'); d = ImageDraw.Draw(im, 'RGBA')
GOLD, CREAM = (242, 188, 60), (240, 226, 196)
sh = Image.new('RGBA', icon.size, (0, 0, 0, 0)); sh.paste((0, 0, 0, 170), (0, 0), icon); sh = sh.filter(ImageFilter.GaussianBlur(4))
iy = 62 + (title_f.size - icon.height) // 2
im.paste(sh, (x0 + 4, iy + 6), sh); im.paste(icon, (x0, iy), icon)
def text(xy, s, f, fill, shadow, anchor='la'):
    d.text((xy[0] + shadow, xy[1] + shadow), s, font=f, fill=(0, 0, 0, 210), anchor=anchor); d.text(xy, s, font=f, fill=fill, anchor=anchor)
text((x0 + icon.width + 22, 44), 'LOCKSMITH', title_f, GOLD, 5)
text((MID, 214), 'An escape game.', sub_f, CREAM, 3, 'mm')
text((MID, 262), 'Lockpicks: 0', tag_f, (210, 194, 168), 3, 'mm')
im.save(out, optimize=True); print('saved', out, im.size, 'text span', x0, x0 + total)
