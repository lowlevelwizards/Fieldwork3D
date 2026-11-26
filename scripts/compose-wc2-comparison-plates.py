"""Compose real captured images into readable, scale-honest review plates."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path("reports/wa0-visual")
manifest = json.loads((root / "manifest.json").read_text())
out = root / "wc2-comparison"
out.mkdir(exist_ok=True)
records = [r for report in manifest["reports"] for r in report["records"]
           if r["platform"] != "accessory-samples" and r["status"] in ("primary-reference", "issued-sidearm-appearance", "preview-only")]
ids = [r["id"] for r in records]
if len(ids) != len(set(ids)) or not records:
    raise ValueError("Duplicate or empty factory comparison")
font = ImageFont.load_default()
def plate(rows, filename, views, title):
    width = 500 * len(views)
    page = Image.new("RGB", (width, 42 + len(rows)*265), "#1d2226")
    draw = ImageDraw.Draw(page)
    draw.text((12, 10), title, fill="#ffffff", font=font)
    for i,r in enumerate(rows):
        y = 42 + i*265
        draw.text((12,y), r["id"]+" | "+r["status"], fill="#ffffff", font=font)
        for col,view in enumerate(views):
            img = Image.open(root / r["platform"] / r["id"] / (view+".png")).convert("RGB")
            if img.size != (480,240):
                raise ValueError(f"Unexpected image size {r['id']} {view}")
            page.paste(img,(col*500+10,y+18))
    page.save(out / filename)
for cohort in ("primary","sidearm"):
    rows = [r for r in records if r["cohort"] == cohort]
    if not rows:
        raise ValueError("Missing cohort "+cohort)
    spans = [next(p["metrics"]["horizontalSpan"] for p in r["panels"] if p["name"] == "side-shared") for r in rows]
    if any(abs(x-spans[0])>1e-6 for x in spans):
        raise ValueError("Shared scale differs within "+cohort)
    for i in range(0,len(rows),8):
        block = rows[i:i+8]
        plate(block,f"{cohort}-{i//8+1:02}-compare.png",
              ("side-shared","silhouette-fit","three-quarter-fit"),
              f"{cohort} | SAME COHORT SCALE side / FITTED silhouette / FITTED 3-quarter | {manifest['revision'][:12]}")
    # A single fixed-scale overview, including every factory reference.
    page = Image.new("RGB",(4*252,42+((len(rows)+3)//4)*150),"#1d2226")
    draw = ImageDraw.Draw(page)
    draw.text((12,10),f"{cohort} | fixed cohort scale | {manifest['revision'][:12]}",fill="white",font=font)
    for i,r in enumerate(rows):
        x,y=(i%4)*252,(i//4)*150+42
        draw.text((x+8,y),r["id"],fill="white",font=font)
        img=Image.open(root/r["platform"]/r["id"]/"side-shared.png").convert("RGB")
        page.paste(img.resize((240,120),Image.Resampling.LANCZOS),(x+6,y+18))
    page.save(out/f"{cohort}-all-shared-scale.png")
print(f"WC2 comparison plates: {len(records)} unique factory and sidearm references")
