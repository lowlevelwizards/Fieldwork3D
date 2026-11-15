# FNC P12 — compressed front-end, chunky handstop and FAL-simple sight

## Problem seen in current in-game reference
P11 established the correct distinct rhythm: two continuous grooves on the broad rear
polymer body and broken rows of vents on the slimmer forward steel cover. But
the vented cover visually sat too high, the parts felt disjointed, and the
front sight was more elaborate than the other Fieldwork FN models.

## Exact visual-only changes
- P11 gas cover remains 8.90 units long and 1.34 deep, but moves
  x9.90 -> 9.50 and y.28 -> .04, overlapping the polymer more visibly.
  All five dotted slots per row on its sides and roof shift with it.
- Integrated sight/gas seat shifts 0.50 units toward the receiver:
  x 13.12..15.92 -> 12.62..15.42. It intersects the gas cover along X,
  not an isolated sight tower.
- Front sight becomes two simple **cuboid protective ears**, as in the actual
  FAL Fieldwork builder (src/weapons/geometry/fal-core-silhouette.ts);
  x14.66, z±.72, with a real open central gap. No center pin, hollow
  extruded fork, screw models or extra ear bevels. Base stays integrated.
- Polymer handstop becomes one block .68 x 2.30 x 2.66 instead of the
  P11 .26 x 2.16 x 2.49 fin; its center is at x9.48.
- Preserve short/full polymer, all long/dotted markings, dark P10 butt,
  receiver, magazine, factory muzzle end X19.50, suppressor attachment,
  gameplay and shared weapon-family geometry.

## Safeguards and acceptance
- Measure actual AABB intersections: polymer/steel, steel/sight seat,
  handstop/polymer/steel and sight ears/base.
- Confirm roof and side vent meshes lie over the *new* cover position,
  retaining five broad slots per row and batched geometry.
- Verify truly empty space between the two FAL-like sight ears, no central
  prong, and readable dimensions from side and three-quarter views.
- Keep prior outer barrel/stock datums, existing factory part IDs and
  the P10 stock. Only isolated FNC model files, FNC tests and CI changed.
- Run FNC/FAL tests, TypeScript, build, browser comparison and Arsenal
  desktop/mobile captures; merge only after gates and verify Pages stamp.
