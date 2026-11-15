# D3.17B — Three frozen actual route-writer oscillations (2026-11-15)

## Proof protocol

Read-only actual `stepSession(...,1/60)`, 2700 ticks, both authored and entry
modes, matching the released D3.16 tenth holdout. Source-level
`setTransientRouteObserver` records actor position, current and
replacement transient path, real door phase and timestamp. No physical
motor, plan, hinge, collision or rendered UI change. Workflow
**43741757681** passed all three exact case gates and preserved their
original 6/7/6 flagged low-net movement windows.

## B1: actual A -> B -> A *route ownership* conflict, NOT immobility

**Utility standard, seed 14462973, authored Ash, door COURT-1:**
- 16 `initial-intel` and 16 `door-rehearsal` writes; **15**
  `initial-intel -> door-rehearsal -> initial-intel` reversions, and
  15 inverses
- At 11.12 seconds, the motor re-acquires an intel route from
  (457.63, 292.75), starting (464,256) and heading toward (576,256)
  and untouched authored GO (603.2,342.5)
- At 12.30 seconds, the still-active real door crossing reassigns a
  two-point swept rehearsal from (480.99,258.12) via (457.5,247)
  and (457.5,295). Both source and physical positions repeat through
  44.17 seconds.
- No persistent blocked state, door-opening wait or collision exemption.

**Garage standard, seed 14354241, generated entry Vale, door FRONT:**
- 18 `initial-intel` and 16 `door-rehearsal` writes; **16**
  `initial-intel -> door-rehearsal -> initial-intel` reversions
- At 9.13 seconds, freshly acquired intel route from (175.26,274.55)
  begins (144,272), (128,112), (144,64) — back along an earlier
  crossing path. At 10.17 seconds, rehearsal from (144.73,255.50)
  reassigns (130,274.68), (178,274.68).
- This exact pair of physical anchors and opposite transient route
  ownership persists through 44.83 seconds.

**Root failure:** an accepted swept portal rehearsal gets handed off to
ordinary remembered-intel routing, which immediately returns the
body to the same side of the same open hinge. A fresh door crossing
episode reaccepts the near-identical physical rehearsal. A per-episode
attempt cap is insufficient because the episode resets after a
physically crossed threshold. Do not simply increase motor strength,
rewrite a GO, or keep a perpetual door lock/ownership.

**D3.17B1 implementation target:** one authored-order/door/unchanged-
hinge-scoped continuity guard, activated ONLY by a witnessed repeated
A->B->A same-leaf cycle and failed physical GO progress. When the body
has physically crossed, prefer an existing physically swept continuation
or existing known next-operable-door prefix that is actually reachable.
Prevent same-side stale re-acquisition only while its contradictory
recent crossed-leaf evidence is current. Give up visibly rather than
invent a route if no legal continuation exists. Retire the guard on
legitimate progress, changed hinge, changed order/goal or geometry.
One cold recovery attempt, not a per-frame A* and no second motor.

## B2: repeated *same* full-body-lane adoption, not competing writers

**Motel small, seed 14136777, entry Ash:**
- 58 `full-body-lane` writes, 1 `lane-cycle-world`, 3
  `blocked-leg-connector`; no repeated A->B->A source alternation
- By 10.57 seconds the actor is near (456.21,217.21) and continues
  adopting the SAME disposable three-waypoint path:
  (464,208) -> (432,208) -> (426,219.98)
- The same near-identical position and path recur at 11.27, 11.97,
  12.67, 13.37, 14.07 and approximately every .70 seconds until
  44.87. This operator travels ~212 units in each five-second window
  without physically closing the remote GO.
- The single alternate swept world-route at 2.27 seconds was later
  replaced by a blocked-leg connector and the original full-body lane.
  The existing grab-and-hold / STACK-only cycle detector does not
  continue protecting this ordinary later MOVE.

**D3.17B2 implementation target:** extend the existing actor-scoped
loop-episode witness to detect repeat adopted full-body lane prefixes
for an ordinary unchanged MOVE, rather than adding an unrelated
watchdog. Detect real repeated anchor/GO/lane with no net destination
progress, use one bounded fully swept alternative if valid, and keep
the authored GO. Do not treat valid distant detours as a loop; preserve
normal collision and retry cooldown.

## Hard release gates for each implementation

- Exact three seeds MUST preserve their unchanged authored GO and
  physically correct destination/door side, with a measurable reduction
  in repeated source-level route transitions AND actual operator
  movement-loop windows / physically verified arrivals.
- Compare complete 88-operator historical baseline, 22×2 eighth
  and tenth independent cohorts on identical maps and order inputs.
  No lost per-squad physical arrivals, no increased suspicious loops,
  stalls, A* work beyond accepted budgets, or doorway regressions.
- Zero new invalid positions, teleport-distance steps, ghost sweeps,
  locked-door bypasses, hidden geometry revelations, false completion,
  or authored-order mutations.
- Keep B1 (door route ownership) separate from B2 (full-body lane),
  commit on feature branch; no Pages release until proven and grouped
  with a safe release checkpoint.
