# Eyewear R3 — baseline and constructive geometry

R2.1 user screenshots show a recurring design error: all seven accessories are extruded front drawings with visually unrelated side appendages. The Achilles heel is the combination with actual ACH geometry (protective brow lower edge Y=4.40, front extent Z=-5.62). Frame tops behind its brow disappear.

R3 source constraints:
- Shared *primitives*, not a universal frame recipe. Open spectacles can use an extruded ring; sealed goggles must have different front/rear profiles; wrap lenses must sweep in depth; ballistic eyeshield must be a single borderless lens.
- Max 4–8 profile corners, coarse material changes only. No scripted glint strips or dummy overlapping black bars.
- Head +X right, +Y up, -Z forward, 8×8×8 head. Front skin Z=-4.
- Never construct geometry on frame update. Keep all legacy wardrobe IDs, variant names, saved tints, placements.
- Each eyewear model's defining contours must remain visible with ACH and high-cut helmets, not just bare head.
- Barehead and ACH mobile screenshots supplied 2026-11-04 serve as R2.1 baseline. Compare true black silhouettes at 3/4, front and side, selection-card scale.
- Defining classes: square acetate / full teardrop pilot / swept two-piece sports / borderless panoramic shield / compact closed seal / deep dust housing / twin faceted retro barrels.
- Critical verification: geometry is complete and free of seams, material swatches and saved IDs migrate, goggle positions and lazy Quick Play loading preserved, helmet fit and bounded draw allocations, tsc + Vite production build.

Release policy: stage commits on feature branch; gate compatible checkpoints, don't merge while Pages is running; confirm public build stamp matches last main.
