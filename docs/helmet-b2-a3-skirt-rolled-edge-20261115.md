# B2-A3 — SSh-40 skirt and rolled-edge refinement (2026-11-15)

## User direction
Mobile live screenshots of B2-A2 accepted the deliberately **boxy, simple eight-sided crown**. Do **not** round it; the other game helmets can even be too rounded by comparison. Refine only the lower skirt and perimeter.

## Scoped changes
- **Locked without modification:** roof and shoulder stations, perimeter point count, shell maximum extents, front/side/rear lower hem, existing Soviet paint/presets, all other helmets, gameplay hitbox/protection, all operator/head alignment and saves.
- Carry existing broad lower wall to Y4.62 rather than 4.72, with only slightly fuller lower-bell footprint. Do not add contour rings or a new shoulder.
- Start the rolled edge at Y4.05 rather than 4.18; maintain its original Y3.78 low boundary. Perimeter band height decreases **0.40 → 0.27 world units**. The lower skirt now widens only ~0.07 laterally / 0.03 forward at its tiny top roll, preserving the iconic blocky dome without the shelf.
- Restrict the dark steel-lip material region to the actual short rim wall. The lower skirt is painted as the main shell (region 0), eliminating the black band that previously occupied the last half-unit of sidewall. Slightly lighten only the SSh steel-lip ink (221→232); no changes to M1/PASGT/ACH/MICH material tiles.
- Keep front hem ~3.98, side ~3.78, rear ~3.38, outer half-width 5.86, front -5.92, rear +6.08. No fit metadata update necessary because maximum bounds stay identical.
- Keep one mesh, hollow inset underside, head-corner clearance and shadow/material runtime contracts.

## Acceptance
- B2-A3 tests lock the unchanged roof/shoulder, new narrow rim thickness, gentle skirt flare, same hem/bounds, interior and skull-corner ray clearance, exact UV assignment so only actual rim gets the dark region.
- Test Soviet steel edge texture in isolation, and explicitly protect M1 and PASGT ink.
- Run focused helmet tests, full affected-domain critical regression, TypeScript/build, mobile Studio smoke, 44-view comparison. At equal front/side/back/FIT camera angles, judge only lower silhouette and rolled steel edge. Do not claim historical/user visual sign-off from CI alone.
- Feature branch and draft PR. **No merge/deploy until accepted** and prior GitHub Pages production has been verified.
