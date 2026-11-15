# D3.9C — 35-second progress-led reliability, forensic scope and priorities

Date: November 14, 2026. Feature: `feature/d3-9-clean-single-opener-20261114`. Status: **C0 evidence / C1 attribution completed; gameplay correction roadmap scoped, NOT yet implemented or deployed**. This document is the acceptance design for C.

## Design goal
A 25-second physical arrival requirement is not an appropriate binary gate on generated maps containing multiple doors and long routes. Keep the old 25-second deterministic check as a frozen historical comparison, but make a **35-second real-world fixed-step (2100 × 60 Hz) progress/obstruction survey** the primary debugging evidence. A still-moving operator who has a defensible route, a valid GO-time wait, or an authored action is not automatically a failure.

Classify each five-second interval as: progressing toward goal; making a genuine geographical detour; valid authored WAIT; passage/hinge opening hold; physical obstruction; repeated local motion with poor net displacement; sustained stillness; or planned-order completion. Require at least two consecutive poor windows to declare movement-loop or sustained-still evidence, and corroborate with actual current waypoint/collision geometry. All measurement stays offline; never add 5-second scans, route probes or debug allocations to the production 60 Hz motor.

## Verified 35-second result
Workflow: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43636435123

22 real modes (11 generated buildings × authored MOVE or 4-operator ENTRY), 88 operators, no civilians/enemies, 2100 fixed ticks.

- Physical arrivals **66/88** vs 25-second **62/88**
- Four-operator physically complete **14/22** vs 25-second **12/22**
- Logical four complete **15/22**, physical incomplete **22**
- Total stall episodes **11**, retries **38**, passage wait **8.51s** over all sampled operators
- 35-second extra cumulative door flips **80** (longer observation, not comparable to 25-second 76 as a regression)
- **0** invalid positions / physics motion step violations / corrupted plans
- 372 recorded five-second operator windows; 24 suspicious windows, **concentrated** in specific actor/mode/seed pairs, not 24 independent deadlocks.

Confirmed suspicious cases:
1. **31149 motel ENTRY Ash and Vale**: 120–129 units of physical travel per five seconds, 1–5 units net. Over 8–22 seconds, their nav consistently points at `(312,504)` and `(312,560)` while actor positions remain around `(280–283,498)` and `(280–283,566)`, respectively. Actual short full-capsule probe classifies `furniture` obstruction, not D11/FRONT hinge contact. This is a **true recurrent contact/correction loop** with blockedTime near zero. 35-second microtrace: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43636719666.
2. **31045 house ENTRY Ash**: stationary for successive 5-second windows at `(362.99,522.39)`, blocked 5.0s/window, repeated route attempts, but goal only **7.79** units away at 25 seconds. This is **near-goal settlement/recovery**, not a multiroom route failure.
3. **31084 retail ENTRY Rook**: stationary at `(331.98,335.49)` with blocked 5.0s/window; historically physically arrived at 25s (~15.36 units), but authored step still tries to settle more precisely. Needs entrance-side and safe-rest evidence before any completion tolerance adjustment.
4. **31149 motel authored Ash**: still at `(585.60,248.91)` for 15+ seconds, remaining 33.71, repeated retries but blockedTime zero. Test endpoint accessibility and nav/route backoff; do not assume a door problem.
5. **31162 utility authored Rook**: one five-second interval with high squeeze and motion loop; did not remain flagged on subsequent windows. Watch, do not add a generic timer.
6. **31110 garage ENTRY**: all four operators have 1,450–1,515 units of physical travel in 35 seconds but still 98–161 units from goals. Not captured by tight five-second return-to-origin loop detector. Requires longer-horizon route efficiency assessment, while permitting real multiroom detours.

## Exact A3-versus-B4 25-second regression attribution
Workflow: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43636531063. Frozen prior A3 `059faf94` vs B4 `b656cab2`, same map seeds and 1500 fixed steps. Full details saved in runner artifact.

- 55/88 -> 62/88 physically arrived; 9/22 -> 12/22 full squads, no lost prior operator arrivals.
- 69 -> 76 door state flips: **seven separate door IDs** each added **one** opening, all on scenarios with increased physical traversal (`31058` D1/D3/D7, `31084` D2, `31110` authored D1 + entry PROPERTY-GATE, `31175` authored D3). **Not hinge ping-pong**.
- 24 -> 27 retries: +3 `31045/entry/ash`, +1 `31162/entry/rook`, -1 `31084/entry/rook`; other operators unchanged in retry counts.
- Locked-door cancellation events **identical before/after**. Seven inactive but physically distant operators in 25s originated from **intentional locked-door cancellation** rather than silent missing GO motion. Keep these out of the moving/stalled denominator; show blocked by locked door explicitly.
- 25s exact truth parity and all B critical CI green. Earlier advisory Node sim p95 slight increase does not demonstrate mobile runtime improvement or regression.

## Ranked C roadmap (impact × grounded likelihood × safety)
**C1 — P0, high likelihood:** Resolve motel 31149 ENTRY's repeated furniture contact. First attribute the physical recovery branch: attempted step, cover overlap and contact, actual move, nav, collision classification, and any return-to-origin. Consolidate the resolution so a repeated legal-looking corner step with no meaningful waypoint progress cannot silently reset the blocked/recovery clock indefinitely. Use one bounded world-truth path repair on true sustained failure, not continuous A*; preserve real full-size body sweeps, authored destinations and pass-through behavior. Do NOT change unrelated door/queue control. Gate: both Ash/Vale make sustained route progress or receive explicit, evidenced unreachability, no repeat 10+ second 120-units/5s loops.
**C2 — P0, high likelihood:** Fix near-goal entry target settling for house Ash and retail Rook. Confirm the chosen physical footprint, entry-side clearance, and collision reason. Prefer a legal short settling position within ordinary tolerance or correctly classified legitimate obstruction. Never fake arrival, pass through furniture, or stop before the actual door threshold. Gate: no 20+ seconds of blocked reattempts within 8–16 units of a safe endpoint.
**C3 — P1, medium–high:** Diagnose motel authored Ash's repeated empty-route retries/short endpoint reach. Separate truly inaccessible destination, locked-door order cancellation, and possible missed local connector. Reuse existing route recovery only on measured failure; do not loop A*.
**C4 — P1, medium:** Add a 10–15-second *goalward progress / route efficiency* witness for garage 31110 ENTRY, distinct from five-second displacement. Do not classify legitimate long detours as stalls based solely on distance-to-goal; compare to verified route length and actual passage gates.
**C5 — P1, high:** Publish explicit terminal statuses: arrived, still moving, stable detour, legitimate hold, physically blocked, looping, stopped due to locked door. Separate plan completion/cancellation from arrival. Show concise operator/door/geometry evidence, not an alarming aggregate pass/fail percentage.
**C6 — P2, medium:** Profile local swept geometry, especially wall gliding scanning `world.walls`, incidental pressure object creation and 24-candidate cold opening steps; optimize only when measured in actual capture. Preserve deterministic tie order and exact collision. No claim of iPhone/RAF benefit from Node CPU timing alone.

## C release gates
- Primary: 35s progress + stall/loop audit, not universal arrival. Target zero unacknowledged continuous >10s loops, zero physically stationary active orders >10s without reason, no 5s sustained blocked retries repeatedly without an actionable status.
- Preserve warehouse `31123` 4/4 in authored and squad ENTRY, townhouse `31058` 4/4 authored (25s regression gate).
- 0 invalid positions, ghost movement, physics-step violations or corrupted authored plans, no per-hinge ping-pong, no reach-invalid grip. Locked and wedged doors remain solid and transparent cancellations remain visible.
- Keep the 25s 11-seed corpus for *comparability*; interpret its arrival count as advisory, not pass/fail for a long route.
- Run focused critical suites per staged commit, run complete 35s + 25s + required build at release checkpoint; monitor door collision CPU and real mobile RAF separately.
- Keep PR draft and no merge/deploy until corrected traces, physically consistent full corpus, CI success and production release coordination.
