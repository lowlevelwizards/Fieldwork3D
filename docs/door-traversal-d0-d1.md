# D0 — Physical Door Baseline / D1 — Persistent Crossing Episode
Branch: `feature/door-traversal-d0-d1-20261112`.

## Immutable invariants
1. Door leaf remains fully solid; hinge, push, and swing obstruction still use the real session motor. No character teleport, collision-radius change, or automatic door penetration.
2. Explicit individual authored MOVE, LOOK/WATCH, WAIT and door orders remain authoritative.
3. Session world context is supplied to entry-gate clearance; the global active lab cannot substitute another mission's walls/cover.
4. A D1 episode is a small persistent **execution record** keyed to the active authored order ID, door ID and original destination. It cannot edit PlanNode[], insert waypoints, move the hinge, invent a hold interaction or move an operator.
5. The episode is entered only near a *real* crossing. Inactive actors and movement on the same side create no episode. An explicit cancel/order change terminates it.
6. Expensive new geometry decisions belong in D2. D1's tick updater makes no A* requests, performs no swept-body clearance and has a bounded proximity probe.

## Reproducible map
The `door-test-range.html` laboratory uses the real `newSession`, `stepSession`, `planSquadEntry` and physically simulated hinge. The cases are defined once in `src/breach-door-test-cases.ts`; the Node baseline consumes the same site geometry.

Cases: both hinge ends × both swing directions, partially open outward leaf, pushed-wide leaf, furniture in the swing, near-frame furniture, locked and wedged doors.

## D0 measurements and acceptance
`scripts/audit-door-traversal-baseline.mjs [count] [ticks]` reports plans accepted, operators crossed and finished, door open/close toggles, physical obstruction, blocked time, nonfinite positions, and plan integrity. Noncompletion is NOT considered a passing four-person entry. Static blocks should remain blocked and explicitly reported. Historical R7 generated 11-site corpus recorded 4/22 four-person completions in its 15-second observation window; this is diagnostic, not a timeless benchmark.

## Release
Per-stage commits on the feature branch. Small critical regression gate on push, production build checkpoint; do not merge or deploy while another Pages release is running. Verify public Pages stamped build after any eventual merge.
