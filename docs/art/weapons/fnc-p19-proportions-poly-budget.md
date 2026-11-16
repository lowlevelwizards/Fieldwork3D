# FNC P19 — handguard, barrel and muzzle proportional refinement

## Intent
Review of user-supplied Workbench side and 3/4 screenshots after adopting the common AR STANAG magazine. The shared magazine is approved; preserve the receiver, magwell, stock, front sight, operating slot and model scale. Do not rework this into a realistic high-poly replica.

## Scoped changes
- Raise ONLY the oversized polymer underside: change the shared `lowerFlare` factor from `.83` to `.60`. At the full-depth midsection this raises the lowest surface about `.234` art units. Polymer roof, six-face cross-section topology, gas roof, side/top vent rows and overall longitudinal stations stay fixed. Handstop and low-side grooves already share this transform.
- Slim the visible box barrel in both cross-section directions from `1.34` to `1.24` (7.5%). Keep bore center Y0, start X8.55 and all endpoints/sight interfaces.
- Lengthen the six-sided muzzle device from `1.30` to `1.46`, beginning X18.04 instead of X18.20 while preserving tip X19.50. Keep radius `1.03` and six sides; redistribute the existing two pairs of port quads within the longer surface. No second sleeve or additional meshes.
- No magazine, gameplay, stock/hand contact, weapon configuration, reload animation, or factory-vs-suppressed muzzle behavior changes.

## Polygon and piece audit
`node --experimental-strip-types scripts/audit-weapon-geometry.mjs` now prints **real submitted triangles, meshes, buffer vertices, geometries and slot breakdown** for factory FNC, FAL, G3A3, M16A2 and M4A1 (and the original AKM baseline). Counts are from actual production `buildWeaponSilhouette` geometry, not estimates from control points or screenshots. These P19 modifications change dimensions but do **not** add vertices, faces or mesh objects. New P19 tests gate the FNC handguard at 160 triangles, overall <=800 triangles and <=34 meshes, while comparing its live counts to peers.

## Acceptance
- Side: taller underside does not sag as far below the receiver; polymer still distinctly chunky and shorter than gas cover.
- Three-quarter: same six-face top and broad side facets; side ribs remain anchored, upper metal vent row fully visible.
- Front sight, barrel start and muzzle tip remain connected. Factory port quads stay inside the elongated device; suppressor path omits both device and ports.
- Run focused FNC P19 + STANAG, FAL budget, TS/build and browser screenshot comparisons on PR before release. Merge/deploy only at the next stable checkpoint; never stack onto a pending Pages deployment.
