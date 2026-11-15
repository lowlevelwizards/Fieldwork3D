# B1 R4 — M1 underside, lip and lower rear
The R3 M1 boxy silhouette is approved and deliberately **not** remade.

## Three focused art fixes
1. **Visible underside:** old inward-return faces were both oriented downward, and the open bowl had no inner ceiling. Replace the near-black strip with one inward-facing wall plus a recessed high roof, using the existing single steel-shell BufferGeometry. The opening stays clear at the rolled rim; the roof is deep above the operator's head. Darken the inside subtly with vertex color (0.82–0.84), not fully black and not a solid plate across the lower head.
2. **Bolder simpler lip:** the steel rolled edge now spans 0.71 units on the vertical contour instead of 0.48, still only **one** outer vertical band and a single inward return, not multiple stepped trim strips.
3. **Lower rear:** outer rim pitch increases to .46 top / .60 bottom. The front remains high for face clearance, while the nape drops to about Y 3.56 (from 4.0). No extra silhouette vertices.

## Geometry and accessory compatibility
- Eight perimeter points, same top/shoulder/pot-wall contours as R3.
- Eight steel contour stations, plus eight recessed-roof fan triangles: **128 shell triangles** versus 104 in R3, still far below the old 210-triangle historical shell.
- Retaining band, net and scrim continue to sample the profile-derived M1 contact; no second shell geometry.
- Existing saved fabric covers and chinstrap preference untouched. No changes to equipment, protection or unrelated helmet families.
- Low-angle Studio view must show a real inner surface, not black streaks, see-through empty roof or a bottom plate touching the head.

## Acceptance/release
Focused geometry and headwear state tests; production build; mobile Studio smoke; 36-frame helmet capture (including FIT low angle). Compare screenshots with user supplied low-angle image. Hold the feature branch until visual and technical checks pass; do not queue a production deployment on a running Pages release.
