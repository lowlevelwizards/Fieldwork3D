# Eyewear R5 — preserve the winners, refine the silhouettes

Reference baseline: `13a1f6e`, visual review after R4 deploy `4276526`.
All dimensions world units on the canonical eight-unit square head, -Z forward.

## Locked and observed
- Acetate standard glasses: approved. Keep the rectangular, round, heavy-square variants and all temples.
- Vintage goggles: approved. Keep octagonal cups, connected back, stance, material and proportions.
- Ballistic eyeshield: approved. Only repair a demonstrated visual or fit defect.
- Shooting glasses: approve the current *lens outline*, not the overly layered brow.
- Aviators: approve twin lenses, double bridge, and fitted temples; shift lens fullness toward the **outer cheek**.
- Compact goggles: R4 W profile and 1.17-unit-long housing fail distinctive identity. R5 should be a close-fitting, narrow-gasket panoramic sport seal.
- Heavy field goggles: improve top roof and taper the rear; previous shell extends 2.2 units off face and side strap is rectangular.

## Authored R5 constraints
1. One dominant contour for each family; no accessory micro-boxes.
2. Shooting brow must be a single 8-point continuous strip swept in sync with the lens; no coincident front polygons.
3. Compact housing <= 1.0 depth; field housing ~1.5–1.8 with visibly tapered rear and soft gasket.
4. The low goggle's nose cut is a broad saddle, not the tiny field goggles' sharp V.
5. Field rear contour must be narrower than its front and strap should converge toward head.
6. Protect save IDs, colors, modes, pose swapping, and deferred Quick Play loading.
7. Render and visually compare front / three-quarter / side bareheaded, then ACH and PASGT where compatible.

## Deployment discipline
Commit R5.0 baseline, R5.1 aviator, R5.2 shooting brow, R5.3 compact,
R5.4 field, R5.5 integration, R5.6 gate to **one feature branch**.
Use critical eyewear/wardrobe/lazy tests + production build. Merge only a
compatible batch after CI and previous Pages publication both succeed. Do not
queue overlapping production runs. Confirm public Pages displays merged SHA.
