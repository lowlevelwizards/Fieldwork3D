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

## Completion evidence — Q5

All metrics below come from the same actual 60-Hz game motor in GitHub Actions. These are simulated seconds, NOT a measurement of iPhone rendering performance. Mobile frame histories remain separately opt-in.

| Case cohort | Cases | Required physical outcome | Result |
| --- | ---: | --- | --- |
| Straight, Left, Right, Split, 45° × four inward/outward hinge variants | 20 | Four full-body crossings, all authored orders done | 20/20 |
| Same approaches × independent four-MOVE plans | 20 | Four full-body crossings and separated final positions | 20/20 |
| Ajar, pushed-wide, near-frame furniture × five approaches | 15 | Four full-body crossings, all orders done | 15/15 |
| Locked and wedged × five approaches | 10 | No forced locked/wedged crossing | 10/10 |
| Cabinet occupying real hinged leaf sweep × five approaches | 5 | Blocked physical opening, no forced full-squad clearance | 5/5 |
| **Total expectations** | **70** | **55 successful traversals and 15 correct obstruction negatives** | **70/70** |

The intentionally obstructed cabinet stops the hinged door at approximately 0.387 of its opening; the physical collision report confirms its swing is blocked and the aperture fails full-radius door clearance. One scenario permits a narrow legal single-person crossing but cannot complete the four-person entry. This is correctly an expected obstruction, NOT a successful full-squad passage.

### Baseline and measured Q5 travel-aware stack improvement

| Timing, simulated seconds (lower better) | Initial 20-case baseline | Q5 optimized |
| --- | ---: | ---: |
| Four-person completion rate | 100% | 100% |
| Fourth-crossing median | 10.18 | 10.42 |
| Fourth-crossing p90 | 15.53 | 14.42 |
| Fourth-crossing worst | 17.73 | 15.88 |
| All-orders completion worst | 20.35 | 18.48 |

The middle case is slightly slower, but the long tail improved. CI now pins fourth-crossing p90 at no more than 14.5 seconds, slowest fourth crossing at no more than 16.0 seconds, and worst full completion at no more than 19.5 seconds. Any case failing full-body clearance, settlement separation or successful planned execution fails the actual traversable-case gate.

### Root causes corrected

1. Wide-open leaf already occupied an otherwise valid closed-door stack goal. Current leaf occupancy filtering now excludes those pockets.
2. A partly opened door could be body-pushed farther while the team forms, causing the swept leaf to enter a planned stack position. Pre-opened door planning now checks the full physically possible pushed-open arc and adds fixed legal outside candidates.
3. The Door Lab's independent final MOVE goals were separated by less than two full operator radii. New distinct end stations eliminate sustained overlap.
4. Rigid team-index stack assignment caused needless crossover traffic. A small stable role bias now competes with known-route physical approach distance. No plan authoring, solid collision or real hinge force is bypassed.
5. Genuine fixture obstruction is reported as an expected physical jam only when the door cannot physically finish opening and the aperture is not passable; it is never counted as a successful four-operator traversal.

### Door Lab and release gate

The Door Lab has five selectable approach footprints, real four-operator live behavior, per-case fourth crossing and convoy span, and both opt-in 20-case and full 70-case batch controls with cancellation and copyable reports. The core validation includes real R7 squad execution, D0-D6 and Q0-Q4 physical regression, build, renderer and simulation performance checks. A public iPhone FPS value is not inferred from Node timing.
