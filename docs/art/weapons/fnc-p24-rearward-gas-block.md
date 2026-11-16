# FNC P24 — Lower gas block continues back under handguard

## Reference and goal
The user-reviewed FN FNC photographs show the lower gas-block casting running rearward under the front polymer furniture and emerging forward as one structural piece. The P23 implementation started that deep belly only past the polymer, making it read as a disconnected add-on. P24 retains the big silhouette, fixing the **relationship** rather than adding realism detail.

## Geometry
- Keep the FNC polymer X3.25–11.68, top vented gas cover X1.95–15.10, front sight position/ears, barrel, muzzle, folded stock, STANAG and pose anchors unchanged.
- In `FNC_FRONT_P13.gas`, add `lowerStartX=10.85` and `lowerFullX=11.80`. The metal lower housing starts at original Y−0.60 inside the forward handguard, grows smoothly to Y−1.57 by X11.80 immediately beyond the polymer, and remains that deep to the front sight block.
- **Independent top transition:** existing breadth/roof change stays at X12.65–12.96, keeping the last of the 4+4+4 vent marks out of the big front-sight-support transition. No new front sight base or separate slab.
- Extend the existing six-face *single* gas mesh from four to six longitudinal stations. Two additional six-face sections cost +24 triangles and **zero extra meshes or draw calls**. This specifically earns the shape change without unnecessary smoothing.

## Pixel art on lower exposed casting
- Two short longitudinal lines only, on both visible side facets of that same metal gas mesh: a darker stripe X12.02–14.42 at Y−0.91; softer shorter stripe X12.28–14.10 at Y−1.25.
- Expand the shared 128px gas-side atlas tile's vertical bounds from Y−0.60 down to Y−1.57, then render 0.10/0.09-unit pixel bands. Nearest filtering, existing material, and texture/UV projection unchanged otherwise.
- Preserve 12 existing gas vents, roof, polymer grooves, receiver texture and all muzzle ports. Do **not** add rails, screws, holes, cylinders, floating decals or geometric surface ribs.

## Validation
Dedicated P24 tests verify (a) the belly begins inside and reaches full depth just after the polymer, (b) upper sight/vent stations remain forward, (c) exactly two authored line shades actually exist as atlas pixels and side faces use the atlas, (d) existing 12 vents still appear in the correct tiles, and (e) 536 real triangles / 23 meshes versus P23's 512 / 23. Historical P20–P23 tests keep their substantive silhouette and family invariants.

Run targeted FNC and FAL tests, geometry audit, TypeScript/build and five-rifle four-angle WebGL and mobile/desktop Arsenal captures before merging.
