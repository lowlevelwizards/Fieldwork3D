# Performance P1.9 — Cold actor baking and simulation burst isolation

## iPhone evidence, 2026-11-12

Test 1 (different map from test 2):
- 60s recording: 616 live RAF callbacks, 25 intervals >=67ms, worst live 575ms.
- Four live gaps (575/540/490/483ms) show 468–554ms of preceding **authoritative simulation**. Scene update on those preceding callbacks is around 6–16ms and is **not** the dominant cost.
- Paused/idle: worst 911ms, with 878ms of preceding JS and 0ms simulation; preceding 3D actor phase 557ms.
- Test 2 screenshot: worst idle RAF 1236ms, previous JS 1196ms, previous 3D actors 785ms, scene update 1182ms.
- These are different maps; do not compare their maxima as before/after performance or assume a single cold-path trigger.

## Targeted change

### Cold 3D shadow atlas bake

The head/collar shadow atlas generator is invoked for previously unseen wardrobe/headwear silhouettes inside the actor-presentation path. Its former inner loop allocated a fresh vector per texel and performed repeated general-purpose vector axis lookups in ray/box slabs. At 6 faces x 64² texels x 3 rays, this can create first-use main-thread CPU spikes.

- Keep 64x64 face resolution, 3 normalized studio rays, reach, EPS, eyebrow band, contact falloff, palette, cached materials and every output byte intact.
- Flatten immutable caster boxes once per bake; use numeric slab checks in the tight atlas sampling loop.
- Zero-box atlases return the same unoccluded brightness without ray work.
- A deterministic test independently reproduces the old Vec3 slab bake for each atlas pixel and demands byte-for-byte equality.

This is a targeted *candidate* optimization for one part of cold actor appearance, not proof that all 500–1200ms rig spikes were shadow atlas baking.

### Remaining measured sources

- Break down the existing measured 3D actor phase into **rig build time / count** and **pose work / count**. These measurements remain behind `?perf=1`.
- Preserve and report the **preceding** hot simulation phase on severe RAF intervals. The old `HOT SIM` line was for the *current* callback and not aligned with the RAF stall.
- COPY stays concise; TXT gains numeric per-bucket preceding rig, pose, and simulation-phase fields.
- No game AI, pathfinding, scheduling, authoritative sight, simulation steps, fog, shadow quality, dynamic lighting, or replay semantics are changed.

## Follow-up validation on the same device

Use the same map/seed for a baseline-vs-update comparison. Do 20–30s execution and 20–30s paused, then paste COPY. If live spikes still show 500ms simulation, **prior SIM phase** names the hot system to optimize next. If a paused spike still reports hundreds of milliseconds in 3D actors, the new **rig** vs **pose** split tells us whether first-use construction or ongoing pose/appearance is responsible. Ignore a single different-map maximum as evidence of improvement.
