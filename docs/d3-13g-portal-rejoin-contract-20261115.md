# D3.13G — Physical portal rejoin: proven causes, acceptance contract

Date: 2026-11-15. Stacked read-only diagnostic PR #1437 on D3.13F audit PR #1434. **No gameplay changes, no merge, no deployment.**

## Reproduction: two genuinely independent 45-second motel simulations

The frozen 60Hz production motor was used for 1855967 (small motel) and 2069994 (standard motel). Exact audit CLI:
```sh
node --experimental-strip-types scripts/audit-r7-squad-execution.mjs 11 2700 \
  --site-index=8 --audit-seed=1855967 --audit-scale=small \
  --route-transitions --route-quality --progress --trace-actor=rook --trace-mode=authored
```
Use `--audit-seed=2069994 --audit-scale=standard` for the second test. Raw artifacts are retained in the D3.13F/G GitHub Actions runs.

### Forensic results

| Handoff rejection reason | Small motel | Standard motel |
| --- | ---: | ---: |
| world:cooldown | 611 | 250 |
| world:no-full-body-route | 103 | 44 |
| world:no-stable-open-leaf | 0 | 76 |
| joined:cooldown | 385 | 135 |
| joined:leaf-change-budget | 304 | 224 |
| joined:no-swept-portal-stage | 24 | 5 |
| joined:unsafe-or-long-handoff | 1 | 6 |

These are **aggregate events from both authored and entry runs and all actors**, not unique operators or stalls. `routeWitness.events` is a bounded source trace for authored Rook only.

Small-motel authored Rook remains ~310.08 units from the goal; standard-motel authored Rook ~536.13. The initial D3.13F witness identified respectively 159 and 183 repeated `door-leaf-escape -> initial-intel` cycles. D3.13G diagnostics give the actual rejection cause without changing movement.

### Root cause

`src/breach-motor-collision.ts` clears the transient route after a real `escapeOpenDoorOverlap` microstep, then attempts `tryGoalCompleteDoorHandoffAfterEscape` and `restoreAfterOpenLeafEscape`. Once both fail it resets `retryRouteAt=0`, and the original known-intel route reappears immediately. The next stride may run into the same still-solid door leaf.

A world-truth route to the **entire authored goal** may legitimately fail when later doors remain closed. The short joined-portal rejoin may fail because of a genuinely unsafe sweep, missing stage, route-length cap, unchanged leaf after exhausting the maneuver attempt budget, or intentional cold-probe cooldown. These are different conditions: never remove all guards or assume cooldown is itself the bug.

## Proposed G2 behavior (not yet implemented)

1. Preserve full body/door/wall/furniture solidity. Every actual footstep uses the existing `sweptBodyClear`/oriented-profile motor; no remote hand force, teleport or new collision authority.
2. Treat **current leaf escape**, **local portal clearance stage**, **later operable doors**, and **final authored GO arrival** as different things. The local stage must not exhaust the player order. A result ending only at the portal is not an authored completion.
3. During a genuinely intersecting open leaf, avoid immediately sending the feet back through the same obstructed temporary route. Permit only a bounded physically swept clearance stage, respecting occupied body space and swing ownership.
4. Once physically clear, reconnect to the next reachable segment/operable portal of the original known-intel route. Later *closed* doors still require the authoritative handle/kick and real hinge motor; don't require every future door to already be open merely to leave the current leaf.
5. Require either actual progress to a committed stage or a material leaf/geometry/goal change before another cold recovery. No per-tick world A* expansion, indefinite retry reset, or oscillating handoff.
6. Preserve original `PlanNode` IDs, WATCH and gaze, dynamic crowd priority, lock/hold rules and order cancellation semantics. A plan must never complete when the body is still distant from the original destination.

## Stage acceptance gates

- **Safety:** zero exceptions, invalid coordinates, corrupted plans, unbounded maneuvers or physics-step violations. No novel collisions.
- **Frozen 11-site production corpus:** at least the current verified 79/88 physical arrivals, 18/22 physically completed squads, and 21/22 logically completed squads, with no additional sustained loops/stall regressions and no excessive A* searches. Use exact same 45-second runtime/seeds.
- **Known independent traps:** quantify improvements versus unchanged main for 1855967 and 2069994, including per-actor source counts, physical goal reduction, threshold passage, and exact final arrival. Reducing `initial-intel` counts alone is NOT sufficient.
- **Unseen holdout:** evaluate a separate untouched 22-map cohort. Accept real movement progress over arbitrary time-based completion; track stationary, bouncing and physical blockage separately from legitimate long routes.
- **Performance:** bound cold attempts and instrument real route searches/expansions, not variable CI elapsed CPU time. Rendering and mobile frame time should not regress.
- **Release:** isolated feature PRs, no merge to main until checks pass and other production deployment has completed. Verify GitHub Pages build stamp after a successful checkpoint.

## Explicit rejected approaches

Do not reapply failed D3.11C backoff-only and portal-only shortcuts or D3.13E reach gate PR #1431. R1/R2 reach variants dropped physical arrivals to 70 and 68 from 79; narrow unit passes did not make them acceptable. The D3.13G read-only evidence must remain distinct from any prospective gameplay patch.
