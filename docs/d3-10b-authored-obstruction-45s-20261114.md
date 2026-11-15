# D3.10B — true authored obstruction, route retry consolidation, 45s physical parity

Date: November 14, 2026. Feature branch `feature/d3-9-clean-single-opener-20261114`. PR #1403 (draft, unmerged), dependent on draft PR #1395. Frozen previous D3.10A source `7f692d7413c881127ad5d4b3f27b09f361e36b07`.

## Prioritized design/behavior audit

1. **P0 high-confidence — repeated A* against proven immovable authored destination.** Motel 31149 authored Ash advanced physically then reached a full-body-unreachable toilet footprint, remained 33.71 world units from the requested center, and accumulated ~34s immobile with 14 repeated route retries by 45s. This is a **real obstruction**, not a universal 45s distance failure. Existing C3 rate-limits A* but still probes on each cooldown.
2. **P0 high-confidence — truthful retained-order issue.** The execution status UI already supports `orderIssue`; ordinary unreachable authored MOVE did not use it, showing only generic route block. Preserve player authorship and never shift, cancel, or mark the blocked MOVE complete.
3. **P1 high-confidence — automatically resume after meaningful world change.** A static fixture does not clear because the motor checks again after 3.2s; a different authored goal or physical-cover revision *does* justify a fresh route. Keep the hold session/actor-local, transient, replay-agnostic, and bypassed for ENTRY, STACK, door/leaf and traversal actions.
4. **P1 medium-high confidence — lower collision diagnostic scan cost.** `diagnoseMovement` checked all walls and furniture at every sampled blocked physical stride even though the session world already maintains revision-scoped spatial buckets. Route exact diagnostics through the session index only when present, preserve the identical wall > furniture > door > actor priority and original geometry predicates. Legacy no-world case stays unchanged. This is a bounded structural optimization, **not** a claimed device FPS improvement.
5. **P2 lower confidence, defer — isolated utility 31162 authored Rook five-second movement-loop window.** The operator progresses physically over the 45s corpus; no sustained-still evidence or reproducible recurrent freeze supports adding another pathfinding/motor authority. Preserve evidence and tackle as D3.11 route-quality work if traceable across runs.

## Implementation and safety

`src/breach-authored-goal-block.ts` holds a weak, per-actor record (`orderId`, quantized destination key, and session geometry revision) only once an ordinary authored MOVE has accumulated at least 3.5s of genuine blocked time, is within 64 world units of the goal, has a relevant obstruction cause, and the exact goal footprint intersects an **already known** static wall or fixed/non-relocatable solid cover. Does **not** use hidden cover for player feedback. Dynamic teammate/door pressure, closable doors, moveable furniture, generated ENTRY and STACK, or active traversal are ineligible.

The guard runs at `prepareMotorRoute` after the existing goal-change reset and **before** any repeated door pressure probe, furniture contact probe, or A* route search. Once held: stop redundant searches, keep the original order intact, set `orderIssue='DESTINATION OBSTRUCTED · EDIT MOVE'`, notify only once, leave full physical collision untouched. Retire the hold when the actor's active plan/order or destination changes or `sessionWorldGeometry(s).revision` advances; clear only the issue that the guard itself created. The user can edit the order, and a moved/destroyed object allows re-evaluation.

`src/breach-nav-diagnostics.ts` now performs only broadphase selection through `someWallNearPoint`/`someCoverNearPoint` when a session world exists; exact collision thresholds and deterministic precedence are unchanged. It does not add a new live frame survey, second movement controller, fake motion, clearance reduction, or new route-selection policy.

## Exact matching 45s results

11 frozen generated buildings × 2 modes × 4 operators = 22 mode cases / 88 operators; 2700 fixed steps per case. No shortened deadlines, no new simulation clocks.

| Metric | D3.10A, 45s | D3.10B, 45s |
|---|---:|---:|
| Physical proximity arrivals | 79 / 88 | **79 / 88** |
| Physically arrived four-person squads | 18 / 22 | **18 / 22** |
| Logically complete four-person squads | 21 / 22 | **21 / 22** |
| Accepted complete squad plans | 22 / 22 | **22 / 22** |
| Route recovery retries | 17 | **6** |
| Motel Ash retries | 14 | **3** |
| Aggregate recorded stall episodes | 9 | **9** |
| Suspicious five-second evidence windows | 8 | **8** |
| Isolated movement-loop windows | 1 | **1** |
| Sustained-still suspicious windows | 0 | **0** |
| Invalid positions / oversized physical steps / corrupted plans | 0 / 0 / 0 | **0 / 0 / 0** |

- **Motel 31149 authored Ash:** originally selected unreachable toilet landing stays the same; no false arrival or canceled order, now has a visible `DESTINATION OBSTRUCTED · EDIT MOVE` execution issue with a single emitted warning. Retry count drops from 14 to 3. Intentional held obstruction is still counted in the *offline* physical-obstruction progress windows, so the unchanged suspicious count is not a new behavioral stall.
- All other operator arrival, door, queue and physical outcomes remain stable in the matched source comparison.
- Unit acceptance: known full-body fixed obstacle and hidden-cover guard, one-shot status, hold release on cover revision, exclusion of ENTRY/STACK, motor guard order, and 300 exact before/after indexed diagnostic queries across four generated building archetypes. TypeScript/Vite build and existing C progress cases also exercised.
- This is deterministic Node test evidence and a structural hotpath optimization, **not a measured runtime RAF or mobile FPS improvement**. Profiling under load is separate D3.13 work.

## Integration

Keep PR #1403 draft; no production merge/deploy during unresolved D3.2–D3.8 draft #1395. Before integrating, check the entire final-head critical workflow suite and confirm deployment/Pages state; do not stack releases. D3.11 route-quality and isolated utility detours are the next evidence-driven scope, not a hidden extension of D3.10B.
