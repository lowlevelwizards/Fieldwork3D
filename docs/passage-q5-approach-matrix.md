# Q5 — four-operator entry reliability and time-to-clear benchmark

## Scope and execution order

Q5.0 — **reproducible geometry**: add Straight (baseline), Stack LEFT, Stack RIGHT, Split 2+2, 45° Diagonal. Each preset is physically spawned on the SAME entrance side of the same authored door; do not change hinge, door mode, wall collisions, AI, default map generation, or Q3–Q4 GO rank semantics.

Q5.1 — **full real-motor matrix**: 5 approaches × 4 hinged orientations (inward left/right, outward left/right), plus open/partly-open/fixture obstacles and negative locked/wedged gates. The baseline scenario is four coordinated operators with actual planSquadEntry; separate independent-MOVE checks. Run fixed 60-Hz deterministic steps, record plan acceptance, first and fourth full-body crossing, finish time, gap, no-penetration failures, stalled phases and events. Distinguish an expected blocked door from a failed traversable scenario. Test and benchmark use identical setup module and no mock movement engine.

Q5.2 — **diagnosis**: failure log is keyed by (door, approach, program), stores blockers and episode phases. Do not hide timeouts. Fix root causes in staging/coordinator/door motor without relaxing solid collision, inventing movement, or replacing authored directions.

Q5.3 — **performance**: for 100%-pass matrix compare medians, p90, worst crossing/finish times against pinned baseline; optimize readiness, follower movement and competent crossing while retaining real hinge and queue rules. Do not tune solely to one door or sacrifice accuracy to improve the time metric. Track first-to-fourth crossing separately from plan completion and travel-distance variance across different starts.

Q5.4 — **lab and CI**: interactive Door Range approach selector, visual spawn footprints, run matrix and copy results with red failure details; dedicated fast CI for all deterministic 5×4 real-game combinations and regression/negative gates. Mobile browser 60-second frame history stays separately opt-in and is NOT approximated by Node time. In CI ensure all supported traversable cases are successful before publishing green status; mark unsupported cases as unresolved rather than silently excluding them.

## Release criteria

- Every expected-to-pass scenario in the matrix finishes with all four bodies physically past the door, no collision bypass, all authored orders completed within the defined 30-second cap.
- A locked or wedged door never reports a successful traversal.
- Timing regression threshold is introduced only after an actual measured baseline: no speculative target or unverified 100% claim.
- Critical D0–D6, Q0–Q4, renderer, simulation performance and build checks green. Merge/release checkpoint only when latest Pages deployment is completed and serving the expected SHA.
