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

# WC2.4b: pair actual WebGL views with the pinned pre-edit baseline.
# The fitted views may independently frame each candidate; only side-shared
# is a scale-controlled comparison. Never call these images visual approval.
before_dir = Path("reports/wc2-before")
before_files = [p for p in before_dir.rglob("manifest.json")
                if "reports" in json.loads(p.read_text())]
if before_dir.exists():
    if len(before_files) != 1:
        raise ValueError("Expected exactly one pinned baseline manifest")
    before_root = before_files[0].parent
    before = json.loads(before_files[0].read_text())
    if before["revision"] != "6bb1a748bea3c7ea06fa2d9019b70edaeb6ae57f":
        raise ValueError("Wrong WC2.4b baseline revision")
    def factory_map(m):
        return {r["id"]: r for report in m["reports"] for r in report["records"]
                if r["platform"] != "accessory-samples" and r["status"] == "primary-reference"}
    old, new = factory_map(before), factory_map(manifest)
    affected = ["ak-akm", "ak-ak74", "ak-ak74m", "ak-rpk74", "ak-ak103", "ak-ak105"]
    views = ["side-shared", "silhouette-fit", "three-quarter-fit",
             "reverse-fit", "top-fit", "front-fit", "native-128", "native-64"]
    for ident in affected:
        older, newer = old[ident], new[ident]
        def span(r):
            return next(p["metrics"]["horizontalSpan"] for p in r["panels"]
                        if p["name"] == "side-shared")
        if abs(span(older) - span(newer)) > 1e-6:
            raise ValueError("Shared camera scale changed: " + ident)
        page = Image.new("RGB", (1000, 66 + len(views)*268), "#1d2226")
        draw = ImageDraw.Draw(page)
        draw.text((10, 8), ident + " | WC2.4b fixed-stock candidate comparison", fill="white", font=font)
        draw.text((10, 28), "BEFORE " + before["revision"][:12], fill="white", font=font)
        draw.text((510, 28), "AFTER " + manifest["revision"][:12], fill="white", font=font)
        draw.text((10, 46), "Shared side scale; other views fitted; native panels unscaled", fill="white", font=font)
        for i, view in enumerate(views):
            y = 66 + i*268
            draw.text((10,y),view,fill="white",font=font)
            for x, source, record in [(10,before_root,older),(510,root,newer)]:
                img=Image.open(source/record["platform"]/ident/(view+".png")).convert("RGB")
                page.paste(img,(x+(480-img.width)//2,y+18))
        page.save(out/("wc2-4b-"+ident+"-before-after.png"))
    # Cross-family shape plate: actual monochrome render, same-scale lit side,
    # and broad 3D presentation. The fitted columns are explicitly labeled.
    plate([new[i] for i in affected], "wc2-4b-fixed-stock-overview.png",
          ("side-shared","silhouette-fit","top-fit","three-quarter-fit"),
          "WC2.4b | shared side / fitted monochrome / fitted top / fitted quarter | "+manifest["revision"][:12])
    plate([new[i] for i in affected], "wc2-4b-isolated-stock-studies.png",
          ("stock-side","stock-top","stock-three-quarter"),
          "WC2.4b | isolated production stock art, fitted side / top / quarter")
    # Record unchanged render cost and geometry scope, not artistic approval.
    checks = {}
    for ident in sorted(i for i in new if i.startswith("ak-") and i in old):
        a = next(v["metrics"] for v in old[ident]["panels"] if v["name"] == "side-shared")
        b = next(v["metrics"] for v in new[ident]["panels"] if v["name"] == "side-shared")
        checks[ident] = {"calls_before": a["calls"], "calls_after": b["calls"],
                         "triangles_before": a["triangles"], "triangles_after": b["triangles"]}
        if b["calls"] > a["calls"]:
            raise ValueError("Unexpected draw-call increase: "+ident)
    (out/"wc2-4b-render-cost.json").write_text(json.dumps(checks, indent=2)+"\n")
    print("WC2.4b: six pinned fixed-stock sheets generated; review pending")
