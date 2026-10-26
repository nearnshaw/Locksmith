from PIL import Image, ImageDraw, ImageFilter
import sys
W,H=1024,512
out=sys.argv[1]
img=Image.new('RGBA',(W,H),(0,0,0,0))
# soft shadow
sh=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(sh)
d.rounded_rectangle((30,34,W-30,404),radius=70,fill=(0,0,0,110))
d.polygon([(W//2-70,396),(W//2+40,396),(W//2-10,500)],fill=(0,0,0,110))
sh=sh.filter(ImageFilter.GaussianBlur(14))
img.alpha_composite(sh)
# bubble body: cream fill, dark outline
body=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(body)
fill=(250,243,226,255); line=(38,28,20,255)
d.rounded_rectangle((24,20,W-24,390),radius=70,fill=line)
d.polygon([(W//2-76,370),(W//2+46,370),(W//2-8,496)],fill=line)
d.rounded_rectangle((34,30,W-34,380),radius=62,fill=fill)
d.polygon([(W//2-58,362),(W//2+30,362),(W//2-6,476)],fill=fill)
img.alpha_composite(body)
img.save(out); print('saved',out)
