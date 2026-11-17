# E6.26 — Arsenal exact immutable geometry pool pilot

Status: **draft**; stacked on E6.25 / E6.24 / E6.23 / E6.22; production is unchanged.

This is intentionally a narrow first weapon step. It shares underlying geometry
buffers between different modular firearm builds in the **same** Arsenal renderer
and gallery thumbnail session. It does **not** merge the entire gun into one
static mesh, replace source art, or interfere with movable parts.

## Design invariants

- The normal `buildWeaponSilhouette` is still called for every actual
  configuration change. Geometry sharing occurs afterward for the six authored,
  selectable `family-<slot>-...` part names. There is zero new rig integration,
  gameplay geometry, ballistics or pose logic.
- A hash buckets candidate buffers, and an exact byte-by-byte comparison of
  all attributes, indices, groups, draw range, and typed-array metadata
  determines whether geometry can be reused. A hash collision cannot produce
  incorrectly shared geometry.
- Exclude transparent and alpha-test meshes, mesh variants with custom depth
  or morph targets, instanced rails, unattached decorative pixel decals and
  everything whose geometry cannot be proved to be immutable static buffers.
- Every Mesh, name, transform, userData, material and part picking/Workbench
  socket remains independent. Names and stock bounds must remain identical.
- Geometry is ref-counted per owning weapon root; idle buffers are retained
  for later builds up to a 512-entry per-viewer budget. On saturation, the
  oldest **idle** buffer is evicted, never a live buffer. Shared materials stay
  owned by the original weapon-finish registry. Instance buffers are retired
  when their owner is released.
- After preview teardown, all geometry held by the per-viewer pool is freed.
  Thumbnail failure paths also use `finally` to clean up their scene nodes.
- `?e626Weapon=1` is explicitly opt-in for Arsenal viewport and thumbnails.
  **Default is off**, and live operators/dropped firearms are out of scope.

## Critical acceptance

1. Synthetic equal / altered vertex buffers must share only when identical;
   owners, materials and transform state remain different. Cache eviction and
   late release never dispose buffers under a visible model.
2. Two actual M4A1 models retain per-part names, stock-contact measurement,
   bounding boxes and socket markers while reusing authoring buffers. Legacy
   shotgun still uses the original disposal contract.
3. Existing E6.23–E6.25 fixture parity tests and production bundle must pass.
4. Chromium 430×930 mobile browser opens actual Arsenal, checks M4 and FNC
   hero previews plus FNC Workbench canvas OFF/ON, asserts no JS errors or
   missing socket targets and records real geometry-pool utilization;
   screenshots must meet ≥98% color agreement. Upload failure captures.
5. Follow-up browser comparison should edit multiple receiver/handguard/stock
   parts and measure authoring CPU, memory, draw calls and shader compilation
   before expanding to weapon rigs. This stage **does not** reduce renderer
   draw calls by itself and makes **no FPS claim**.
6. E6.24/E6.25 exact-head browser checks must be green before integrating
   this stacked stage. Reconcile current `main`/Pages build and concurrent
   release status before any merge/deploy.

## Beyond E6.26

E6.27 may compile multiple static siblings **within each independently
selectable component** and share the result across operator, Arsenal,
thumbnail and dropped-gun views. Preserve component names and child transforms
via groups or mapping; keep mutable magazines, lights, sling, mounts,
animated elements and all physics sockets independent. Do not start with a
whole-gun bake, which would destroy configuration and articulation freedom.
