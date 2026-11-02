# Stage 1B — Blockbench-style silhouettes and neutral mannequin

## Changes merged (2026-11-02)
- Removed curved/extruded faceted helmet geometry from the *active* patrol,
  ACH/MICH, and high-cut silhouette renderer. All three now use BoxGeometry
  parts exclusively in -Z-forward canonical head local space.
- Patrol: low shallow cuboid fabric crown with four perimeter bands and a
  short flat rectangular bill. No sculpted curve or separating visor gap.
- ACH/MICH: stepped rectangular upper shell, brow, deep left/right ear
  panels, and an extended nape. Designed as the visually full-coverage type.
- High cut: narrower upper shell and brow, SHORT temple pads and shorter
  rear skirt to leave the ears exposed. Distinction is geometry, not color.
- Boxes have purposely different outer extents, with small overlaps at
  joins; avoid coplanar surface overlays that cause z fighting.
- Preserved neutral plain material, blank face, proportions, head animation
  adapter, old gear selection and kit ownership.
- Corrected Lab-only no-gun wrist target, rear/outboard elbow pole and
  raised resting hip. At idle no-gun pose, freeze unrelated torso lean and
  disallow ADS head-to-invisible-sight correction.
- The unarmed stance elevation smoothly vanishes with movement, crouch,
  falling, and surrender; do not shift scheduled foot anchors or alter
  game locomotion, hitboxes, limb lengths or weapon grip math.
- The existing Lab review buttons are updated for 1B.

## User visual approval gate
1. In Operator Lab with NO WEAPON and IDLE, review both arms from front
   and sides. Elbows should hang naturally, knees should be gently unlocked
   rather than deeply squatting. Running/crouching remain independent.
2. Use BARE/PATROL CAP/ACH/HIGH-CUT, then rotate between front, side, back
   and 3/4. They should feel like proportionate Blockbench miniatures.
3. Check joints of cap brim and band, helmet forehead and ear panels from
   all views. Reject visible gaps, floating blocks and coplanar flicker.
4. Confirm shape distinctness at gameplay distance, not only a close-up.
5. Check an armed operator and Campaign/Quick Play movement for unchanged
   animation, weapon handling, and collision behavior.

Straps, mounts, patches, pixel camo and further headwear families remain
pending user approval. A GitHub merge does not certify mobile visuals.
