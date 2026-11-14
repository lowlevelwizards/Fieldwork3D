# H23 · Later ear onset and deeper nape protection

**Evidence:** three user-supplied side-view Operator Studio screenshots of the live H22 full-, mid- and high-cut helmets (build `4866e91`). In all three, the front transition toward the ear starts too far forward and the rear hem ends too high above the neck.

## Silhouette correction

No change to crown, head cube, ear relief heights or silhouette point count. Keep the Fieldwork low-poly/blocky language.

| Cut | Temple break Z (H22 → H23) | Full ear height from Z | End of ear section Z | Nape transition Z | Nape Y (H22 → H23) |
| --- | --- | --- | --- | --- | --- |
| Full / ACH | −2.05 → **−1.12** | **−0.12**, Y2.04 | +2.35 | +3.88 | 2.35 → **1.85** |
| Mid / MICH 2002 | −2.05 → **−1.12** | **−0.12**, Y3.06 | +2.35 | +3.88 | 2.62 → **2.05** |
| High / MICH 2001 | −2.10 → **−1.15** | **−0.12**, Y5.30 | +2.35 | +3.93 | 2.85 → **2.25** |

The first ear-transition corner now appears ~40% from front to rear, and the full ear opening/guard reaches its intended height at ~49%. The implied ear center (Z+0.5) remains within each opening or guard. It is *not* required to be the midpoint of a protective panel, which also extends back toward the nape. Full-Cut is almost straight from ear to nape but now very slightly **descends**, preserving the older classic shell look. Mid-Cut has a noticeable but smaller ear notch, and High-Cut retains a fully open ear with rear wrap.

All three rear edges sit near or below the cube's anatomical nape landmark (Y2.2). Each still uses precisely six contour stations per side, 58 triangles for the shell and one shell draw call. The coarse fitting envelopes shorten to follow the rearward ear zones; they are not extra rendered geometry.

## Consolidation

`operator-ach-mich-details.ts` no longer duplicates hard-coded hem, nape or stud-height information. The shared `UNIFIED_HELMET_HEMS` data defines those values and both fasteners are anchored relative to the current contour. The narrow shell-color edge and cloth cover already use the same hem; H23 verifies they still meet at the rear and at corners.

No additional per-frame checks, update systems, physics bodies, trim layers, materials, or draw calls. No change to PASGT or FAST variants.

## Verification and release

The new `helmet-h23-rearward-ear-deep-nape.test.mjs` checks fractional ear placement, nape anatomy and coverage hierarchy, shell polygon budget, perimeter continuity, rubber lip corners, cloth seam and strap clearance. Updated historical silhouette tests assert H23's intended geometry rather than freezing old values. Gate merge/release on Ground Zero critical regressions and production build, Operator Studio mobile smoke and relevant armor/rig checks, then confirm the published GitHub Pages build stamp.
