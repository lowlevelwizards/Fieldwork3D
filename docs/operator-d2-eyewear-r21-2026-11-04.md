# Fieldwork Eyewear R2.1 — silhouette refinement and material pass
Date: 2026-11-04

## Visual audit
Mobile screenshots of build 9aadf1f confirm successful chunky square civilian frames, a deep field dust housing, and distinct twin retro cups. Preserve those geometric families untouched.

## Implemented stages
- A: aviators retain tall pilot stature but terminate in a wider, fuller teardrop shelf rather than long pointed V/fangs. Tactical wedges retain two independent panes, with the leading edge of each YZ wing blending into the upper and lower lens corners and tapering rearward to an understated temple.
- B: eyeshield remains one very tall sheet, uses thinner bottom framing and a massive upper visor canopy. Low-profile goggles become narrower, with a larger nasal relief, deeper rear face gasket and restrained strap mounts. This exaggerates their different construction logic (open protective plate versus enclosed seal).
- C: clearer but still translucent lens materials, slightly stronger selected tints, and a single broad four-corner facet per lens instead of tiny highlights. One shared facet material per lens material, one-time mesh creation; pose-time changes only update opacity.
- D: focused geometry/material regression tests, wardrobe and mobile lazy-loading checks, public Pages release gate.

## Invariants
IDs, saved appearances, standard glasses variants, goggles placements, facewear compatibility, equipment stats, gameplay hitboxes, IK and team behavior are unchanged.
Construction is allocation-once, visibility-toggle-only. Do not rebuild geometry in pose.
Production release only after previous Pages succeeds, public build matches main, focused tests pass and CI build/typecheck passes.

## Mobile visual acceptance after release
Evaluate aviator lower profile, 3/4 side wing connection, shield-versus-low-goggle comparison, lens tint at 3-column preview size; preserve approved standard, field and vintage models.
