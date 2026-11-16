# FNC P23 — raised skeleton stock, taller hinge, dropped gas block and longer flash hider

## Screenshot findings
Close-range Arsenal screenshots show stock set too low behind receiver, hinge too short, and a slim fore-end gas block that fails to project downward ahead of polymer. User-provided real FNC references show a high skeletal stock attachment and front gas block with pronounced downward mass. Keep the established angular, chunky, intentionally minimal Fieldwork FNC language; no realism microfeatures.

## Art modifications
- Raise **all five** stock meshes in Y by +0.38 art units using the same transform: upper rail, lower kinked rail, hinge, buttpad and inner brace. Their relative join shape, original X extents and negative space remain intact. Additional hinge profile height: top .53→1.00, bottom -2.10→-2.20 *before* assembly-wide movement. Thus its world height grows 2.63→3.20 art units and the raised block still intersects receiver and both rails.
- The **existing** integrated, six-face gas box grows a deeper front vertical silhouette only after transition X12.65→12.96. Rear vented cover bottom remains Y-0.60. At and beyond X12.96 the forward gas-block bottom becomes Y-1.57, visually extending under the exposed barrel while retaining the twin front sight ear opening. Same continuous mesh and UV-mapped 4+4+4 vents; no extra block/slab or geometry.
- Lengthen the factory six-sided muzzle from 1.46 to **1.98** units and re-center from X18.77 to X18.51. Tip stays at gameplay-aligned X19.50; body moves rearward to start X17.52 and remains overlapped by the barrel. Reposition existing dark slot pairs inside the longer body (X17.90 and X18.55), still exactly four external port quads; suppressed configuration unchanged. Keep original radius and six sides.

## Locked constraints
Do not touch STANAG size/position, magwell fit, polymer handguard, receiver/charging handle, rear sight, bore Y0, stock rear X-14.85, bullet mechanics or other weapon-family geometry. Tests must cover stock movement and junction overlap, forward-only gas-block drop, 12 vents/2 ears, static magazine identity, barrel/muzzle intersection and suppressed variant, fixed endpoints and unchanged triangle/mesh budget.

## Verification
Run P23 focused tests alongside historical FNC/P22/STANAG/FAL assertions, TypeScript, production build, actual WebGL side/three-quarter five-rifle comparisons and desktop/mobile Arsenal renders. If a historical test fails because it encodes an approved old silhouette datum, replace it with the new accepted relationship rather than dropping coverage. Merge only after all checks and a healthy preceding Pages release.
