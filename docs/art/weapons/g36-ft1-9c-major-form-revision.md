# FT1.9C — Major-form revision and rendering acceptance

**Branch:** `feature/g36-ft1-9a-b-reference-blockout-20261116` / draft PR #1568.
**Status:** Art-directed experimental refinement of FT1.9B original-pattern G36. Still not an equipped item or factory preset.

## Source-image diagnosis

Actual FT1.9B screenshots: the long open bridge and two-hole stock establish identity, but the handle opening is too thin; an optic appears detached like a chimney; receiver and fore-end read as stacked uniform rectangles; pistol grip and magazine hang too far; the trigger region is muddy. The shared WebGL lab's initial top view incorrectly collapses rows because the camera looks down the Y separation axis. The initial three-quarter unlit dark material hides meaningful depth.

## FT1.9C priorities

1. Preserve established full G36 length X -15.05..19.50 and existing six part slots. Expand **negative space** in the handle and stock without increasing over-all envelope.
2. Make the optic two squat, *connected* masses seated onto the raised bridge, no detached hood mesh.
3. Break the receiver into a sculpted angled crown and a tapered lower with a **real trigger-guard cutout**, not additional plates.
4. Shorten and broaden the grip, shorten the polymer mag approximately 15%; give mag an assertive moderate curve and incorporate its floor in one mesh.
5. Make the handguard a distinct tapered ten-point prism with a sloped front cap and angled lower edge; no individual ventilation geometry.
6. Keep the long exposed barrel and cap it with a shorter, stouter muzzle.
7. Fix the top/front multirow comparison by rotating each model in-place, NOT rotating the orthographic camera through the row positions. Add a soft-lit neutral clay mode, preserve flat silhouette mode and the real 64/128px views.

## Acceptance

- Geometry continuity, actual 3 physical cutouts + 1 trigger cutout in fully assembled side silhouette.
- Hard safety: unchanged live weapon catalog, gameplay, ammo, issued factions and existing rifle builders.
- Measured triangles and meshes; shape-economy target must not exceed 13 main external meshes unless justified.
- Actual WebGL screenshot of side/quarter/opposite/top/front in **both** silhouette/clay views and 64/128px/mobile. Top and front rows do not collapse. Browser page errors fail CI.
- Human review of new captures; no automatic claim of final art approval or a main release.

**Deferred:** realistic polymer finish, dual-optic lens details, vents/selector decals, G36K/C variants, rig/reload integration.
