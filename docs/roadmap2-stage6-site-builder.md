# Roadmap 2 Stage 6 — 3D site-builder separation

Base: Roadmap 2 Stage 5 deployed main `57a38572cfaf7d05c7a65f1d8eea0d5731d7e4c2`.

## Purpose

Make 3D site construction an explicit subsystem, without introducing a
second simulation, second map generator, or a competing rendering path.

Before Stage 6, `src/breach-3d.ts` held both the site lifecycle and
~600 lines of generated/legacy geometry construction. Stage 6 moves
construction and the static-batch finishing pass to
`src/rendering/breach-site-scene-builder.ts`.

## Boundaries and responsibilities

**`TacticalScene3D` remains authoritative for:**

- Site swap orchestration and scene root replacement; removal of expired
  hostile rigs and civilians; retained friendly rigs; action beam reset.
- Material, texture, geometry, shadow and static-batch lifetime/disposal.
- Renderer, camera controls, fog presentation, replay and live actor/door
  updates; rendering only reacts to observed/disclosed state.
- Reusable material/mesh factories, signatures and shared caches.

**`breach-site-scene-builder.ts` now owns:**

- `buildSiteWorld` entrypoint for both generated and legacy fallback sites.
- Generated rooms/floors, aging textures, small fragments and ground wear.
- Generated roof, walls, their wear, façade promotion and registered intel
  surfaces, keeping previously established fog cutaway rules.
- Opening and door/window orchestration via the existing
  `breach-site-openings-builder.ts`.
- Existing exterior via `breach-site-exterior-builder.ts`.
- Covers and actual fixture silhouettes via `fixture-visuals.ts`,
  destructible alternate visuals, story details and wall-mounted props.
- Instanced site micro-debris via `breach-site-micro-debris.ts`.
- Legacy fall-back floors/walls/doors/cover/scene props, without changing
  materials, placements or visuals.
- Static batches, excluding animated door leaves, thresholds, movable
  furniture, cutaway walls and dynamic overlays.

**Typed port:** `SiteSceneBuildPort` exposes only the scene's mesh
factories and current resources. Scalar values whose identity can change
(`roofMaterial`, `windowPaneMaterial`, wear plans) have
write-through accessors. Collection references are acquired fresh at each
build after the scene has retired the previous site. The builder never owns
the live session or renderer and does not mutate route/LOS/collision site data.

## Implementation and parity acceptance

1. Extract complete generated and fallback methods, keeping the body/order
   of their geometry and registration calls unchanged.
2. Extract micro-debris invocation and static-batch finalization into the
   same site-construction owner; reuse existing sub-builders.
3. Keep the scene-level `applySite()` cleanup and batching lifecycle.
4. Test real generated Three.js objects, deterministic same-seed transforms,
   all site door/window/cover/intel registrations, the legacy fallback,
   static batching, unchanged input site, and builder ownership.
5. Update the historical source-location tests for actual new owners,
   retaining their assertions about physical geometry, façades and furniture.
6. Run the architecture critical suite, scene/geometry/fog/opening tests,
   production TypeScript/Vite build and the prior Pages release checkpoint.
   Merge at a clean release checkpoint only, then verify the new live
   `fieldwork-build.json` ID matches the merge SHA.

No site generation changes, pathfinding/cover edits, 60 Hz simulation changes,
new sight or replay disclosure, new asset variants, gameplay tuning,
new texture resolution, or implicit performance claims are in scope.

## Device validation caveat

Headless build and Three.js structural checks establish architecture and
geometry determinism, not rendered-pixel equality on a particular phone.
Manual comparison on identical seed, camera, fog state and graphics settings
is still the appropriate gate before any claim of visual or mobile FPS
improvement. This stage is not a performance optimization.
