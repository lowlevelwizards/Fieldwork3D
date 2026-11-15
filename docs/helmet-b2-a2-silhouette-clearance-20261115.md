# B2-A2 — SSh-40 corrective silhouette and skull-clearance pass
Date: 2026-11-15. **User-provided live mobile Studio screenshots** after B2-A1 are the acceptance baseline: too small, over-faceted, M1 lookalike, two tiny skin-color corner leaks.

## Source audit / root cause
- `src/operator-ssh40-helmet-profile.ts` initially had **four successive large exterior contours** before the rim: tiny roof at Y8.605, narrow shoulder at Y8.07, upper bell at Y6.78, wall at Y4.66. Every region had a noticeable tone change and a full perimeter band.
- B2-A1 SSh outer width ±5.4 and upper octagonal perimeter (side ±4.63 at Y6.78) did **not** fully surround the unchanged 8×8 skull's X/Z corners near Y7. The observed two tan triangle chips match this exposed skull-corner failure. Do not conceal them with paint or a fake trim.
- Current M1 R4/R5 is approved: top Y10.24, front -6.93, projecting heavy rolled rim. Do not alter it.

## Authored B2-A2
- **Three major exterior forms:** small top crown → one broad shoulder → one continuous sloping bell wall. No extra mid-shell bevel ring.
- Top Y9.65, outer half-width 5.86, front -5.92, rear +6.08. Rolled lip extends ~0.14 sideways, 0.08 forward, 0.06 rearward beyond broad wall. Front/side/rear skirt bottoms ~3.98/3.78/3.38.
- Compress large contour vertex shades to avoid banded/tiered reading while retaining underside shadow.
- Keep single constructed mesh and its atlas UV/UV1/color/normals, material ownership, real recessed underside, shadow policy, and existing saved Soviet paint colors. Keep M1, PASGT, ACH/MICH and M56 unchanged.
- Align `HEAD_SILHOUETTE_METRICS`, `SSH40_FIT_LANDMARKS` and **non-rendered** coarse fit envelopes with the actual B2-A2 geometry. Fit proxies cannot be used as alternate rendered helmets.
- Tests raycast *actual shell triangles* along all four skull diagonals at multiple elevations (Y7 to 5) and reject shell intrusion into the 8×8 head, which caused upper edge skin-colored leaks.

## Acceptance and release
- One shell, lower triangle count than B2-A1, no extra band; M1 remains distinct due its long brim and taller pot; SSh has a restrained integrated rolled edge.
- Headwear regression / material / historical M1 tests; focused B2 geometry/clearance; project production build + typecheck; 44 mobile Studio captures (M1, SSh, PASGT, DDR, covers and strap states). Rendered front/side/back/FIT must receive user review before a release.
- Feature branch only. **Do not merge/deploy** until CI and visual acceptance, with existing active production releases respected. The later Soviet period strap is a separate B2-B stage.
