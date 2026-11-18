# EQA1 — terminal drag MOVE full-body and visible closed-door clearance

**Scope:** one targeted encounter-quality fix, staged on `feature/eqa1-unlocked-front-door-contact-20261118`; no AI, world-generation, mission-rule, physical motor, lock, door-opening, camera, save, or fog changes.

## Root cause, measured directly

A legal finger-drag from the exterior to a point immediately beside the FRONT doorway was accepted because `planMoveStroke` checked `SQUEEZE_RADIUS` along the stroke and the terminal waypoint but not the operator-sized landing against the door leaf.

For seeds **20 / Capture** and **26 / Clear**, the opponent simulation, route authoring and actual physical world are authentic. The player-selected final MOVE points are on the **same physical side** of the FRONT door as their respective operators, so `crossesDoorThreshold` is correctly **false**; the door must **not** be automatically opened merely to let an actor travel parallel to it. `intelPassable` checks only walls and props, not door leaves. The motor collision correctly rejects the final ~0.2–2.3 units of sideways movement within the leaf's 9-unit capsule. Repeated route repairs do not repair an authored GO.

| Frozen EQA0 / main seed | Baseline FRONT blocked frames (12 seconds, 30Hz) | After known-frame final-landing fix |
| --- | ---: | ---: |
| 20 / Capture, Moss | 319 | **0** |
| 26 / Clear, Rook | 320 | **0** |

Baseline evidence: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44412849073. After-fix physical reproductions and focused tests: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44413381241 (**SUCCESS**, 17 existing plus 6 drag and seeded tests, TypeScript). Both before/after runs use the same source-derived generated map and objective, with the same scripted Floor Plan gesture. Neither asserts that this one gesture is a good tactical plan or a full mission.

## Minimal authoritative correction

Reuse the never-merged D3.23A code pattern from [#1716](https://github.com/lowlevelwizards/Fieldwork3D/pull/1716): allow intermediate narrow movement but require the **last** MOVE endpoint to pass full `OPERATOR_RADIUS` known wall/cover clearance. Add one missing, **player-knowledge-only** test: if a door frame is known and its recorded opening fraction is below .72, the last MOVE point must be at least `OPERATOR_RADIUS + 1` from its physical frame.

The known-closed frame uses the door's fixed known `a,b` architectural segment, not the live dynamic leaf angle or private updated door state. No hidden-world information is read to decide whether an endpoint is accepted; the existing real motor still owns all live final-body collision and door operations. If the last point is too narrow, retreat a maximum of 13 world units in 0.75-unit increments **along the last finger-drawn segment**, testing the same known-only route. If none works, reject the stroke atomically with a clear notice. Intermediate squeezed route points, door/window traversal, HERE/WATCH, UNDO and REDO remain untouched.

**Never fix this by extending auto-OPEN to mere near-panel travel.** Explicit DOOR, opening permissions, locks/jams and physical hinge conditions are completely unchanged.

## Targeted verification

- 17 existing physical lock / interrupted door / squad retry tests pass.
- 4 retained D3.23 wall drag, WATCH/UNDO, hidden-wall and atomic-rejection tests pass.
- 2 exact generated seed regressions verify final known full-body and closed-panel clearance and reject any sustained FRONT motor blocking (the previous weak test missed a 0.19-unit final intrusion; the current test validates real door-frame clearance).
- 12-second seeded motor repro now records **zero** FRONT blocked frames for each previously frozen offender.
- Additional cross-mission G4D 40-trial comparison, several legacy pointer/route tests and production build are queued in the next release-readiness workflow (do not claim passed until exact job completes).

## Scope exclusions / limitations

This fixes one demonstrated player-authoring quality defect, **not** the whole encounter-quality backlog. Prepared objective guard gaps (Retail14 HOLD, Warehouse17 INTEL/RESCUE), world cover variety, civilian communication and a complete default Unknown-objective human playthrough still require separate targeted validation. No production deployment is authorized by this branch; keep it isolated until all critical checks are green and a release is explicitly approved.
