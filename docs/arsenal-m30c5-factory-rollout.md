# Arsenal M3.0C5 — second factory batch, GPU-first acceptance

C4 production already compiles **AKMS, AKS-74U and M4A1** from exact
six-slot preset identities. C5 considers four additional **fully authored**
factories; never automatically compiles a family, a receiver-only match,
customized magazine or other nonfactory loadout.

## C5A candidate evidence (before activation)

| Factory ID | CPU-side eligible submission estimate |
| --- | ---: |
| `ak-ak74` | 9 |
| `ak-aks74` | 9 |
| `ak-rpk74` | 9 |
| `ar-m16a4` | 8 |
| **Cohort total** | **35** |

**C5A Chromium results:** 12/12 camera comparisons passed. Real WebGL
body calls: AK-74 **23 → 14**, AKS-74 **24 → 15**, RPK-74 **23 → 14**,
M16A4 **31 → 23**. Triangles unchanged and zero pixels over the
visible-difference threshold; mean RGB drift was effectively zero.
These prove actual render submissions, not a measured FPS uplift.
The C5B live-default-builder comparison must independently repeat them.

- Run the actual `buildWeaponSilhouette` constructor twice with factory
  configs; disable production batching for both as independent baselines.
  Apply the existing reversible same-slot compiler only to the second.
- Render four guns × three camera angles, compare actual
  `WebGLRenderer.info.render.calls`, unchanged triangle totals and actual
  `readRenderTargetPixels` RGB differences. Reject any perceptible drift.
- Validate Workbench part bounds and selection anchors, independent magazine
  identity, real picking name prefixes, unchanged save content and reversal.
- Preserve C3/C4 browser, accessory, shotguns, typecheck and build gates.

## C5B conditional activation

C5A passed. Exactly those four IDs were added to the C4 factory
allowlist and CI now runs a second browser pass using **live default builder**
versus explicit `{rigidCompilation:'disabled'}` baselines.
Maintain exact per-preset identity; no changes to gameplay ballistics,
poses, reload hand-off, accessory geometry, metadata or save format.
Existing C4 factory commitments stay green.

## Release gate

Keep this PR draft until C5A/C5B real WebGL data, lifecycle tests and
broader integration checks pass. Integrate only at a checkpoint with no
other GitHub Pages deployment queued or running; after merge verify that
public Pages serves the expected build. E6.26/27 Arsenal geometry pooling
and batching are independent stacked experiments; don't merge or combine
their paths without checking collisions and ownership assumptions.
