# S1-A1E — East German M56: two-mass silhouette-first correction

## Why this pass exists
The November 15 iPhone screenshots of S1-A1C showed a wide, flattened, over-faceted knight-helmet/lamp-shade form. S1-A1D (112 triangles) reduced count but retained a tiny top bevel and a continuous monotonically falling lower edge; changing polygon count alone did not solve the visual identity. The user's request: **fewer shapes, a much more distinctive skirt and a deliberate ear-region silhouette**. Do not make a PASGT-style deep ear cutout or attach fake earpieces.

## Explicitly intended M56 silhouette
1. **Single broad, square upper crown and upright bell**. Rather than two consecutive bevel/shoulder bands, one exposed bell runs from broad top Y8.775 (side half width 4.80) to lower rim Y6.02 (side 5.73). Flat, graphic, Fieldwork geometry.
2. **One projecting angled lower skirt**. Runs from that lower bell to Y4.53 (side 6.87), front reach -6.80 and rear reach +8.10. One clear outward bend; no parallel tiers or false dark horizontal bands.
3. **A shallow deliberate local ear relief** only on the outer hem and its inward return. Front visor Y5.23, temple dip Y4.564, ear relief Y4.995, rear nape Y3.53. The two asymmetric side heights create a readable break and distinguish ear shape from the skirt. No extra independent ear guards. Both sides are mirrored.
4. **Thin continuous underside**. One inward steel return 0.08–0.12 above the hem then recessed inner wall/ceiling. Hollow and skull-clearing.

## Implementation
- One indexed three.js mesh, 8 horizontal perimeter stations, **six vertical ring profiles** (one exterior bell, one exterior skirt plus inner shell/return), **96 total indexed triangles**, formerly S1-A1D's 112 and S1-A1C's 192. No extra draw calls or per-frame new geometry.
- Same outer X/Z envelope, wardrobe identity, material atlas, editable colors, M56 early/late fastener toggle, coarse/none net. Flat quad normals with one painted tone across both large outer surfaces. Only inside and turned-under steel darken.
- Side rivets interpolate between current Y6.02 bell and new shaped skirt; rear liner rivet and premerged optional net likewise sample the current surface. No other helmet geometry, gameplay protection or saved-look schema changes.
- Update only M56 headwear fit: top 8.775, brow Y5.23, ear Y4.995, rear reach +8.10; old rendered metadata cuboids remain nonrendered.

## Quality gates
- A1E tests assert 96 triangles/6 rings/8 perimeter corners, actual front-temple-ear-rear landmarks and mirrored shape, single outward skirt break, no second visible band, hollow ceiling, correct normals/winding/UVs and skull corner ray clearance.
- Focused historical/wardrobe/material tests, TypeScript production build and the identical 44-view phone-size helmet capture workflow. **Use black/solid silhouette side/front/quarter frames for artistic sign-off**: the approved main silhouette should not need optional hardware or a particular color to read as the M56. CI captures verify rendering but do not replace a visual art judgment.
- Merge to main only once relevant critical CI passes and preceding Pages production workflow succeeded. Confirm that new Pages job verifies the **served production build ID equals the merged main SHA**.
