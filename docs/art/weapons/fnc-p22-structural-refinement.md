# FNC P22 — Structural silhouette resolution

## Goal
User-reviewed side and three-quarter Workbench screenshots show a strong FNC identity after P19–P21, but the STANAG socket has almost no lip material, handguard begins inside the receiver, and a duplicate front-sight pedestal confuses the gas block. The rear sight and buttplate are oversized or overly literal. Fix the *relationship of the primary masses*, never add realism microdetail.

## Specific changes
- **P22.1 integrated square magazine well:** Keep magazine size, center, angle and AR 20/30/poly options unchanged. Upper receiver stays X2.75 at its nose; lower front steps outward to X3.05 and rear edge becomes X−0.98 below the primary receiver body. Single eight-corner lower profile; no separate slab/chamfer. STANAG width 3.38 has >0.30 art units of front and rear shroud material at mouth.
- **P22.2 connected receiver-to-handguard neck:** Polymer rear X3.25 rather than X1.95, full-width start X3.80 instead of X3.10; gas housing continues behind it from X1.95 inside upper receiver. Visible X2.75→3.25 metal-neck window, no air gap/unsupported handguard. Retain rear receiver length and the polymer front at X11.68. Trim lower polymer flare from 0.60→0.43 (roof unchanged). Handstop stays on the full-width front.
- **P22.3 continuous gas block:** The original gas roof and separate four-corner sight pedestal become one closed, textured six-face volume with X stations 1.95,12.65,12.96,15.10. One deliberate low-poly broadening at the forward shoulder, same existing twin front ears and their open negative space. Final pixel vent ends X12.22, before the block shoulder at X12.65. Gas side and roof texture UVs derive from the new 15.10 extent and retain four vents on left, right and roof.
- **P22.4 rear sight and stock:** Rear sight is one four-corner solid block, slight front-face rake, identical width/height silhouette and no through-hole. Butt pad height 5.19→4.68, unchanged rearmost X−14.85 and both rail connections; recessed stock web longitudinal span 2.56→3.70 while retaining a large see-through frame void. Grip and barrel/muzzle anchors unchanged.
- **P22.5 surface and poses:** Remove only the redundant lower stamped pixel stripe. Keep the main bilateral receiver seam, operating slot, handguard grooves and twelve vents. FNC support-hand targets use polymer full-width datums X4.10–10.90 rather than the obsolete X3.45–13.55 bounding interval; do not alter ballistics or generic other-weapon contact ranges.

## Risks / acceptance
- Do **not** elongate the actual receiver or distort the shared STANAG magazine; the widened mouth is an integrated lower step.
- Do **not** build a floating spacer mesh, sight-base slab or new shadow decal. Exposed continuous metal neck does the work.
- Keep visible FN sight shape and gas front architecture intentionally chunky. Front ears must each physically overlap the forward gas block with open middle gap.
- Preserve the front muzzle X19.50, stock X−14.85 and stock frame negative space; factory and suppressor muzzle paths unchanged.
- Derive polymer groove texture from the same geometry transform, and recompute gas cover atlas extents so the 4+4+4 vents stay centered before the front station.
- Production baseline P21 512 triangles / 24 meshes. Review P22 above 540 triangles or 26 meshes as unwanted geometry inflation; do not sacrifice silhouette merely to chase a number.
- Run focused P22 + historical FNC sight/stock/pose checks, STANAG variants, FAL baseline, TypeScript/build and true WebGL/Arsenal desktop/mobile screenshots; compare screenshot side and three-quarter views at ordinary zoom, not only geometry bounds.

All art units are weapon-local, not firearm engineering or physical dimensions.
