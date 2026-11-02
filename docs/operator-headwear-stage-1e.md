# Stage 1E — Silhouette Confidence (helmet approval pass)

## Principle

Every visible edge needs a structural reason. Broad cuboid shapes carry the look; no thin stacked cap, fussy offset strips, or several fractional-height risers representing a single transition.

This is a **subtractive** pass on the Stage 1D anatomical fit. The unchanged 8×8×8 head and canonical -Z-forward attachment establish the brow, ear, and nape reference. No rig, pose, camera, physics, material, camo or loadout changes.

## Resulting forms

| Decision | ACH/MICH | High-cut |
|---|---|---|
| Crown | One uninterrupted 10.15-wide mass, top Y8.84 | One uninterrupted 9.75-wide mass, top Y8.70 |
| Brow | Single protective lower edge Y4.40 | Single lower edge Y4.50 |
| Ear | Deep continuous side wrap down to Y2.23 | Open central ear: Y5.95 |
| Nape | Joins ear wrap at Y2.23 | One broad rear return at Y3.10 |
| Authored volumes | 7 (previously 10) | 5 (previously 6) |
| Silhouette logic | One clear drop from temple to ear/nape | Brow / open ear / rear return |

The ACH knowingly lowers the old mid-ear edge from Y2.70 to Y2.23 so the nape and ear share a confident continuous lower edge, instead of retaining two tiny transitions. The high-cut retains its prior ear-clearance measurement. Both crowns retain their Stage 1D top measurements.

The existing `unionCuboids` mesher removes internal surfaces, keeping each helmet one overlap-free, orthogonal exterior mesh.

## Acceptance, on actual iPhone and game-scale operator

1. Head-only front: visible face and brow; no floating cap or thin horizontal trim.
2. Side: ACH has one bold temple-to-ear drop; high-cut has a large unambiguous open ear zone.
3. 3/4: each helmet reads as protective shell **around** a head, not a pile of attached rectangles.
4. Full operator scale: silhouette remains distinct with textures and details disabled.
5. Run, idle, crouch, aim, downed, and replay retain prior alignment and performance.

Tests only check mechanical silhouette invariants; visual approval remains with the user before any further helmet detail pass.
