# D3.16A — Truthful order outcomes and physical arrivals

## Verified real-motor baseline (11 sites × 2 modes × 4 operators, 45 seconds)

The post-D3.15 release has **80/88 physical arrivals**. Eight operator goals
are not reached. The exact 60 Hz forensic run `43694255202` showed:

| Site / scale / mode | Operator(s) | End-state truth |
| --- | --- | --- |
| Retail standard, seed 31084, authored | Moss, Vale | Confirmed locked-door MOVE cancellation; plans drained, actual GO missed by 386.01 and 354.60 |
| Motel small, seed 31149, authored | Vale | Confirmed locked-door MOVE cancellation; GO missed by 109.27 |
| Motel small, seed 31149, authored | Ash | MOVE still **active**, destination occupied by toilet/furniture; remains 33.71 away, reports DESTINATION OBSTRUCTED |
| Utility standard, seed 31162, authored | Rook, Moss, Ash | Confirmed locked-door MOVE cancellations; GO missed by 357.14, 340.04, 288.15 |
| Clinic small, seed 31175, generated entry | Ash | Confirmed locked-door MOVE cancellation; GO missed by 102.25 |

The seven canceled operators **who missed their goals** appeared `plan.length===0`, and
were counted among 21/22 **queue-drained** squads even though only 18/22
squads physically reached all four GO coordinates. A separate pair of actors
arrived physically after an earlier terminal cancellation, so strict
fully-successful squads are 16/22, not 18/22.

## Correct semantics

- **Cancelled**: the real fixed-tick order executor reports a terminal failure
  (e.g. physically verified locked door), removes ONLY that failed PlanNode
  and increments a persistent actor-scoped failure ledger once. Future orders
  can proceed, but the failed order can never become a successful completion.
- **Pending**: an authored order remains active, even when blocked by actual
  immovable furniture. Do not move a player-authored destination, waive
  collisions, or reclassify it as success.
- **Arrived**: actor really reached original frozen GO **and** finished all
  orders with zero cancellations. This is the only operator outcome counted
  toward a four-person successful physical execution.
- **Unreached despite drained queue**: zero active/failed orders but original
  world GO missed. Retain as a separate detection category; never infer
  success from an empty queue.

For compatibility, the historic `complete` / `completedFour` values in
the R7 audit remain **queue-drained** counts. The new
`successful` / `successfulFour` metrics require actual physical GO arrival,
no pending orders and zero terminal cancellations. New
`cancelledOperators`, `terminallyCancelledOrders`,
`physicallyPendingOperators`, and `unreachedDrainedOperators` explicitly
show failures without parsing human-facing event text.

The operator HUD no longer says **ORDERS COMPLETE** after an interrupted,
queue-drained plan. It shows **ORDERS CANCELLED**, the count and last known
reason, without revealing a door lock before it was actually encountered.

## Non-goals and deferred movement work

No changes to movement physics, plan authoring, locked door policy, clearance,
stack/sync/wait, dynamic replan rate, success objectives, or production Pages.
After recording correct outcomes and no-regression acceptance, the next
physical improvement should target the bounded feedback/clearance for Ash's
retained unobtainable motel GO. A locked door may be handled by deliberate
player lockpick/kick/repath, but do not silently retarget the canceled plan.
