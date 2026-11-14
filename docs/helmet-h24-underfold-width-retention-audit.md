# H24 — Underside, perimeter width, screw and ear profile audit

This pass is based on the user's four H23 side and below-angle Studio screenshots. It preserves the game's chunky angular design, a **single static six-station shell**, and mobile-first performance.

## Actual causes and fixes

- **Vanishing underside / incorrect shadows:** The unified shell already includes a narrow inward underfold but its material was front-sided, so its other face could vanish depending on camera/light angle. Only for modern ACH/MICH unified shells, set both `side` and `shadowSide` to `THREE.DoubleSide` on that helmet's **dedicated and recolorable existing material**. Do not clone it: saved shell swatches and pose-time tints update through the original material identity. This corrects underside fold visibility and two-sided shadow-map occlusion without adding a mesh or vertex. The shell remains `castShadow=true`.
- **Rubber lip on diagonals:** Previously lifted the upper rubber edge straight up in world Y; this is thinner when viewed perpendicular to a diagonal. Use a static 2D Y/Z segment-normal offset and join offset lines with a miter at the existing six perimeter corners. Keep one common set of upper/lower vertices and exactly 12 strips / 24 triangles. The uniform width is exactly the existing binding height: Full/Mid 0.52 model units; High 0.42.
- **Screws:** The physical square metal heads should be wholly above the lip, not clipped into a change in slope. The front center is slightly ahead of the temple break (station1 Z minus 0.32); rear center sits on the rear nape run (station4 Z plus 0.36). Center height is actual local hem + binding height + 0.45; this leaves space for the .52-high cube heads. Both mirror across X and follow the source contour. Straps remain anchored from inside.
- **Ear and nape:** Full stays unchanged in Y/Z, with its nearly flat deep ear-to-nape contour. Mid moves the front ear onset rearward (Z −1.12 → −0.78) and ear region to Z +0.10..+2.52, with rear Y2.05→1.90; High similarly Z −1.15 → −0.80 and ear Z+0.10..+2.52, rear Y2.25→2.05. Ear clearance heights **do not change** (2.04 / 3.06 / 5.30).
- **Back slab:** The upper rear shoulder is set back 0.20 relative to the low nape, giving the rear wall a small backward rake instead of a vertical end-cap. It stays one quad at the rear and needs no extra geometry.
- **Lateral ear silhouette:** Instead of intersecting an ear plate, the existing six outer hem points have station-specific X half-widths. Full ear +0.28 per side, Mid +0.25, High +0.13; slight intermediate taper toward nape. Side shell wall and existing underfold use those same X values. Both sides are exact mirrors. The fitted fabric already interpolates from `p.hem` at side stations; coarse metadata envelope is widened to contain the bulge.

## Performance acceptance

| Area | H23 | H24 |
|---|---:|---:|
| Shell side stations | 6 | 6 |
| Unified shell quads | 29 | 29 |
| Unified shell triangles | 58 | 58 |
| Shell draw calls | 1 | 1 |
| Rubber edge strips | 12 | 12 |
| Rubber edge triangles | 24 | 24 |
| Extra physics objects / per-frame checks | 0 | 0 |

**Caveat:** Double-sided shading/casting can increase fragment work for the modern shell, even with zero new polygons or draw calls; it is scoped to the three modern silhouettes rather than all clothing. The shell is deliberately open at the deep center to fit the unchanged head cube; this pass corrects visibility of its existing underside fold and shadow sides, not a fully closed solid-volume collision helmet. Shadow correctness is verified by static geometry/material checks and the mobile Studio smoke, not by a pixel-by-pixel visual screenshot assertion.

## Release acceptance

- Mirrored side bulges, not intersecting slabs.
- Full/Mid/High ear-height hierarchy remains and napes descend behind ears.
- Constant normal-distance rubber width on horizontal and diagonal segments with shared terminal corners.
- Four screws symmetric, clear of rim, seated on shell above the visible lower edge; four-point webbing still symmetrical.
- Cover retains enough lateral clearance over the widened side shell.
- Critical geometry tests + full Ground Zero regressions, production typecheck/build and mobile Operator Studio smoke green.
- Verify prior Pages release is complete and H24's merged commit is publicly served before marking deployed.
