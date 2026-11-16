# FNC P25 — one visual language for gas-cover pixels

## Player visual review
Arsenal angled and mobile close-ups showed the four roof marks looking substantially broader than the four side slots, while the two lower-forward marks appeared as long, thin streaks. The requested outcome is **one consistent width for roof, side, and lower gas-block marks**, retaining four marks on each side and roof plus two lower-relief accents.

## Implementation
- The side vent's existing rectangular footprint becomes the authoritative mark shape: **1.57 art units longitudinally × 0.31 art units across the surface**.
- The four roof slots stay at the same longitudinal stations and count; their Z width reduces from **0.76 to 0.31** (roof half-width 0.38 → 0.155). This is the key difference in the screenshots.
- The two exposed lower gas-block stripes become short rectangles of exactly **1.57 × 0.31**, using the existing gas-side atlas tile and existing steel finish. Their longitudinal intervals are X12.08–13.65 and X12.32–13.89, at Y−0.86 and Y−1.34, spaced enough not to merge. Preserve deliberately subtler shades 145 and 171.
- All ten marking sites use existing nearest-neighbor pixel-art atlas and triangles; **no new geometry, UV layout or shader variant**. Keep four vents on top, four left, four right. The two lower lines are supplemental surface relief rather than additional vents.
- One shared datum `ventHeight` governs side-vent height, roof vent width (`ventRoofHalfZ*2`), and both lower-relief line heights. All lines use the same `ventLength` along X.
- No changes to handguard flutes, magwell, sights, stock, muzzle, contact ranges, or weapon mechanics.

## Validation
P25 test inspects actual atlas pixels on either side of every line and vent (and beyond each edge) at both widths, ensures two lower bars remain distinct, verifies 4+4+4, and confirms same **536 triangles / 23 meshes** with peer weapon counts unchanged. Run FNC focused historical suite, TypeScript, Vite build, five-rifle WebGL capture and mobile/desktop Arsenal captures. Review side and three-quarter view because perspective can still change apparent thickness of identically sized marks.
