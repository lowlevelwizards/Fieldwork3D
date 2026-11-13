# D5 — General motor-path cleanup and repeatability gate

## Objective and complete scope
D5 is the broad motor hot-path consolidation following D0–D4. It does not create another door controller or a speculative pathfinder. The original authored MOVE, LOOK/WATCH, WAIT, KICK, CLOSE, HOLD, equipment and stop-on-contact semantics remain intact. Normal collision, hinged door sweeps, and dynamic bodies remain the sole physical truth.

### D5.1 Deterministic candidate selection
- Replace per-motor-step closed-door filter/sort and auto-door sorted candidates with exact one-pass nearest selection.
- Preserve original stable-order tie for closed-door conflict and door-ID tie for automatic door selection.
- Convert the near-body auto-contact helper to stable single-pass selection, with original reach, approach, and physical shoulder-envelope predicates.
- Maintain the explicit DOOR-action priority for target KICK/CLOSE/HOLD while allowing safe automatic opening of an intervening unrelated door.

### D5.2 Contact-only dynamic occupancy
- Accept a deferred actor-position producer in the existing body/hinge pressure solver, without changing array-based callers.
- Evaluate live actor positions only once a real, legal leaf contact is chosen and one per-tick claim is granted.
- No actor positions are cached between frames or shared across actor movement. The hinge and obstacle swept tests still use current live state.
- Normal failed-route motor probes and ordinary collision probes skip allocating arrays when they do not touch a leaf.

### D5.3 Lazy arbitration and unified actor scan
- Keep the existing D3 one-contact-per-door-per-tick claim table, but construct it only when an actual near-leaf policy method is invoked, not when an ordinary moving actor starts its stride.
- Preserve per-door lazy crossing inspection, exact physical collision, and authored CLOSE deferral.
- Merge the hostile blocker search and friendly steering snapshots into a single live roster pass, and avoid collecting unused friendly positions when approaching a narrow aperture.

### D5.4 Acceptance and performance
- Deterministic randomized oracle compares new nearest auto-contact selection to the prior filter/sort, including reordered near-identical doors and authored door-method priority.
- Probe actual hinge-contact callback count: zero when no leaf is touched, one on real contact.
- Preserve D3 claim/tick semantics, D4 hand-contact and replay tests, D2–D3 all four 60 Hz four-operator hinge fixtures, Release 7 authored order and queue tests, and locked/wedged solidity.
- Production TypeScript and Vite build must pass.
- Door Test Range still provides reproducible live-session state; structural allocation savings are not represented as measured iPhone frame-time gains.

## Architecture and non-goals
This is a lean behavior-preserving pass, not a second navigation system, no teleportation, no shrinking collision radii, no forced hinge overrides and no new runtime polling or per-frame search. It consolidates the repeated work around the existing physical motor rather than changing movement doctrine. D6 remains real-phone frame-time instrumentation and broad generated-building acceptance.

## Release strategy
Stage commits on `feature/door-traversal-d5-motor-cleanup-20261112`. Focused D5 gate before release. D4 Pages must first report success and serve its exact public build stamp. Keep D5 off `main` until a separate release checkpoint and all critical acceptance is green.
