# D3.11C — Route ownership and doorway handoff: measured failure, retained evidence

Date: 14 November 2026. Feature branch: `feature/d3-9-clean-single-opener-20261114`, stacked draft PR #1403 (parent draft #1395). **Not merged, not deployed**. Trusted baseline D3.11A/B: `d90f9c1e243e058513050404891abf09d848e13a`.

## Complete scope and evidence-driven priorities

1. C1 — identify the exact motor route writer and physical doorway episode that replaces a transient navigation route. Record opt-in, offline-only source, current route, candidate, door state, squeeze, and blocker. Preserve `PlanNode[]`, real collision and full authority of the physical motor.
2. C2 — verify whether small circular motion in a door episode falsely renews a progress clock. Distinguish movement along a committed corridor from lateral shifting.
3. C3 — attempt the highest-confidence safe handoff at actual door overlap; reject changes whenever they reduce physical arrivals, mis-complete a player's MOVE, increase sustained loops, or substantially worsen route work.
4. C4 — provide reproducible, bounded counts of immediate same-actor/same-door `door-leaf-escape` → `initial-intel` reacquisition events, plus per-actor and per-source attribution, with no production sampling overhead.
5. C5 — run the exact frozen 11-site × authored/ENTRY × 4-operator × 45s corpus, targeted doorway/route and source-contract tests, and production build; report test outcomes rather than optimizing only one seed.

## Implemented and retained

- `src/breach-route-transition.ts` provides an optional opt-in source-tagged observer and otherwise performs precisely the same transient assignments and prepends. No listener in gameplay, therefore no event snapshots or persistent actor/route cache.
- Actual route writers are instrumented with source tags: `initial-intel`, `initial-enemy`, `door-leaf-escape`, `door-short-entry`, `door-rehearsal`, `full-body-lane`, `blocked-leg-connector`, `collision-world-replan`, `collision-intel-replan`, `self-hinge-relief`, `local-detour`, `passage-retreat` and related transient movement sources. The fragile `a.nav.unshift(retreat)` passage source contract is preserved.
- `scripts/audit-r7-squad-execution.mjs --route-quality --route-transitions --progress [--utility-trace] ` records transitions only while `stepSession` runs. Offline forensic queries do not contaminate actual A* metrics. It aggregates provenance and specifically counts immediate, same-actor/same-door `door-leaf-escape` route clear followed within one second by `initial-intel` route reacquisition, excluding an intervening route replacement.
- Targeted C1 provenance tests, prior D3.11A/B scope tests, the exact baseline-vs-head 45s workflow, and retained artifacts are committed. The agent does not run continuously.

## The proven Utility 31162 Rook problem

The prior D3.11A/B trace showed Rook circling the FRONT door for repeated 5-second windows while switching next nodes between approximately `(224,464)` and `(256,464)`. The C1 route-writer observer demonstrated that the principal loop is a repeated physical `door-leaf-escape` immediately followed by the ordinary `initial-intel` known-map route. This is **not predominantly caused by the full-body lane A*** or a generic shortest-path routing error.

The plan remains authored; the body has not teleported; the baseline eventually recovers. A physically legal brief door stage is **not** sufficient to mark the authored final destination complete.

## Explicitly rejected experimental behavior and outcomes

The frozen D3.11A/B baseline is 79/88 physical arrivals, 18/22 fully physically arrived squads, 21/22 logically completed squads, 6 recovery retries, 9 recorded stall episodes, zero invalid positions and physics violations, and one Rook suspicious movement-loop window.

- **Global full-body search suppression during a legal squeeze** — reduced physical arrivals 79→78, squads 18→17, logical completions 21→19 and increased retries 6→15. Wrong cause. Reverted.
- **Progress-clock replacement with best doorway signed-side and committed-waypoint advance** — interacted with recovery causing genuine arrival regression. Reverted to exact original `src/breach-door-traversal-episode.ts`.
- **Relax stable fully-open post-escape world-route threshold from 0.96 to 0.82** — retained arrivals but did not remove the FRONT loop and slightly increased A* work. Reverted.
- **Add 0.25 second route retry backoff after each real escape** — retained 79 arrivals but lengthened Rook's recurring loop, and A* expansions rose from ~1.76m to ~2.06m. Reverted.
- **Immediately rehearse the same door after a real swept escape** — substantial A* search count reduction (4603→2559) and removed the short-window loop, **but** arrivals fell 79→78, physically completed squads 18→17, logically completed 21→20; Rook's active MOVE ended after only ~114 world units of travel without reaching the frozen final destination. A short portal-stage route cannot stand in for the player's original goal. Fully reverted.

These failures are **not accepted improvements**, regardless of attractive search-cost statistics. Do not reintroduce a short portal route as a completed MOVE, loosen solidity, hide a stuck operator, or use a blanket squeeze-recovery suppression to claim success.

## Safe implementation conclusion and next action

The final retained C1/C4 changes are diagnostic and should preserve simulation behavior exactly; benchmarked improvement to door traversal is **not yet established**. C2/C3 behavior changes did not pass the complete evidence gate and were rolled back. A future scoped C3 follow-up must establish an explicit *portal stage versus full authored destination* contract and a robust handoff between transient clearance waypoints and original MOVE completion, preserving all existing door/queue ownership. Only then should further recovery policy experiments be trialed.

Performance should be judged by exact search invocation and expanded node counts, not raw accumulated CI CPU seconds (host load varies), and movement by actual final positions, not logical order exhaustion or an arbitrary arrival deadline.

## Release and verification

GitHub Actions workflow `.github/workflows/d3-11c-route-handoff.yml` runs targeted tests, Vite production build, Utility 31162 45s route-writer trace and the 22-case paired D3.11B comparison. Keep draft PR #1403 stacked on draft #1395; do not merge/release while these remain draft. Update this document if final-head paired results differ from unchanged baseline.
