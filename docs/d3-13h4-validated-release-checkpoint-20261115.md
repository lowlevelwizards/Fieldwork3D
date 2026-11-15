# D3.13H4 validated release checkpoint — 2026-11-15

This release consolidates staged H1 diagnostics, H2C bounded frame-side physical staging, and H4 cold future-door recovery. Main-targeted PR #1444 is the only integration and production release owner; stacked parent PRs #1440 and #1442 must not be independently merged.

## Root cause

In independent small motel seed 1855967, Rook was about 310 world units from the original MOVE destination after 45s. Rook had physically escaped an already-open D2 leaf repeatedly, but every current local swept approach failed, leading to reacquisition of the same old route. The H3 end-of-run feasibility probe confirmed that the world-true final-GO route was blocked by other closed doors, while the existing first-future-operable-door planner produced a valid five-node physical route with a swept-clear first leg.

H4 calls that established planner only after three real same-door overlap escapes and failure of the bounded physical local stage. A single cold request is allowed per unchanged door angle, position, order, and goal. Future actual door opening, collision, physical walking and GO completion still use the existing motor. No teleport, remote opening, authored-order mutation, hidden destination completion or unbounded per-tick A*.

## Verified outcomes

| Measure | Deployed G2C baseline | H4 candidate |
| --- | ---: | ---: |
| Historical 45s physical arrivals | 80/88 | 80/88 |
| Historical physically complete squads | 18/22 | 18/22 |
| Historical stall episodes | 8 | 8 |
| Historical A* searches | 3006 | 2611 |
| Small motel actual arrivals | 2/4 | 4/4 |
| Small motel Rook GO gap | 310.08 | 4.90 |
| Small motel A* searches | 2611 | 459 |
| Standard motel actual arrivals | 4/4 | 4/4 |
| Fifth independent 22-map physical arrivals | 143/176 | 144/176 |
| Fifth independent fully arrived squads | 29/44 | 30/44 |
| Fifth independent completed logical squads | 33/44 | 34/44 |
| Fifth independent stall episodes | 8 | 8 |
| Fifth independent suspected movement loops | 17 | 9 |
| Fifth independent A* searches | 9809 | 6152 |
| Fifth independent expanded nodes | 3222238 | 1263597 |
| Physics violations, invalid bodies, corrupted plans | 0 | 0 |

The fifth 22-map paired cohort (44 four-person runs, two modes, each 45s) was frozen before H4 and used identical orders and maps against immutable production G2C SHA 45001502bfb729e5ac8d08446af153237d359da5. The standard utility seed 5639523 improved from three to four real physical arrivals and no unseen physical arrival regressed.

Evidence: historical and motel H4 Actions run https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43684015926 ; fifth-map paired test https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43684016071 ; H3 geometry feasibility https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43683873043 .

## Integration contract

Run main-targeted physical, critical motor, build and typecheck CI. The long historical and fifth-map workflows are retained for manual reruns after archived successful verification, instead of firing redundantly on every ordinary PR. Do not merge while an earlier deployment is queued or running. After the one coordinated main merge, verify GitHub Pages is serving the expected build stamp.

H4 does NOT resolve the separate remote implicit OPEN reach bug from rejected PR #1431. The next D3.14 reliability work should investigate the remaining 9 movement-loop observations in the fifth blind 22-map cohort and preserve the exact physical collision and authored GO rules.
