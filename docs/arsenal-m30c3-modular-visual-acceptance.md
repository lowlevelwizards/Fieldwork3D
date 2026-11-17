# Arsenal M3.0C3 — opt-in modular render parity checkpoint

## Intent
Validate the M3.0C2 reversible same-installed-part compiler against real
Three.js WebGL rendering *before* any gameplay or Arsenal integration.
Unlike the released legacy shotgun bake, modular weapons retain selectable
part identities, independently controlled magazines and mountable surfaces.

## Measured pilot selection
The M3.0 production audit ranked factory `ak-akms` and `ak-aks74u` at
**11 potential body submissions removed** each. An `ar-m4a1` control
spans a second body family at **8 potential submissions**. These are
read-only CPU-side estimates; the browser acceptance records real
`WebGLRenderer.info.render.calls` and triangle counts.

## C3 proof (branch-only until all CI passes)
- Both original and compiled versions are built separately with the same
  authoritative `buildWeaponSilhouette` used in Arsenal, live operators and replay.
- Only the five rigid, non-magazine slots are considered: receiver, barrel,
  handguard, stock and grip. Each call uses the **installed part ID** and
  preserves every named part prefix required for Workbench picking.
- No production code calls the compiler; no config/loadout/save mutation,
  no detach/flatten of magazines, no authored overlays, accessory lens,
  instanced rails or interactive material states.
- Dedicated Node tests check all three real factories, actual mesh
  submission differences, complete triangle counts, part/whole bounds,
  magazine reference identity, slot selection names, restoration and
  untouched saved loadouts.
- Dedicated Chromium WebGL lab renders **three camera angles × three factory
  guns × two geometry states**. It compares actual GPU framebuffer pixels,
  GPU draw calls and triangles. Original and opt-in comparison art is
  uploaded in CI. Acceptance is at least 3 actual render calls removed
  per view, triangle count unchanged and pixel drift under 0.1% of pixels
  with mean channel delta under 0.025.
- Run the existing shotgun pixel-parity lab, physical attachment visual
  proof, mount contracts, compilation and build in the same feature CI.

## Release gate and follow-up
C3 is an *evidence stage*, not authorization to enable modular consolidation
in live gameplay. If the preview pixel, Workbench or part interactions
drift, repair the compiler or reject the candidate rather than watering down
the check. Reconcile current main and merge a logical release batch only
when all critical evidence passes and no GitHub Pages deployment is running.

C4 will decide **per-part applicability** based on actual pixel/draw proofs
and further test live reload, attachment switching, replay and operator
animation transitions before safely wiring the compiler into shared
production construction. Preserve the original art and performance
measurements as baselines.
