# Fieldwork Breach — Performance Sweep P1
_Audit date: 2026-11-04. Feature branch: `perf/breach-sweep-p1-20261104`._

## Objective
Address phone frame drops, short hitches, and prolonged chugging both inside and outside combat, especially while executing orders. Preserve deterministic 60 Hz tactical authority, collision and door behavior, authored order routes, fog disclosure, replay accuracy, and the recognizable operator presentation.

This is a code-path audit and initial targeted optimization, **not a device-measured iPhone performance claim**. Compare against the same seed/build/device using `?perf=1` and the offline CPU benchmark before making FPS claims.

## Execution anatomy
- `breach-main.ts:tick`: fixed-step simulation at 60 Hz, bounded to three steps per drawn frame; replay capture on each simulation step; 3D scene update; 2D projected order overlay; tactical feedback; DOM HUD roughly 8 Hz by default. At high CPU cost the bounded clock can cause perceived slowdown rather than discarding authoritative movement/combat events.
- `breach-game.ts:stepSession`: doors and actors, awareness, route repair/collision reconciliation, contact/communication, intel observation and acquisition, shooting, mission logic, execution transitions. Extensive per-actor geometry work can spike around movement and newly observed geometry.
- `breach-game.ts:observe`: every 0.14 sim-seconds, each living friendly sweeps 20-unit and 10-unit terrain grids out to 240 units and checks LOS against walls/doors/cover. Grid scans are especially costly on furnished/expanded maps.
- `breach-intel.ts:observeIntel`: sight checks of walls, doors, cover and rooms whenever intelligence updates. Already-discovered walls/cover/rooms are monotonic; doors are live state.
- `breach-3d.ts:update`: per-render cover transforms, physical doors/window visibility, room/prop fog visibility, dynamic wall opacity, actor pose/foot IK and shadow placement, casings/shot effects/decals, fog mask repaint/upload, WebGL renderer. Rendering cost is a separate category from JS frame time; renderer draw calls and triangle counts are not GPU milliseconds.
- `breach-replay.ts:MissionRecorder`: records motion at each fixed tick and snapshots outcome state at about 20 Hz, including actors, door/window and cover arrays, fog history and intel.

## Changes in P1

| Area | Modification | Preserved |
| --- | --- | --- |
| Fine fog memory scan | Cheap squared-distance and precomputed directional-cone guard replaces repeated `hypot` / `atan2` for each grid cell | Same 240-unit / 1.15 rad candidate cone and same final LOS checks |
| Intel revelation | Stop sight-probing walls, cover, rooms that are already permanently known | Door sight and door-open memory continue to update dynamically |
| Replay snapshots | Reuse unchanged `windows` and `coverState` before allocation instead of cloning then discarding | Snapshot contents and objectRevision invalidation |
| 3D fog rendering | Balanced / Performance repaint and texture upload at up to ~10 Hz; Quality retains previous ~18 Hz cadence | Exact simulation intel, live detection, fog geometry and memory resolution |
| Per-door scene update | Find selected actor/endpoint once per scene update instead of repeatedly allocating planned endpoint arrays | Door availability indication |
| Contact shadows | Reuse temporary Vector3 instead of allocating two per visible actor every frame | Shoe world-space contact/shadow tracking |
| Operator colors | Reuse standing skin-color baseline and downed tint material | Wardrobe skin tone changes, reversible downed coloration |
| Full HUD | Reconcile full execution HUD about 5.5 times/sec instead of ~8.3 times/sec; immediate command updates unchanged | Order feedback and authored controls |
| Instrumentation | Recompute diagnostic percentiles on display refresh, not every requestAnimationFrame | Overlay observations; lower sampling distortion |

## Still-suspected hotspots (not yet rank-ordered by measured cost)
1. **3D GPU raster and shadow maps.** High draw-call, shadow-casting, transparent-fog and operator mesh complexity. Audit draw calls, fragment load, shadow updates and geometry instancing. Do not silently lower visual quality or change iconic silhouettes.
2. **Navigation and movement recovery.** Each actor's route motor can call swept body/profile collision, door tests, corner gliding, repair A*, and cooperation checks. Profile scene-density and blocked-door spikes. Cache only world-revision-safe geometry, never stale routes or ownership.
3. **Per-frame full rig posing.** `poseOperator` runs for visible actors and touches many materials, accessory maps and IK limbs; investigate dirty flags for *identity* (wardrobe/gear), leaving movement and animation at frame rate.
4. **Fog mask CPU/GPU cost.** Procedural polygon recomputation, blurred whole-map canvas passes and CanvasTexture upload when actors advance. Consider visible-region dirty bounds or tile caches, validating sliver/door/room concealment.
5. **Plan overlay/HUD.** Projecting every route node and recomputing per-actor plan semantics each draw; consider per-authoring revision cached route visuals and camera-specific projections.
6. **Transient combat effects.** Already bounded/instanced casings and decals, but physical impact mesh effects and audio can still create bursts of short-lived work.
7. **Replay and memory scaling.** Replay frame snapshots are large for dense sites. Analyze multi-minute heap pressure and GC stalls; consider incremental storage only with deterministic playback equivalence tests.

## Focused validation
- Workflow `simulation-performance.yml`: deterministic Node simulation probes for seeds 3, 17, 61 (standard), seed 17 (expanded), with/without recording; geometry scans; synthetic sustained combat. Records p50/p95/worst JS tick and per-phase hot spots. **Host CPU times are not phone FPS or GPU timings.**
- Added `breach-ground-view-performance.test.mjs` compares fast FOV selection to atan2/hypot reference across headings, radii, and angles; checks outer-radius and rear-hemisphere exclusions.
- Added `breach-intel-discovery-performance.test.mjs` checks no rediscovery LOS after monotonic knowledge, and verifies known doors continue updating opening memory.
- Existing workflow should also run key movement, shooting, effects, and rendering contracts, typecheck and Vite bundle.

## Device acceptance protocol
Use identical map seed, mode, lighting, team size and camera zoom. Load `breach.html?perf=1` to see JS P50/P95/MAX, RAF gap P50/P95, SIM, SCENE, OVERLAY, calls and triangles. Make sure not to confuse JavaScript frame-duration measurements with device GPU frame time.

1. **Idle paused baseline:** rotate, zoom and sit stationary 30 seconds; ensures scene renderer isn't saturating by itself.
2. **Long uninterrupted movement:** four operators through two or three open rooms and one narrow doorway. Record per-phase spikes and RAF cadence.
3. **Intel reveal:** enter unexplored dense area in exterior-known or true-blind; use a slow rotating selected operator. Watch for reveal texture and geometry spikes.
4. **Crowded doorway:** overlapping orders and automatic push/yield; identify movement-repair CPU bursts without altering collision semantics.
5. **Sustained contact:** several enemies shooting with smoke/flash/casings, and repeated fast reload/entry events.
6. **Expanded site:** repeat movement and combat after exploring most rooms, exposing geometry/prop scaling.
7. **Replay:** watch and scrub a multi-minute recording; look for heap growth and repeated asset reallocation.

For diagnosis, compare `?quality=performance&perf=1` with default `?perf=1` on the same device. A large frame-time improvement at low pixel ratio/shadow resolution suggests GPU bandwidth/shadows, not necessarily pathfinding. A large `SIM` spike suggests the CPU tactical core; large `SCENE` cost suggests JS scene updates + WebGL submission, though it is not a GPU timer. Log device, OS, browser, map seed, mode, observed P95 RAF gaps, JS P95 and draw calls.

## Release discipline
Keep P1 on its feature branch until focused CI and device smoke evidence are acceptable. Do not merge a performance patch into a crowded deployment queue or imply the production site changed. Next release checkpoint should integrate after the previous GitHub Pages deployment is confirmed healthy.
