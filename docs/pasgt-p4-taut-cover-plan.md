# PASGT P4 — taut field cover and anchored concealment (2026-11-07)

Scope: PASGT only. Preserve source PASGT_CUBOIDS exactly.

Stage A — options and compatibility:
- slits on/off; band none/elastic; concealment none/foliage/scrim/net.
- old loops mapped to slits, old crossed mapped to elastic.
- foliage/scrim require slits as an *effective* dependency, never erase saved choice.
- pattern, slits and concealment hidden when cover off; band can remain on shell.

Stage B — physical fabric:
- selected broad planar diagonal bridges on brow and nape with taut side hem.
- two offset longitudinal crown seams, extended across crown.
- continuous hem stitch, no single center seam.
- art-density normalized independently of physical garment geometry.
- one neutral-color textile material and no baked AO.

Stage C — field dress:
- 8 prominent slit anchors distributed front 2 / side 4 / rear 2.
- 4-6 low-poly pixel leaf cards at fixed distinct angles emerging from anchors.
- 4-6 restrained long draped scrim strips using 3 stable palette families.
- chunky elastic contour-ribbon above brow / nape skirt.
- net cords wrap front, crown, side and rear, no breadbasket X.
- no per-frame meshes, materials, or randomization.

Stage D — visual and CI gates:
- front/side/rear and close/gameplay captures;
- test slit auto coupling + legacy save + material ownership/UV topology;
- focused build and Studio mobile smoke;
- one release only after production queue is clear and prior Pages live verified.
