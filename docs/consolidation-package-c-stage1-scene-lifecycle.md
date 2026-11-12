# Consolidation Package C — C1: 3D Scene Lifecycle Consolidation

**Feature branch:** `refactor/consolidation-c1-scene-lifecycle`
**Starting main:** `08ec801933000a0340abd99e21c0442f3f1119d9`, including F0–F1 visual-foundation integration. The F0–F1 Pages job `43230245192` was still queued when C1 started: **do not merge or queue another Pages deploy until the preceding job succeeds and serves the expected stamped build.**
**Basis:** C0 ownership register and verification matrix; A8 authoritative Session geometry, A10 composition, B8 rig-local pose publication.

## Objective

Make repeated generated-site/legacy-site changes reliably release all outgoing 3D scene resources without accidentally disposing persistent gameplay-independent renderer resources. This stage resolves demonstrated disposal coverage gaps, not a speculative redesign of the engine.

**No new controllers.** Preserve exactly one `TacticalScene3D` browser scene/renderer instance across site swaps; no extra RAF loop, view-specific simulation, renderer/context recreation, new graphics settings or change to visual output.

## Audit findings and decisions

1. `TacticalScene3D.applySite` already separates hostiles (retired) from blue operators (retained), removes civilians without disposing globally shared civilian resources, invalidates fog/beam/shadow caches and rebuilds static world meshes. Preserve all of these.
2. The same method called `this.staticBatches.clear()` twice per swap; the second call is redundant after the first empties the batches. Remove duplicate only.
3. The previous root cleanup traversed only `THREE.Mesh` geometry. It omitted `THREE.Line` resources, notably dashed door swing arcs, and did not invoke `THREE.InstancedMesh.dispose()` on generated interior-fragment and legacy grout instances. Each InstancedMesh has independent GPU instance buffers even when its geometry and material are shared. Release those deterministically.
4. The floor-plan-style door swing arcs allocate two materials each (dashed line and hinge dot). Neither was owned by the generated-site material tracker in the current builder. Register both under the **existing** `SiteMaterialLifetime` via its explicit owner callback in generated and legacy builders.
5. Site materials, wall clones and condition patina already have separate disposal owners. Do not indiscriminately dispose every mesh material: that would corrupt shared palettes, floor textures and persistent rigs.
6. `StaticSceneBatches.clear()` already handles its own detached instanced meshes and remains responsible for those buffers. The new site-root helper must not touch static-batch buffers a second time.
7. `setMode('plan2d')` disposes optional miniature-focus buffers while the live WebGL scene persists. Replay cameras/bodycam use current scene/rig and must not be recreated on each switch.
8. A separate whole-app `TacticalScene3D.dispose()` is not a C1 requirement because this SPA currently retains the scene for the page lifetime; adding an uncalled teardown method would be speculative API surface. Future explicit app unmount can implement one when a real caller exists.

## Change specification

### C1-A — Explicit site-graph disposal helper
- Introduce pure `src/rendering/site-scene-lifecycle.ts`, not a controller.
- Traverse only outgoing site root children; retain nominated persistent fog objects.
- Collect site-specific `BufferGeometry` from Mesh, Line (including LineSegments) and Points; dedupe by object identity before disposal.
- Ignore geometries in the existing shared geometry set.
- Independently invoke `InstancedMesh.dispose()` exactly once for each outgoing instance GPU allocation, **regardless** of whether its underlying box geometry is shared.
- Detach only outgoing children; do not dispose shared material or texture resources here.
- Return counts for deterministic tests; no per-frame allocation, renderer mutation or gameplay state use.

### C1-B — Wire scene lifecycle into site swaps
- Replace the previous mesh-only root traversal with the helper.
- Keep friendly operators, fog meshes, full renderer/canvas and cameras untouched.
- Keep hostile rigs, civilian roots, effects and caches on existing authority paths.
- Remove redundant second static batch clear.
- Preserve the exact rebuild order of site/cutaway/fog geometry and historical camera resets.

### C1-C — Site ownership of door sweep materials
- Expose optional `trackMaterial` callback in the existing `doorSweepArc` geometry factory; default identity preserves independent fixture/test call sites.
- Generated doors use `host.track`; legacy doors pass `material=>host.siteMaterials.track(material)`.
- Track both dashed arc and hinge marker materials under the existing idempotent site-material lifetime; they release once on the next site swap.
- Preserve arc geometry, position, color, dashed pattern, visibility and hit testing.

### C1-D — Deterministic lifecycle verification
- Real Three.js synthetic root with two meshes sharing a local geometry, a Line and an InstancedMesh: prove once-only geometry disposal, instance disposal and retained fog/shared geometry.
- Verify independent instance buffers release while shared material/geometry persists.
- Verify generated arc materials dispose once via `SiteMaterialLifetime` and fixture constructor still works.
- Source contract: `applySite` retains B/A world, rig, fog, camera invariants; exactly one static-batch clear.
- Preserve existing scene-frame, scene-memory, material-lifetime, fog, replay and bodycam browser regressions.

### C1-E — Safe integration and release
- Extend the existing Package C PR workflow with Node22 dependency install and only C1-focused tests, not a full historical suite.
- Require architecture integration, project checks, WebGL tactical/replay/Bodycam/Operator Lab smoke and production build on the final feature SHA.
- Wait for any active `main` Pages deploy to succeed, confirm its exact stamp and clear the deployment queue **before** merging C1.
- After merge, verify the new Pages job succeeds and that the public site serves the exact C1 merge stamp. No second merge before verification.

## Explicitly excluded

Rendering aesthetic, lighting/color tuning (F0/F1), shadow resolution, fog masking/disclosure, replay director composition, pose IK, combat evidence, site procedural generation, collision, authoritative Session/simulation, save schemas, visual UI, and the separate Studio/Operator Lab WebGL context lifecycles. Hardware Safari/GPU memory and thermal testing cannot be inferred from Node or headless desktop Chrome.

## Priority handoff to C2

1. Measure render/material/light parity between tactical 2D, 3D, Studio and replay before any changes to the rendering pipeline.
2. Audit bounded scene pools and spotlight updates with actual GPU statistics rather than text-match counts.
3. Keep C1 resource ownership enforced during later scene rendering and material refactors.

## C1 closeout record

- [x] Base audited and lifecycle defects identified.
- [x] Site graph helper and scene swap wiring implemented.
- [x] Site-owned planning overlay materials registered in both builders.
- [x] Synthetic Three.js lifetime regression and focused CI added.
- [ ] Feature PR checks green, including real WebGL smoke.
- [ ] Preceding production Pages release verified / deployment queue clear.
- [ ] C1 merge and exact public Pages build verified.

PR closeout notes carry the actual result; this plan does not preclaim CI or physical-device acceptance.
