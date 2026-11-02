# Stage 1D — anatomical helmet silhouette fit (approval build)

## Actual reference dimensions (no character proportion changes)

The head mesh is centered at local Y=3 with dimensions 8×8×8, so:
- skull top Y7, bottom Y-1; sides X±4; face −Z4; rear +Z4.
- implied hairline Y5.7, brow Y4.3
- implied upper ear Y4.0, ear center Y2.6, lower ear Y1.35
- implied lower rear skull/nape Y2.2

The landmarks are only fitting references: DO NOT model ears or features into
the head or change its scale, bone offset, IK, aim, replay or camera. Geometry
uses canonical -Z-forward under the existing head attachment transform.

## Silhouette targets in local head coordinates

| Feature | ACH/MICH | High-cut |
|---|---|---|
| Crown top | 8.84 | 8.70 |
| Front brow lower edge | 4.40 | 4.50 |
| Center side/ear edge (X4.4,Z0) | 2.70 | 5.95 |
| Rear nape edge (X0,Z5) | 2.23 | 3.10 |
| Main aesthetic | Deep wrapped military protection | Brow/rear protection with exposed ears |

Compared to old crown top ~10.2 and ACH brow ~5.9, both fit much
lower and closer to the skull. The ACH side drops over the implied ear
region, with back edge wrapping lower than the brow; the high-cut keeps
its side empty around the ear center while retaining a deep rear.

Both are constructed from authored rectangular volumes and emitted as ONE
orthogonal exterior mesh using the existing cuboid union mesher (no
internal intersecting faces). No new details, straps, rails, materials,
camo, proportions, or physics.

## Visual acceptance sequence

1. Head-only orthographic front: both brows should sit over the upper
   forehead, not hover at hairline; front face must remain visible.
2. Side: ACH covers toward the ear center and down to rear nape.
   High-cut rises cleanly around the mid-ear then drops again at rear.
3. Three-quarter: both should look like shell protection around head,
   not a stack of hat bands.
4. Return to full operator at gameplay scale and verify the helmet does
   not feel oversized or tiny; ensure no flicker, clipping, floating seams.
5. Armed idle, run, crouch, turn, downed pose and replay must be unchanged.

User must approve the silhouettes before construction details. A merge or
passing unit test is not a substitute for visual approval on iPhone.
