# S1-A1D — DDR M56 simplified stamped silhouette

## Trigger
November 15 post-S1-A1C iPhone front/side/three-quarter screenshots: 12 perimeter stations and eight concentric rings produced a faceted lampshade with multiple broad tonal tiers and an insufficiently distinct **lower shell angle**. User directed a reduced-poly reconstruction with clearer ear/hem rake. Canonical frame +Y up, -Z faces forward.

## Source of silhouette authority
Original DDR M56 and M56/76 side/front/rear photographs, with historical stamped rear-swept protection and broad sloped skirt. Stylization is explicitly Fieldwork: low-poly/boxy and readable in 3D, not literal helmet scanning. The shell is continuous; unlike PASGT there is **no ear cutout** or detached side plates.

## Authored geometry
- 8 perimeter vertices, formerly 12. Keep front-left/front-right visor, left/right forward side, behind-ear side corner, and rear-left/rear-right nape. Horizontal front, rear and steeply descending side segments stay visually clear.
- 7 profile rings, formerly 8: small flat crown, broad upper shoulder, a pronounced **lower-bell angular break**, outward sweeping steel edge, thin inset return, inner wall, interior ceiling. **No secondary upper-skirt band or colored lower band**.
- Exactly **112 triangles** (8 top + 6×8×2 rings + 8 inner); previously 192 triangles. This is 42% fewer triangles. The one shell has indexed faces, area-weighted authored normals, atlas UVs and a hollow underside.
- Core fixed fit stays at Y top 8.775, X ±6.87, front Z -6.80, rear Z +8.10. The front hem is Y5.30, the behind-ear side Y4.126 and rear nape Y3.35. Front-to-rear difference 1.95 versus previous 1.35; these are **stylized game units**, not physical helmet measurements.
- Upper shoulder X half-width 5.58 (Y7.87) to lower bell width 5.79 (Y5.95); major skirt grows to 6.87 (Y4.47), creating a single strong break in elevation. Upper slope ≈0.11 X/Y; lower slope ≈0.73 X/Y.
- Outward painted steel faces share the same material region and broad tones. Only the 0.05–0.11 high, inward-stepped lip and inside wall shade dark. No extruded brim attached to the main shell.
- Existing material palette, garment state, shadow rules, protection metrics, shared helmet families and non-rendered legacy cuboid metadata remain unchanged.
- The two side historical rivets and one rear rivet are interpolated from the new authoritative lower bell and hem. The optional eight-segment net rim follows the actual authored contour and is merged with the coarse net for display.

## Critical gates
- Assert **exactly** 112 triangles, 48 profile quads, eight perimeter points and seven rings.
- Front/temple/ear/nape Y landmarks, symmetric side outline, no independent ear notch, full skull-corner raycasts, proper face winding and normals, finite UVs, no solid bottom.
- Preserve optional early-rivet/late-smooth and coarse/none net, M56 colors, non-rendered historical cuboid fit API, M1/SSh-40/PASGT/ACH families.
- Run focused M56, historical helmets, headwear expansion/material regressions, production TS/build and identical 44 mobile Studio captures.
- Merge at release checkpoint only after previous GitHub Pages workflow fully succeeds; verify new Pages workflow's public build-stamp step for **exact merged SHA**.
