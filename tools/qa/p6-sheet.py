"""Joins the per-widget PNGs of tools/qa/p6-shots.mjs into one labelled sheet: python tools/qa/p6-sheet.py <dir> <out.png> [columns]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

src, out = Path(sys.argv[1]), sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
files = sorted(src.glob("*.png"))
ims = [Image.open(f).convert("RGB") for f in files]
cw, ch = max(i.width for i in ims), max(i.height for i in ims)
rows = -(-len(ims) // cols)
sheet = Image.new("RGB", (cols * (cw + 8) + 8, rows * (ch + 24) + 8), (40, 40, 44))
draw = ImageDraw.Draw(sheet)
for k, (f, im) in enumerate(zip(files, ims)):
    x, y = 8 + (k % cols) * (cw + 8), 8 + (k // cols) * (ch + 24)
    draw.text((x, y), f.stem, fill=(230, 230, 230))
    sheet.paste(im, (x, y + 14))
sheet.save(out, optimize=True)
