# D3.0 — Reliability baseline, regression quality and device acceptance

**Base:** main `bd492d2b0948f37a4b63b9e3f672051769022b7b` (H18, Pages workflow #43556178112 reported success). This release is deliberately *observational*: no new world/actor clocks, movement solver, visibility tests, or persistent render listeners.

## Existing authorities and findings

- The 60 Hz simulation and one motor remain the movement authority. D1 owns GO-time passage rank, live lane arbitration, swept full-radius movement and the current-order door-intent predicate.
- D2/D3 (door-traversal series) already bounds door-tip maneuvers and actual hinge pressure, with explicit CLOSE deferral. D6 exposes Door Test Range optional RAF/paint/simulation counters and in-game `?perf=1`. Do not replicate per-frame profiling or claim phone thermal/GPU improvements from Node numbers.
- The earlier **11 generated sites × 2 modes × 900 ticks** audit completed 3/22 four-person plans. The remaining 19 are *not proven deadlocks*: mission routes may exceed 15s, preflight and actual obstruction have different causes, and end-of-run pause alone cannot explain a run. Preserve that baseline as historical evidence, not a passing numerical target.

## D3.0 staged deliverables

1. Preserve real deterministic 11-site generated execution with the actual four-person motor, authored independent MOVEs and squad-entry template.
2. Add **read-only endpoint triage**: completed, unplanned, explicit order issue, deliberate hold, passage hold, physical block, moving and low net movement over the final <=3s. The label is a snapshot, *not* inferred root cause; distinguish a long active route from an actual stationary stop before changing mechanics.
3. Expose triage counts and per-operator recent displacement with the existing progress, retries, order issues, door flips, collision invariants and passage-wait time. No writeback to simulation.
4. Maintain **strict structural fail gates**: exceptions, nonfinite bodies, >50-world-unit fixed steps, >4 episode maneuvers, authored-plan corruption. Keep incomplete missions as diagnostic, not ignored.
5. CI: targeted status classifier tests; D1/Q2/Q4/real four-operator/door mechanics; generated-building bounded report; `npm run build`. Compare the same seed and runtime before/after optimizations, never interpret Node CPU timings as mobile FPS.

## Real device verification (cannot be done in GitHub CI)

- Use the same handset, low-power mode off, same site/seed, zoom, screen orientation and device temperature. Collect a 60s capture for planning/idle, four-man inward entry, outward-swing entry, counterflow and replay with `?perf=1`, plus Door Test Range optional diagnostics.
- Compare RAF worst, >=33/67ms spikes, main simulation slices, render/3D sync slices, queue event history and actual mission completion. Note background suspensions separately.
- Check generated fog, collision silhouettes and hand/weapon contact in 2D and isometric. Only mark handset acceptance complete after actual physical capture.

## D3.1 no-go boundaries

No new per-frame actor query, A*, broad collision exceptions, teleports, hidden move-order changes or additional hinge controller. The next stage may skip *irrelevant opposite-side ownership work* when the immutable GO schedule has no opposing-side lane; it must still evaluate live throat occupancy, collision, same-lane follower gaps and all active counterflow exactly.
