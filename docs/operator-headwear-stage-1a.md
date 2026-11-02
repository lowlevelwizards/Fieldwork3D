# Stage 1A — Headwear silhouette approval checkpoint

## Now implemented

- Three *separate* silhouette profiles: soft low patrol cap, deeper
  ACH/MICH-style shell with lower ear coverage, compact high-cut shell with
  deliberately raised side edge.
- Continuous faceted low-poly shells, no layered rectangular helmet slabs.
- Patrol cap has a distinct shaped, finite-thickness projecting bill.
- All new geometry is authored in canonical head-local **-Z forward**, +X
  right, +Y up, then attached to the existing head's -Z compatibility frame.
  The old character head, IK, face, foot and weapon transforms do not change.
- The silhouettes share an intentionally neutral, untextured material for
  this review. Camouflage and finished materials remain Stage 2 work.
- Bare-head reference hides hair and all legacy generic headgear geometry.
- All operator pathways (including old saves without a wardrobe record)
  now resolve headwear from the equipped head slot; no second generic helmet
  is rendered underneath the new shell.
- High-cut-with-rails saves currently display the correct new high-cut
  **base shell**, without rails. Rails are held until the construction pass.
  Other headwear families still use existing geometry; they are NOT signed off.
- Four one-tap matched head-only Lab presets support a quick visual review.

## Visual approval criteria (must be reviewed on actual iPhone build)

- BARE has no floating cap/helmet/hair and preserves the blank face.
- Patrol cap is low and soft; formed forward bill has no gap or z-fighting.
- ACH sits outside the head and visibly covers ears in side view.
- High-cut clearly exposes ears and has a different profile from ACH.
- All three are distinguishable as grey silhouettes from front, side,
  three-quarter and gameplay distance, without relying on camo or hardware.
- No wrong-way orientation after turns or head/body aim motion.
- No unintended view/camera, replay, movement, or performance change.

## Deliberately deferred

- Chin straps, suspension, fabric seams, shell edge finishing, rails, shrouds.
- PASGT, Soviet steel helmet, bump/skate, baseball, beanie, boonie etc.
- Textured camouflage palette, helmet covers and material detail.
- Full headset, facewear and eyewear fit compatibility review.
- User's final call on head proportions and overall stylization.

The four baseline silhouettes need **visual sign-off** before details or new
headwear families are expanded. Source merge does not imply that production
deploy succeeded or that the graphics have been manually inspected.
