# AR R4.6 — locked silhouette acceptance contract

## Priority order
1. Recognisable side silhouette and variant-specific negative space.
2. Large authentic component landmarks (stock, A-frame, carry handle, magazine, tube/rails).
3. Actual operator hand/stock/muzzle contacts and shared in-game scale.
4. Matte side markings at 64px/128px; never rescue an unclear outline with microdetail.

## Explicit R4.6 geometry targets (local weapon coordinates)
- Fixed A1 butt X=-13.74, A2 X=-14.30, forward root near X=-6.12. Taller butt and stronger wrist, full-length barrels retained.
- Charging handle X=-5.9, Y=1.6, height 0.8, seated into upper receiver.
- Grip root X shift -3.10 and Y shift +0.5; main firing-hand contact must follow visual grip.
- Ejection port X width 3.28; forward assist = single square-ended slanted 2.3-2.8 unit bar behind the port.
- STANAGs use the same centerline-normal curvature mathematics as AKs: 20 round ~0.10 sweep, 30 ~0.80, polymer ~0.75; two softer 30-rd ribs follow the curve.
- M16A1 triangular and faceted with five large matte upper vents; A2/CAR use differentiated round ribs and a lengthwise seam.
- M16A4/M4A1/Mk18 quad systems use one batched 4-sided rail block family, same top datum as flat-top receiver.
- Mk12 Mod 0 keeps the original faceted PRI tube, raised continuous top bridge and special brake; never add four-side rails.
- A-frame front face vertical; rear face strongly sloped (~55-60 degrees), single large cavity; guard roof and actual sight datum are distinct.
- Birdcage slots run along X parallel to the barrel, NOT vertical across it; factory front device remains inside existing authoritative muzzle X.
- CAR/733 slim retro sliding stocks must not be replaced with the fuller M4 stock; Mk18 receives a uniquely identified tan polymer grip.
- No renamed existing preset IDs, no impact on ammunition/inventory mechanics, no per-frame geometry allocations.

## Reference scale evidence
Local side-view widths after authored X lengthScale (before R4.6 stock shortening):
AKM 32.85, AK-74 32.76, AK-105 27.45, AKS-74U 23.24; M16A1 35.96,
M16A2/A4 36.62, Mk12 35.38, CAR-15 29.89, 733 27.32,
M4A1 29.71, Mk18 25.20.
The true visual release gate is the actual-mesh orthographic report in
`scripts/audit-weapon-ortho-r2.mjs`, plus 64px, 128px and mobile-gameplay review.

## Release policy
Commit coherent stages to feature branch, focused weapon tests and production build.
Group compatible stages; do not overlap merges with pending deployment.
Verify preceding GitHub Pages served SHA before the next release.
Preserve the original user request for explicit visual comparison before considering the art final.
