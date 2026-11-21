from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
im=Image.new('RGB',(1200,630),'#275d48');d=ImageDraw.Draw(im)
for x in range(0,1200,40):d.line((x,0,x,630),fill='#2d634e')
for y in range(0,630,40):d.line((0,y,1200,y),fill='#2d634e')
font='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf';ui='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def f(size,display=False):return ImageFont.truetype(font if display else ui,size)
values={'F':4,'I':1,'N':1,'S':1,'H':4,'T':1,'E':1,'W':4,'O':1,'R':1,'D':2}
def row(text,y,size=88):
 width=len(text)*(size+10)-10;x=(1200-width)//2
 for char in text:
  if char!=' ':
   d.rounded_rectangle((x,y+7,x+size,y+size+13),radius=10,fill='#c5aa77')
   d.rounded_rectangle((x,y,x+size,y+size+6),radius=10,fill='#fff8e8')
   box=d.textbbox((0,0),char,font=f(53,True));d.text((x+(size-(box[2]-box[0]))/2,y+7),char,font=f(53,True),fill='#302b22')
   d.text((x+size-20,y+size-15),str(values.get(char,1)),font=f(13),fill='#302b22')
  x+=size+10
row('FINISH',128);row('THE WORD',246)
for text,y,size,color in [('Who gets the last word?',65,30,'#fff8e8'),('Start with the last letter. No repeats. Beat the timer.',398,26,'#fff8e8'),('Free browser game  ·  2–5 players  ·  No signup',452,22,'#b9d8c8'),('finishtheword.com',552,25,'#fff8e8')]:
 box=d.textbbox((0,0),text,font=f(size));d.text(((1200-box[2])/2,y),text,font=f(size),fill=color)
im.save(Path(__file__).resolve().parents[1]/'public/social-preview.png',optimize=True)
