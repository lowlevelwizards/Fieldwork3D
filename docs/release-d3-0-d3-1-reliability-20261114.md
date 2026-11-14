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

## D3.1 staged implementation: cheaper authoritative door/queue work

- **D3.1.1 — Single-direction owner fast path.** Avoid calling `ownerFor` for a positive crossing stride when the immutable GO schedule contains no lane coming through the same door from the opposite side. This removes repeated readiness/owner scans in ordinary squad entry without changing the same-side rank, physical spacing, door plane or swept motor. A live opposite-direction body inside the throat is still detected by the separate dynamic occupant scan; schedules that do include counterflow retain the identical owner/lease path.
- **D3.1.2 — Zero array construction for automatic contact fallback.** The ordinary motor formerly allocated `automaticCandidates` on *every* attempted movement stride only to pass it to the nearest physical door-contact probe. Pass the existing door array and live order policy directly into the already ordered, physical contact scan. The fallback filters identically to `canAutoOpenEnRoute` and keeps lock, kick, CLOSE, HOLD, intervening leaf and target-priority behavior. Pure direct callers without an order policy keep their existing API.
- **D3.1.3 — Behavioral gate.** Add explicit ordered-body contact parity against the old filtered-list oracle across seeded door sets, direct KICK/CLOSE/HOLD and no-plan tests, and source-audited single-direction lane fast path. Run D1 owner/counterflow, Q2/Q4, real four-operator inward/outward, D5 contact, full generated-site data and production build.
- **D3.1.4 — Quality closeout.** Report generated-map completion counts and triage transparently; do not claim that an allocation-only release by itself fixes every 15-second noncompletion. Live-device FPS, responsiveness, fog and thermal acceptance still require user-run captures.

No new update-loop owner, timer, cache, collision relaxation or synthetic forward displacement is added.

### D3.1.3 — No-cache far-door motor broadphase
The no-route motor still tested every world door's rotated leaf on every attempted stride, despite the actor being many rooms away. Add a conservative frame-center rectangle test before that expensive leaf work and before the actual body-contact fallback. A hinged tip, fully translated sliding panel, and shutter lie within 1.5 frame widths of frame center; the Manhattan upper bound plus collision margin excludes only *provably far* leaves. Retain the exact real leaf, world, body and hinge narrowphase for every near candidate, and test thousands of deterministic rotations/translations for zero false rejects. No spatial cache invalidation, additional ray, clock or collision relaxation.
 
### D3.1 stability disposition — tested and rejected partial-leaf shortcut

The generated-building triage isolated four operators paused at `door-opening` at the 20s cutoff. A first experimental handoff let local contact return to the physical motor and produced one additional four-person plan completion, **but also 277 door open/close changes**, compared with the verified baseline of 58. A second variant required positive opening-side pressure, recovering the 58-change baseline, but restored the exact original gameplay with no completion gain. Neither was justifiable under the one-hinge-authority, no-bandaid policy. **Both experimental runtime modifications are reverted** from the final D3.1 implementation; keep the documented observation, explicit `door-opening-hold` triage, and the fixed-seed CI quality gate **<=90 door state changes** to catch recurrence. Further root-cause work must directly inspect the specific generated leaf angles and actor route geometry rather than permit generic contact/closing shortcuts.
