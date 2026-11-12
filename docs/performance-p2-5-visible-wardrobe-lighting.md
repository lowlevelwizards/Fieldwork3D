# P2.5 — Cold outfit lighting: visible branches only

## Device evidence (2026-11-12)

P2.4 follow-up screenshot has a 899ms RAF interval, with 875ms
prior JavaScript, 537ms 3D actor processing, four poses 410ms, and
appearance 385ms. Of the appearance work, **visual kit 356ms** versus
head/collar receiver atlases 28ms. Weapon 8ms, remaining IK+16ms.
The screenshot is a first-use spike, not typical steady-state cost.

The latest full COPY report shows different spikes: 529ms, 381ms,
257ms and 232ms RAF intervals, mostly paused, with large *unconfirmed*
between-callback waits (490ms, 337ms, 220ms, 190ms). These are not
measured GPU times. A late screenshot had 42ms JS P95/86ms RAF P95
during a different recent 120-frame window.

## Concrete cause confirmed in the implementation

`applyOperatorVisualKit` bakes cross-gear contact/directional lighting
for selected armor/rig/pack/uniforms and can contain several hidden
alternatives and occluded subassemblies.

`bakeCastOnGear` previously ran both its key scan and full bake via
`receiver.traverse`. Its per-mesh `mesh.visible` check did not
respect the visibility of *parent groups*. This could bake
thousands of vertices belonging to hidden alternative cuts during the
first operator pose, even though the renderer would never draw them.

A separate zero-caster fast path existed but still updated all world
matrices, computed inverses, normal matrices and receiver bounds before
checking that no eligible caster could shade anything.

## P2.5 changes (selected visuals unchanged)

- Both passes use Three.js `traverseVisible`, exactly mirroring hidden
  subtree visibility. Hidden alternate wardrobe branches defer their
  cross-light bake until the first frame they are actually visible.
- First-visible parts are identified by the *missing* previous bake key:
  they get the complete original contact/directional mask before render.
  No delayed visual pop, reduced light samples or missing costume parts.
- When there are zero eligible source casters, preserve existing exact
  baseline/zero-mask 8-bit output but skip the unnecessary matrix and
  bounding-box construction entirely.
- Preserve all 512px runtime shadows, wardrobe textures, geometry,
  silhouette/IK, 60Hz simulation, collision, and normal rendering mode.

## Tests

- Hidden-child fixture: no invisible bake, exact same first-visible
  8-bit pixels and both shadow masks compared with always-visible
  reference, then idempotent subsequent update.
- No-caster fixture: forbid any world-matrix update and compare unchanged
  baseline output and masks.
- Existing R5/R6 costume shadow, operator geometry/animation,
  fixed-step/critical browser acceptance, build and Pages verification.

This is a targeted optimization based on code inspection, not a claim
of proven iPhone speedup. The following same-seed test must measure
cold visual-kit and steady-state callback rates separately.
