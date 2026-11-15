# S1-A1C — DDR M56 ear/hem silhouette correction

## Source and goal
November 15 iPhone Operator Studio front, side and rear-quarter screenshots of the released S1-A1B shell: broad angular crown reads clearly, but the skirt looks like a separate horizontal dark band and the side/behind-ear silhouette remains anonymous. Reference: period M56/76 side and front photos (Army and Outdoors, Hessenantique) showing continuous outward sweep with raised front, sloping ear region and extended nape. This is **not** a PASGT ear notch.

## Single-shell changes (+Y up, -Z forward)
- Preserve the exact physical envelope: top 8.775, X ±6.87, front Z -6.80, rear Z +8.10. Preserve the single indexed hollow shell and saved wardrobe identity.
- **12 profile stations**, previously 8: two added stations on each straight lateral edge, at normalized Z -0.18 and +0.31, to give the side an angular ear-to-nape inflection. This adds no rings, surfaces or accessory pieces.
- **One data-driven lower contour** across the bell, edge and inset underside; a bounded lateral ear gradient modifies only stations on the true sides. Forehead bottom Y5.01, behind-ear side Y3.861, rear Y3.66. The ear transition is a slope change, not a separately modeled lobe or cutout.
- **More identifiable dome:** retain the small square top Y8.775 and proven width while lowering the upper shoulder to Y7.86 for a taller upper bevel.
- **Recombine the lower steel:** one material region and approximately constant painted-steel tone for the bell and flared hem. Thin 0.12–0.21 vertical edge spans, dark recessed underside only, no decorative black band.
- Optional early liner fasteners now interpolate the authoritative shell stations; optional coarse net edge follows the real lip instead of a straight horizontal floating rail.
- Shared headwear silhouette/fit metadata updated **only for M56** (forehead 5.01, low side 3.86). M1, SSh-40, ACH/MICH, PASGT, police and soft headwear are untouched.

## Acceptance
- 12-sided low-poly perimeter and eight shared shell rings; no hidden or overlapping old cuboids.
- One continuous monotonic front→ear→nape edge, symmetric sides, no ear notch, proper dark inner return and lower edge thickness, no degenerates, no flipped triangles.
- All square-head clearance rays and historical / wardrobe tests remain green; current solid colors, early/late rivets and coarse/none net persist.
- Run TypeScript check/build and 44-view identical mobile Studio helmet capture in the M56 review workflow. Release only after successful checks and a verified prior Pages deployment. Verify public build-stamp matches merged main SHA.
