# E6.7 — measured cold operator rig construction and disposable geometry removal

**Base:** latest deployed main `b2706847eaef1f4a6a67bc600a02c49c5ff892d7`.
**Branch:** `refactor/e6-7-cold-rig-geometry-20261116`.

## Directly observed evidence

The actual E6.6 mobile-emulated Chromium/ANGLE SwiftShader 390×844 Quick Play captures (23/97) were downloaded and inspected. On the cold 3D scene update:
- Seed 23: 4,366.4ms RAF gap, preceding JS 4,275.4ms; **scene gpuSubmit CPU 3,262.8ms**, actor phase 986.3ms, **5 rig builds 914.8ms**, pose 36.5ms, pose prep 4.9ms.
- Seed 97: 3,816.6ms RAF gap, preceding JS 3,751.3ms; **scene gpuSubmit CPU 2,826.7ms**, actor phase 900.9ms, **5 rig builds 835.2ms**, pose 34.0ms, pose prep 4.7ms.
- These are software GPU/browser startup measurements, **not native GPU timing, mobile Safari FPS or thermal readings**. This evidence rules out treating per-frame pose fingerprint or fog as the primary *cold-start* cost. It also does not prove any specific substep of rig creation dominates.

## Targeted safe code change

The `bone()` constructor in `breach-operator-rig.ts` previously called `block()` to create a garment-UV mapped BoxGeometry, then immediately discarded that entire geometry in favor of the newly generated final **full / bloused / cuffed** segment geometries. Remove only that provably unused intermediate box and its UV unfolding/disposal, directly constructing the same mesh from `shapes.full`, attaching to the same parent with identical shadow flags and default zero position. **Do not share the editable segment geometries across rig owners**: each operator remains separately editable/disposable and supports the exact existing Studio and replay poses. This does not change the weapon, side, accessories, FOW, LOS, raycast, controller, or render cadence.

## Paired measurement and acceptance

- Run an identical deterministic Node script on pinned deployed main and this branch, each building 5 real rig objects in 3 rounds with a pose after each round. SHA-256 every initial rig mesh geometry attribute (including vertex position, UV, normals, skin) and index and require exact parity across builds. Validate 30-slot pose output. Record per-round and total cold construction CPU. CPU times are observational; CI never asserts faster wall times.
- Run focused geometry/animation test and existing critical architecture, pose, fog, first-contact, replay and full typecheck/build.
- Run existing actual two-seed real-browser tactical planning/execution JSON capture as smoke, with zero shader errors. Compare observed cold samples to E6.6 baselines cautiously; runner/load variance can dominate.
- Do not claim the small geometry change resolves the **dominant** 2.8–3.3s software renderer-submit startup; GPU-side shader/program compilation attribution requires a separate shader/program instrumentation and device comparison.
- Do not merge while prior production deployment is queued or running. After a green final head, merge the batch once, then verify Pages success and served exact commit SHA.

**Next:** If the paired test shows only a small cost saving as expected, E6.8 should address the substantially larger initial shader/renderer submission work with startup program compilation and presentation readiness without degrading the approved lighting or first-contact protection.
