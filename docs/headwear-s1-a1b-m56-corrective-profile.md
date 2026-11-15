# S1-A1B — DDR M56 crown, integral flare, fore/aft sweep and triangle artifacts

## Reason
Actual post-deploy iPhone Studio images showed the newly unified M56 remained too broad and flat on top, had a perceptually separate shelf-like flare, and showed several small dark triangular faceting artifacts along the lower transition. This is a *corrective pass on the one-piece shell*, **not** another headwear-family redesign.

## Geometry spec (canonical Y up, -Z front)
- Keep exactly eight planar perimeter facets, a single indexed stamped shell, the extents top 8.775 / X ±6.87 / front -6.80 / rear +8.10, the hollow underside, the current M56 wardrobe identity and all color options.
- **Smaller angular crown:** top half-width 3.65→3.08, front 4.05→3.48, rear 4.35→3.72; broader visible diagonal shoulder (same proven skull-clearing shoulder at Y8.07).
- **Continuous flare:** raise the beginning of the outward skirt to Y6.35 (old Y5.52) with intermediate side 6.03 and rear reach 7.12; change edge-top Y4.73 and side 6.74 to keep the final lip slim, not a thick projecting visor. One long tapering steel mass with no new contour ring.
- **More legible swept edge:** lift front lip bottom to Y4.74, lower rear lip to Y3.97 (previous 4.65/4.225); keep full width and front/rear extent. Fore-aft difference increases from 0.425 to 0.77 while maintaining crown and head clearance.
- **Remove dark triangular shading:** stamp one area-weighted outward normal per authored quad (both constituent triangles), rather than computing divergent triangle corner normals across noncoplanar swept facets. Retain explicit outward winding and region-specific atlas color.
- Adjust only DDR M56 historical early rivets and optional net to sit on the revised shell; no new decorative hardware.

## Hard gates
- Match 8-facet profile and original maximum dimensions.
- All real skull-corner ray clearance tests, hollow underside normals, no degenerate triangles, consistent normals and outward winding across each quad.
- Preserve M1/SSh-40/PASGT/ACH/soft caps and all wardrobe options; no changes to gameplay protection.
- Focused and broad CI, TypeScript production build, mobile Operator Studio smoke, 44 front/side/back/FIT captures for M56 versus approved M1 and SSh-40.
- Merge to main only when checks pass and last Pages production release succeeded. Verify new Pages build stamp equals merge commit.
