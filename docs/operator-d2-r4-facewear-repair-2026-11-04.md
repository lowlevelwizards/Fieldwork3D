# D2 R4 facewear — mobile screenshot repair and staged build
Date: 2026-11-04 · Base: main `2e56f010` · Branch: `feature/d2-facewear-r4-20261104`

## User-observed defects and remedies
- Balaclavas: approved visual references. **Do not change** apertures, 8-unit cube skull, canonical -Z face or 1:1 fabric/material scale.
- All facewear solids: selected Studio swatches were applied to a reusable material, then reset by the later `poseOperator` color-ledger restore. R4A synchronizes the four recolorable face/accessory materials after `applyOperatorVisualKit`, retaining downed desaturation. Also prevents hidden mask/eyewear tint from becoming stale on subsequent face changes.
- Bandana: old five-row front terminated in a narrow thin triangle while cheek strips stayed horizontally flat. R4B creates overlapping large front folds, broad three-level cheek returns and a joined rear landing/knot with unequal tails. Both saved `raised` and `lowered` modes remain intact.
- Gaiter: raised face sleeve stopped at local Y=+.17; narrow inner neck return lay inside the 8×8 cube skull and disappeared. R4C extends the outer sleeve beneath skull Y=-1 before tapering and gathering into the narrower neck.
- Shemagh: wrapped rear crown and lower wrap left a 1.4-unit vertical exposure band; left/right crown sections almost touched but left a center slit. R4C joins back and side wrapping without closing the deliberately exposed front eye region.

## Invariants
- Cosmetic only; no weapon, armor, vision, IK, hitbox, faction, gameplay or equipment changes.
- No new apparel SKUs; all wardrobe IDs, wearing modes, palettes and saves retain version 1.
- Preconstruct one greedy-union exterior mesh per mode; no per-frame geometry allocation.
- Avoid extra micro-pieces, noisy textures and superficial surface seams.
- Preview cards and Studio show the same model and materials.
- Users can change facewear solids in Quick Play without affecting kit persistence.

## Fast test gate
Run the focused D2 R4 regression step in `.github/workflows/ci.yml`, then the already-present production TypeScript/build step. Full game tests remain opt-in. Manually inspect colors black/olive/coyote/winter-white, and front/side/rear/three-quarter bandana, shemagh and gaiter captures in mobile Studio.

## Release checkpoints
Keep R4A, R4B, R4C and R4D as feature-branch commits. If the PR's critical checks succeed and Pages is idle, merge the compatible batch **once**, then verify the production build stamp. If the prior Pages run is incomplete/failed or build stamp is wrong, do not merge or start another release.
