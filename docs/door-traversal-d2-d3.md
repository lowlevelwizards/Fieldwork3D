# D2–D3 — Physical Door Traversal / Repeatable Maneuvers

This is the first *active execution* batch built on D0 deterministic Door Test Range and D1 persistent `DoorTraversalEpisode`. The user-authored MOVE, LOOK/WATCH, WAIT, posture and explicit door orders remain the authority. Doors remain physically solid and hinges may be pushed wider.

## D2 / repeatable execution

- The real session motor invokes `tryRehearsedDoorManeuver` only after a failed full-radius physical stride near the identified actively crossed hinge, and only when the hinge has stopped materially rotating.
- Four fixed-order choices rather than repeated heuristic pathfinding: direct portal, return to same-side approach staging when required, and three increasingly broad free-tip/shoulder maneuvers.
- Every segment is checked against **current session** world and leaf with the normal `OPERATOR_RADIUS` swept clearance. Nothing is teleported, no obstacle is omitted, and no collision capsule becomes smaller.
- Save the chosen path on the existing crossing episode; while its waypoints are active and progress is being made, unrelated generic route recovery cannot keep overwriting them. When complete, normal motor reacquires the original authored goal.
- One full-body-checked same-side approach recovery is allowed if an operator drifts over 110 map units from its still-active doorway. It does not select a new tactical target, change heading intentionally or undo WATCH.
- At most four selections per crossing across *material* hinge-angle changes, with a retry cooldown. Tiny moving-angle updates and ordinary fixed ticks are not triggers.
- Actual mechanical contact records `push-through` or a reachable `grab-and-hold` contact event; no remote hand force. The contact flag resets without a new touch. **Continuous support-hand IK / sustained grip visuals are D4**, not silently claimed here.

## D3 / physical traffic arbitration

- On the first actual contact for a door in a fixed simulation tick, lazily snapshot active crossing claims **for that door only**. Other doors do not scan actors.
- Cache those claims per session and tick; they are shared by the no-route contact probe, normal motor collision and explicit CLOSE deferral. Dynamic body positions and hinge clearance are never cached.
- Active crossing wins over incidental body-generated closing pressure from the same side. No active crossing means real closing contact remains lawful.
- At most **one body-generated pressure impulse / local hinge substep per door per fixed simulation tick**, preserving the existing authoritative global door phase and real wall/people sweeps. This is not a new full rigid-body solver.
- An explicit CLOSE order is **retained**, not discarded, until actual occupants/crossings clear. It can then complete. Locked, braced, wedged and furniture-obstructed leaves remain solid.
- Replaced temporary candidate array+sort with deterministic minimum-contact selection, and rejected distant leaf contacts before traffic-claim scans.

## Real acceptance / all four hinge cases

The 30-second `scripts/audit-door-traversal-baseline.mjs 4 1800` from the stabilization checkpoint reported the following (before lazy-claim optimization, which has identical physics semantics):

| Case | Crossed | Orders completed | Open/close state changes |
|---|---:|---:|---:|
| Inward left | 4/4 | 4/4 | 1 (initial opening) |
| Outward left | 4/4 | 4/4 | 1 (initial opening) |
| Inward right | 4/4 | 4/4 | 1 (initial opening) |
| Outward right | 4/4 | 4/4 | 1 (initial opening) |

`tests/door-traversal-d2d3-four-operator.test.mjs` hard-fails if one of these cases doesn't complete within 1800 fixed 60Hz ticks, if the leaf ping-pongs, if any authored plan IDs change, or if positions become nonfinite. Locked and wedged cases must NOT be penetrable.

The 10-case Door Test Range remains accessible at `door-test-range.html` after production deployment. Its copied report includes real actor movement, phases and chosen maneuvers.

## Performance contracts

- No full A* in the common traversal routine; only bounded preauthored maneuver sweeps after real physical blockage.
- Per episode maximum four selections with a timer and meaningful hinge change or true stall; no uncontrolled attempt loop.
- At most one crossing-claim actor scan **per touched door per fixed tick** and one incidental hinge contact substep in that tick.
- No per-contact door candidate sort or allocations for an array of every considered leaf.
- The existing physics sweep and world collision remain exact; do not weaken those checks to improve headline completions.

These are structural operation-count reductions; mobile frame-rate improvements still require live profiler comparisons, not unsupported claims.

## Release procedure

Commit D2, D3 and measured stabilization separately to `feature/door-traversal-d2-d3-20261112`. PR #1291 is the grouped release checkpoint. Require green real motor/physicality tests, TypeScript and Vite production build. Do not merge while any Pages deployment is active or failing, and verify the previous Pages build stamp before queuing a new one. After any merge, verify the new Pages build stamp and open the Door Test Range on real mobile hardware for tactile/animation acceptance.

## Not included yet

D4 sustained hand-to-panel IK/weapon support-hand release; D5 broader motor cleanup beyond this touched-door path; D6 cross-device profiling and all generated-building acceptance. Do not represent those as delivered by D2–D3.
