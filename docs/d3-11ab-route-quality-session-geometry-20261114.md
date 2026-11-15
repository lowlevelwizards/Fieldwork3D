# D3.11A/B — instrument routing, correct physical geometry, eliminate duplicated preview A*

Date: November 14, 2026. Feature branch `feature/d3-9-clean-single-opener-20261114`, stacked draft PR #1403 on draft parent PR #1395. Frozen gameplay baseline: D3.10B `8e6934007056291497db7f31bca883a99ef2b1d4`.

## Complete agreed scope and prioritization

1. **P0 — truthful route-level evidence.** The prior 5-second progress classifier did not establish which transient waypoints alternated, what actual A* searches cost, or whether movement was a detour versus a physical deadlock. Add offline-only audit counters and a reproducible 250 ms Utility 31162 Rook trace. Distinguish actual A* invocations from transient route assignment/waypoint consumption; measure actual expanded vertices and Node CPU time. No runtime HUD, rendering, persistent telemetry, or new movement controller.
2. **P0 — fix known session-geometry inconsistency.** The no-route contact probe in `src/breach-motor-route.ts` passed no world to `diagnoseMovement`, unlike collision and normal movement. Thread `sessionWorldGeometry(s)` through the existing diagnostic only. This preserves exact physical predicates and prevents relocated furniture or another active map affecting the decision.
3. **P1 — consolidate duplicate failed A* in preview fallback.** `DisplayRouteCache.get` computes `routeWithIntel` once, then `routeWithSqueezeIntel` was recomputing the *same normal route* on failure. Accept the previously calculated normal result as an optional read-only hint. All other callers, especially the real motor, follow the unchanged normal-first policy; never use world truth as a planning hint.
4. **P1 — require paired 45s invariants.** Frozen 11 archetypes × authored MOVE/ENTRY × four operators × 2700 fixed ticks. Compare accepted plans, actual positions, logical completions, retries, stalls, door traffic, invalid physics and authored order integrity. Keep existing geometry and queue/door regression cases.
5. **P2 — defer movement-handoff changes to D3.11C** unless there is a diagnosed, high-confidence, isolated local fix. Do not globally loosen clearance, expand route lookahead, introduce route switching or change door ownership while establishing a trustworthy baseline.

## Files and ownership

- `scripts/lib/d3-11-route-quality.mjs`: read-only `D311RouteSurvey` plus a bounded-representation A* results summarizer, activated by offline flags only. Operator metrics include physical path length, start/end net displacement, direct distance, disposable route selections, waypoint advances, sampled nav points, direction reversals and revisited 12-unit cells. These are *diagnostic proxies*, not every individual A* invocation.
- `src/breach-core.ts`: optional `setRouteGridAuditObserver`, disabled by default. `routeGrid` emits one summary at the end of each actual search via `finally` with fixed-grid budget, expanded nodes, success and elapsed CPU time. Path geometry, branching, A* tie order and budgets are unchanged. Critically, the offline runner enables this observer **only around `stepSession`**, excluding any independent expensive route probes made by forensic evidence capture.
- `scripts/audit-r7-squad-execution.mjs`: flags `--route-quality` and `--utility-trace`, optional focused `--site-index=9`; existing default report and game loop unchanged.
- `src/breach-motor-route.ts`: explicit session-world pointer to existing furniture-contact diagnostic.
- `src/breach-squeeze-route.ts` and `src/breach-route-cache.ts`: pass an already measured `normal: Pt[]` through the narrow preview fallback. No additional grid pass if the normal path is already known empty; no change to authored routes, hidden-information rules or the physical motor.
- `tests/release-d3-11ab-route-quality.test.mjs`: observer route parity and reset, readonly route survey, session-owner furniture diagnostic parity and original path, narrow fallback normal reuse, explicit scope of observer, with older D3.10B, D3.9C and R4 cornering safeguards in the workflow.
- `.github/workflows/d3-11ab-route-quality.yml`: focused 45s utility witness + matched 45s regression + per-operator downloadable artifact.

## Forensic finding — Utility 31162 authored Rook

The deterministic trace gives a concrete cause for the suspicious consecutive 5-second windows:

- **10–20 seconds**: active generated/physical FRONT door maneuver; Rook alternates motor navigation between an outside-leaf/doorway line through `(256,464)` and a nearer local route node `(224,464)`, repeatedly crossing/revisiting a very small area with squeeze engaged. The offline five-second classifier flags unproductive motion at 15s and a recurrent loop at 20s, while `blockedTime` remains zero and the active authored MOVE stays intact.
- **Around 23 seconds**: different swept-valid recovery maneuvers carry Rook away from the seam. Around 25–26 seconds the body resumes >50 world units/s physical progress. This is neither an unreachable goal nor an established continuous 45s deadlock.
- The underlying next-stage design issue is **route ownership / doorway handoff oscillation**, not A* shortest-path grid size or impossible landing. D3.11C should trace transitions between the two candidates, retain committed corridor legs while physical progress is real, and avoid suppressing recovery at a truly stuck/closed leaf. It must not change door ownership and queue policy speculatively.

## Matched behavior outcome (D3.10B → D3.11A/B)

Initial fully passing matched 45s run on A/B before tightening the observer's accounting:

| Invariant | Baseline | A/B |
|---|---:|---:|
| Physical arrivals | 79/88 | 79/88 |
| Fully physically arrived squads | 18/22 | 18/22 |
| Logically completed squads | 21/22 | 21/22 |
| Accepted plans | 22/22 | 22/22 |
| Motor recovery retries | 6 | 6 |
| Stall episodes | 9 | 9 |
| Suspicious windows | 8 | 8 |
| Invalid positions, oversized steps, corrupted plans | 0, 0, 0 | 0, 0, 0 |

The initial audit's 4,983 grid searches/1.86m expanded nodes included **offline forensic route probes**; they are *not* valid live-execution CPU totals and must not be reported as such. The subsequent observer-scoping correction measures only actual `stepSession` searches. Time measurements still represent benchmark runner Node CPU, **not phone FPS**.

## Merge/release contract

Feature-branch only, PR #1403 retained as draft and based on draft PR #1395. No merge or deployment in these stages. Accept only after final-head targeted tests, production build, exact 45s comparison, queue/door physics safety checks and verified CI. D3.11C route stability, D3.11D motor smoothness and D3.13 physical-device performance are future independent stages.
