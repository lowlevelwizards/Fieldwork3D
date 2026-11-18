# G36 R2 — authentic relationships at miniature geometry budget

Review: 18 Nov 2026 mobile Arsenal photos, four viewpoints after live R1. Aesthetic target: **recognizable silhouette, purposeful anatomy, fewest polygons**, chunky/stubby intentional caricature. Work on the actual G36 family production builder; old part slots/presets/gameplay remain compatible.

## R2A — relationship and placement
- **Charging handle**: move single existing rectangular transverse top tab from side-port centered `x=.12, y=.92, z=1.25` to upper-forward `x=2.25, y=1.63, z=0`, size 1.20×.40×3.14. It intersects the receiver roof but lives BELOW the hollow carry handle's bottom at y=1.92. No modeled carrier, handle hinge, open breech or extra pieces. Right-side ejection port remains independently at x[-1.45,1.72] and y[.03,.80] in the pooled atlas; G36's forward top charging point must not be confused with the ejection port.
- **Receiver / handguard**: retain H3's EXACT 20-triangle 2-section six-sided shell. Extend existing upper receiver's front roof x from 3.15 to 4.42 and tip x from 4.00 to 4.90, with just one long 2-point tapered front cut. Receiver tucks inside rear guard end (rear slanted roof x4.35, floor x3.75): NO formerly visible white V-notch, adapter collar, sleeve, overlap ring, new mesh or extra little chamfers.
- **5.56 well**: ONE existing lower receiver extrusion, 8 outer points. Taper front face down to (2.65,-3.28), bottom rear (-1.45,-3.28); outer mouth width **4.10** vs current G36 magazine upper width **3.32**. Outer z thickness **2.28** vs magazine **1.83**. Side walls therefore visually enclose magazine, without implying a 7.62-sized feed. Open trigger void remains real, rear grip hand landmark intact. No second box collar or interior geometry.
- **Muzzle**: preserve the existing long 1.14-square barrel and its one original muzzle mesh. Grow existing tip from .65 × 1.10 × 1.10 to **1.60 × 1.52 × 1.52**, preserving the muzzle's exact x=19.50 endpoint; barrel and device overlap. No micro vents/ring ladder/extra materials.

## R2B — recognition
- **HK markings**: reuse existing HK **pictogram** art: white SAFE plus two muted-red fire options, not a new painted graphic. One batched mesh with exactly 4 triangles for both side planes, using shared cached texture and the surface-ink layer; place slightly forward and above the physical selector, avoiding its pivot. Marking material is intentionally excluded from regular factory material reassignment, so the colors survive in the actual Arsenal. Both six-sided selector hubs and broad paddle controls remain physically present and symmetric; other HK gun pivots stay at their original 8 facets.
- **Optic**: elevate the *complete* existing O3 original integrated two-level optic another +.20, for +.62 cumulative, including housings, oculars, dark faces and visual aim datum. Crown y5.65. The lower lens/sight center is **4.19**, upper **5.16**. No stilt/pedestal or optic rail. Keep the carry opening visible and housing widths/masses as approved.

## R2C — every polygon justified
| Part | Polygon decision | Why |
|---|---|---|
| H3 fore-end | 20 triangles unchanged | flat, slanted ends and six-sided identity all clearly read |
| Upper receiver | one six-vertex polygon extrusion | one long roof and one singular front change, no seam patch |
| Lower receiver | one eight-vertex polygon extrusion | magwell flare + open trigger junction must read |
| V13 stock | delete just one intermediate sweep point | preserve iconic two real voids, rear heel, mount/contact |
| O3 optics | keep two six-vertex pod shells | crucial stacked dual sight identity |
| Lower eyepiece | 8 → **6** cylinder facets, dark face 8 → **6** vertices | six is readable at mobile and cheaper |
| HK selector hubs | 8 → **6** radial facets, G36 only | two tangible buttons; other HK guns unaffected |
| Selector pictograms | only **4 triangles total** across both sides | exceptional value for white/red identity |
| Muzzle block | original **12 triangles**, resized | silhouette instead of miniature slots |
| Magazine | same opaque G36-polymer body, no false projected stripes | 5.56 fit, preserves reload and feed |
| Receiver/guard seam | **0 extra triangles** | overlap existing meshes, instead of a new rim |
| Charging handle | original **12 triangles**, repositioned | real placement is worth more than a detailed mechanism |

Total production G36 must remain at most 650 triangles (no worse than prior) and **23 meshes** total, one additional indispensable batched marking and no others. Gameplay and replay share these same factory shapes.

## Tests and release gate
- Existing G36 p2–p8, stock V13, optic O2/O3, R1, H3, geometry corpus updated to require revised contacts/form.
- Added `tests/weapon-g36-r2-structure-economy.test.mjs`: six physical contracts + source triangle/mesh budget, actual family adapter.
- Dedicated CI checks node tests, TS/build, real WebGL seven-rifle peer scenes, side/quarter/front/top/64px/128px/mobile.
- Branch and draft PR until passing exact-head CI and visual acceptance. Do not merge/deploy in this stage; don't pile onto any Pages release already running.
