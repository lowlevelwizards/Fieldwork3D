# D3.13G2C — Bounded portal escape/rejoin release checkpoint

Date: 2026-11-15. This is the release candidate after **two unsuccessful G2 experiments** and a tested physically gated local-stage recovery. Previous D3.13E remote-reach attempts remain rejected/unmerged. Do not claim they were fixed by G2C.

## Behavior

A real full-body escape from an open hinged leaf may produce a repeatable error if the motor discards its old transient route and immediately reacquires the same stale known-map prefix. The operator can move back into the physical panel for dozens of iterations without reducing the authored-goal distance.

- The ordinary full-body swept motor, door hinge, collision, WATCH and authored PlanNode rules remain the only movement authority.
- A cold actor-bound transient `WeakMap` witness requires **three real escapes of the same door while pursuing the same MOVE**, near the same physical anchor; edits to the order/goal or changing the door invalidate it.
- After actually clearing the open leaf, the motor can replace its disposable route only with a physically validated connector to a nearby original route node, or a tiny two-leg fully swept stage around the current **open** leaf. A joined known-intel continuation must end at the **original authored destination**, and its first physical leg is swept. The normal motor still checks every subsequent step against actual doors and walls, including future closed portals.
- No teleport, remote hand force, unlocked door bypass, completion of short stage as a player GO, per-frame global A* or collision clearance relaxation. Failed probes preserve the old fallback; cold attempts are bounded. The stage cannot run before leaf release or without an active qualifying order.
- Source labels and rejection diagnostics are offline-only; no runtime observer is installed in production.

## Objective gates — all passed for candidate

### Historical frozen 11-site, 22 squad runs, 88 operator outcomes, 45s

| Measure | Existing main movement baseline | D3.13G2C |
|---|---:|---:|
| Physical arrivals | 79/88 | **80/88** |
| Fully physically arrived squads | 18/22 | **18/22** |
| Logical squad completions | 21/22 | **21/22** |
| Stall episodes | 9 | **8** |
| Recovery retries | 6 | **5** |
| Suspected movement loops | 0 | **0** |
| A* searches | 3,876 | **3,006** |
| Expanded nodes | 1,535,131 | **1,285,006** |
| Physics, positions or plan corruption | 0 | **0** |

[CI 45s run](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43682103555).

### Previous independent motel cases, 45s

- **Standard motel 2069994:** 3/4 → **4/4** authored operator arrivals; Rook's remaining distance **536.13 → 4.31**, and its repeated door-leaf escape resets **183 → 3**. Total two-mode physical A* searches **4,532 → 281**. True physical position arrival, not false order completion.
- **Small motel 1855967:** remains **2/4** authored arrivals, with Rook still **310.08** units short and the original repeated escape pattern. A genuine unresolved spatial problem; next diagnosis may require richer same-side corridor/leaf clearance, but it must never introduce collision exceptions or hidden destination completion.

### Fourth independent 22-map, two-mode, 176-operator paired holdout

Frozen *before* the candidate comparison in `scripts/lib/d3-13g2-fresh-22-manifest.mjs`. Every one of the 11 building archetypes appears at both map sizes. Both baseline and candidate were run on **identical physical simulation and scripted authored/entry orders** for 45 seconds.

| Measure | Unchanged baseline | D3.13G2C |
|---|---:|---:|
| Physical arrivals | 152/176 | **154/176** |
| Fully arrived squads | 31/44 | **32/44** |
| Logically complete squads | 36/44 | **37/44** |
| Stall episodes | 22 | **21** |
| Recovery retries | 70 | **57** |
| Suspected loops | 8 | **7** |
| Sustained still | 0 | **0** |
| A* searches | 9,902 | **7,470** |
| Expanded nodes | 2,642,131 | **1,893,168** |
| Invalid positions/physics violations/corrupted plans | 0 | **0** |

Two changed cases were improved (utility small seed 4222898, office standard seed 4291196); no unseen arrival declines. [Paired baseline/candidate Actions run](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43682276708).

## Rejected or intentionally restricted changes

- **D3.13E R1/R2:** direct out-of-reach gate broke whole-squad physical arrivals, down to 70 and 68 against 79. Closed PR #1431 unmerged. The remote implicit OPEN bug still deserves its own path-to-handle fix.
- **G2A:** safe direct-sweep suffix selection but no accepted join or progress in independent motel cases; not released as a claimed behavior improvement.
- **G2B:** bounded multi-leg connector to existing original nav nodes improved baseline A* work, but original nav nodes can be hundreds of units distant; both motel cases stayed stuck. Not a sufficient general fix.
- **G2C:** adds only an actual open-leaf local stage joined to the complete original GO under the existing strict physical sweep. This is the accepted candidate after historical and paired unseen tests.

## Release / operations

- Main-targeted PR must pass critical typecheck, real motor, physical and release tests. No duplicate full 22-map run on every ordinary change: the two extended G2C workflows are retained as **manual** `workflow_dispatch` release verification. The normal main D3 critical workflow still gates changes to movement code.
- Do not merge while another production Pages deployment is queued or running. Check the last release completed successfully before queuing another checkpoint.
- After merge: verify the deployment succeeds and the public Pages entrypoint serves the new expected build stamp, not merely that GitHub says a workflow was created.
- Follow-up roadmap: D3.13H small-motel same-leaf loop and geometrically distinct blocked progression; then fix D3.13E remote OPEN via a legitimate motor-handled physical approach; no regression to four-person door queue, collision or plan contracts.
