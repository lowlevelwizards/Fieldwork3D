# Operator Lighting R6 — first production-performance checkpoint (2026-11-06)

## Goal / non-negotiable visual contract

Keep the accepted R5 silhouette, contact depth, camouflage colors and one scene shadow map. Improve the expensive **first appearance/refit** CPU bakes without changing the visible vertex colors, UV0 textures, shader/material families, IK or gameplay.

R5 implementation already provides:
- Per-geometry normalized byte vertex AO, 8-bit independent masks.
- Separate self/cross-assembly contact and directional shading.
- Large static receivers refined with bounded vertex budgets.
- Static mesh merging; per-rig GPU pose cavities; projected-size LOD.
- One gameplay shadow scheduler and invalidation policy.
- Optional R5 Studio atlas/toon experiments remain **debug-only**.

## R6 code changes in this branch

1. Short-circuit already-stamped local equipment AO bakes before world matrices are rebuilt. For first-use bakes, reject remote equipment using a **conservative 1.901-unit** AABB envelope around each receiver. This includes the existing maximum 1.85-unit ray travel plus .05 normal offset; precise per-vertex math is unchanged.
2. Before collecting cross-assembly caster volumes, check whether any visible/eligible receiver actually requires a new appearance key. Reuse existing 8-bit proximity and directional CPU mask arrays on changed keys. Cull caster records per receiver mesh using each semantic rule's maximum reach + .076 normal offset. The original rays, strengths and composition remain untouched.
3. Avoid per-triangle Vector3 allocations and nested per-source-vertex JS-array copies during one-time receiver mesh refinement. Preserve all vertex formats, geometry, box bounds, density budgets, UVs, and normals.
4. Add focused R6 tests for all cached fast paths, far-caster pixel parity, no-gear shade reset, 8-bit AO and UV invariants. Do not use wall-clock time as a CI assertion.
5. Add `npm run bench:operator-lighting`: four full rigs, three kit variations, 60 pose ticks, rebuild timings, unique geometry, CPU mask memory. Explicitly **CPU only**; do not present these as real GPU timings.

## Required validation before main / release

- **Code gate:** `npm run check`, focused R5 and R6 tests, existing mobile screenshot jobs. Verify no changes to source asset textures, UV coordinates, active gear shadow placement or material shader variants.
- **Visual matrix:** six representative looks (solid tan, dark green, woodland, light UCP, mixed camo/solid, minimal gear); front/side/back/fit; lit top, helmet/brim, pouches, forearm and vest waistline. Compare against the user's accepted R5 reference, not just a code snapshot.
- **Four-soldier browser matrix:** 2 and 4 operators; paused and moving; indoor/outdoor; quality/balanced/performance; multiple camera zooms; dynamic equipment changes; fog enabled. Record FPS frame-time p50/p95, JS main-thread time, WebGL draw calls, renderer geometry/texture counts and shadow-map repaints.
- **Memory/no-leak soak:** repeatedly switch kit presets and enter/exit Quick Play at least 30 times. After old objects are disposed and GC settles, no continuing upward texture/geometry trend. Also check repeated appearance selection does not perform a fresh lighting bake.
- **Physical iPhone Safari:** inspect 10-minute sustained gameplay for thermal throttling, shader compile stalls, black/inverted cast shadows, lost context, UI stutter and scene restore. Browser mobile emulation is not physical device evidence.
- **Target:** hold the project's pre-lighting playable frame-time baseline at the same camera/scene and settings; avoid a persistent >10% slowdown in p95 active frame times. Target 30 fps floor on the baseline supported phone (33.3 ms frame budget) and 60 fps on capable phones. These are release targets, **not measured claims**.

## Release policy

Do not merge solely because Node unit tests pass. Visual and performance gates should pass at an explicit release checkpoint. Do not overlap an ongoing Pages deployment; verify the prior production build served the expected SHA. Keep experimental UV1 atlas and toon modes out of production unless separately approved. Existing AK weapon PR is unrelated and should not be coupled to this release.
