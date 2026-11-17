# E6.20–E7 — Fieldwork visual asset compilation program

## Architectural decision
Stop treating every primitive box as a permanent independent renderable.
Keep current procedural shapes as **authoring recipes**. Compile rigid
compatible geometry into versioned, reusable visual assets, then instantiate
those assets without rerunning their authoring code when an identical
configuration already exists.

This is a cross-game initiative (sites, windows, doors, fixtures, equipment,
weapons, helmets, wardrobes, characters, studios, thumbnails, replay). It is
**not** one giant mesh per scene. Fewer meshes and fewer materials, shaders,
resource uploads, allocations and draw calls are separate goals.

E6.19 measured over 90 live frames:
- Known exterior facade detail: 17,010 / 15,210 draws (seeds 23 / 97).
- Known exterior walls: 7,830 / 8,370.
- Wall weathering: 6,120 / 7,920.
- Total transparent draw counts: 39,950 / 44,391.
- Unclassified remains 3,844 / 5,665.
E6.18 reduced main draw p95 by only 1 / 6 per frame. The broad compiler
must achieve bigger gains safely, rather than just simplifying artwork.

## Invariants (nonnegotiable)
1. Never combine independent fog/discovery/personally known owners.
2. Preserve material identity and pass (transparent, alpha-tested, opaque,
   renderOrder, depthWrite, light/shadow flags). A single glTF/model can
   still have multiple material draw calls.
3. Keep dynamic hinges, movable doors, destructible states, magazines,
   clothing pose joints, animated operators, decals, glass-shatter targets,
   muzzle flashes and transient effects independently addressable.
4. Collisions, hit regions, map geometry, LOS and replay ownership continue
   to use authoritative tactical/animation data, never flattened visuals.
5. Keep reproducible procedural art, palette/camo, generated map seed,
   world transforms, lightmaps and authored AO. No loss of miniature detail.
6. Release all GPU resources on swap; do not dispose source geometry also
   referenced by shared box caches, other scenes or template instances.
7. Preserve camera-angle-sensitive transparency layering. No merging
   genuine translucent glass, fog or screen-space overlays.
8. No compile passes on live-frame/RAF hot paths. Lifecycle:
   generate/cache -> compile/warm -> instantiate -> render -> release.

## Rollout
- **E6.20 Foundation**: One shared rigid-owner compiler, exact material
  buckets, object-identity exclusions, archive/restore for source lifetime,
  metrics, reversible diagnostic flags. Demonstrate on known-exterior fixed window trim
  and door frames without touching their glass/door leaves.
- **E6.21 Static site models**: Compile wall and floor chunks per fog-
  disclosure boundary and camera-frustum cell; bake rigid architectural
  openings and fixed props. Measure seed 23/97 and wide/large/indoor maps.
- **E6.22 Appearance bake**: Fold floor/wall wear into precomputed texture
  atlases or consistent material groups with pixel-art nearest sampling.
  Keep cutaway fading, facade layering and individually damaged areas.
- **E6.23 Rigid inventory/arsenal**: Precompile recipe-variant receiver,
  stock, handguard, optic, magazine and equipment *subassemblies* with
  material, finish, mounting, light, detachable and reload state keys.
  Reuse between Arsenal, Operator Studio, deployed operators and drops.
- **E6.24 Operator rig compilation**: Compile only rigid pieces per bone,
  garment layer or independently toggled outfit category, preserve all
  pose states, authored contact AO, vertex mask spans, rig articulation,
  injury laterality and dynamic magazines.
- **E6.25 Effects/renderer/caches**: Pool/instance repetitive transient
  effects and dynamic overlays by render contract, reuse shaders/programs,
  introduce versioned artifact cache plus dedup of geometry/materials.
- **E6.26/E7 Reuse and removal**: Replace redundant bespoke batchers
  after equivalent behavior tests; finalize memory/retention policies and
  caches; cold-start/first-contact and steady-frame profiling on hardware.

## Benchmarks/gates
Baseline per seed/mode: main-pass and shadow draws (p95), transparent
role counts, GL program/material counts, geometries, GPU resident bytes,
time to first paint and first live frame, after-swap memory, RAF p95/worst,
operator-pose CPU. 90 frames per seed/mode for A/B + field visual parity
from isometric, bodycam, rooftop and revealed/unknown rooms. Check both
static and actively changing visibility, including multiple round resets.
Do not infer real mobile GPU/FPS gains from Chromium SwiftShader timing.

No blanket draw-call target is guaranteed; each migration must produce
measured savings that outweigh compile startup time and memory cost.
Aspirational aggregate 30–60% static-environment main-pass draw reduction
only if evidence supports it, not a verified prediction.

## Verified first production checkpoint, E6.20–E6.21
- Both compiler stages are on by default; `?e620Bake=0&e621Bake=0`
  disables both without rebuilding the release. The controls are independent
  for binary-searching regressions by family.
- Real browser (software GL) seeded A/B: E6.20 alone saves 90/80
  p95 main draws, E6.21 adds 68/90, total 158/170 from 1083/1233.
- Fixed captures on two seeds show 99.979%/99.988% pixel agreement
  in E6.21 incremental A/B and no JS errors. This checks one executing
  view per seed, not every camera/cutaway arrangement.
- No real iOS hardware FPS improvement claimed; monitor cold build and
  site-swap memory as the renderer expands into other asset families.
