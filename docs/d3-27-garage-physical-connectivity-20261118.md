# D3.27 — Garage authored MOVE: physical connectivity and route contradiction

Date: 2026-11-18. **Read-only forensic checkpoint.** This document does not authorize an arrival count or collision bypass.

## Frozen outcome

- Latest merged, deployed D3.26 release: **160/176 real motor arrivals**, **36/44 four-person squads**, **1 suspected loop**, zero reported physics/plan violations.
- Frozen Garage, standard, seed **19285501**, separately authored MOVE, **Moss**: at 45s, actual actor center **(541.9649, 638.7712)**; blocked around **34s** by wall/furniture contact, stale transient nav pointing roughly toward **(672,640)**.
- **Critical authoring distinction**: the R7 frozen audit recorded the raw candidate **(597.6,564.5)**. The actual `planMove` correctly projected it to the authored GO **(591.5378,568)**. **The actual GO is physically full-body clear** and has no known immovable furniture obstruction. An initial D3.27B fixed-goal warning incorrectly used the *raw candidate*, failed acceptance, and was **fully reverted**, including its misleading test. Never revive it.
- Moss's authored plan remains active; it must never be silently cancelled, retargeted, teleported or declared arrived.

## Geometry and operational facts

- Moss is just south of the horizontal **y=627** wall. The segment from **(504,627) to (550,627)** is solid; a **window sill** spans x=550..602; another wall continues x=602..648.
- The target lies in **workshop R4**, rectangle x=504..648, y=502..627. R4 has **no hinged door**; its north boundary has an actual **62-unit wide open passage OPEN-D3** spanning (545,502)..(607,502), opening into adjacent **bay R3**. Its south boundary is a window, not a free walk-through passage.
- The north opening's midpoint is **(576,502)**. A physically clear crossing from staging points **(576,484)** to **(576,520)** was confirmed, and a world route from south staging to the real GO was found.
- Other squad operators **Rook, Ash and Vale** can reach the north staging point, confirming the workshop is **not sealed**.
- Moss can reach that north stage through static world geometry **if doors are hypothetically absent or open**: a world-route proposal has six waypoints. Their actual states matter. `routeToNextOperableDoor(Moss, northStage)` returns no prefix, despite a hypothetical all-open route.
- Critically the proposed first grid waypoint **(560,640)** from Moss's actual position is **NOT a legal actual 0.3-unit full-body motor step**: it clips the clearance capsule of the y=627 wall/window sill. The same first-step problem invalidates the intel-known route and the no-door world proposal, even though their coarse paths look connected.
- Nine northbound hand-authored probe chains and a bounded set of 12/16/24/32-unit lateral retreats failed complete physical certification. Some retreats are swept-clear individually, but their onward north leg collides with the y=627 wall.
- A full-body fine route to the real GO, a normal/squeeze world route with actual doors, and a first-operable-door prefix to the GO are all absent at the final physical position. Do not infer the endpoint is blocked from these results.

## Actual architectural/engine implications

1. Preserve **window-traversal authority**: `breach-traversal-surfaces.ts` explicitly marks windows as *solid until gated traversal*. A MOVE must not automatically pass through a closed sill via an unverified normal step. Existing window motor logic can evaluate known climbable panes, but only when its actual prerequisites are met.
2. The **grid-to-motor contract is still broken at a wall-adjacent start**. A future path proposal must certify the FIRST 0.3-unit stride **and all subsequent exact waypoint-to-waypoint strides**, not just `routeWithSqueezeWorld` at its coarse resolution.
3. A legitimate solution may stage through **the existing real OPEN-D3 passage**, and may travel around actual operable doors through the existing door motor. It must never pretend a closed leaf is open. The current first-door recovery provider returns no such prefix, and the other available route sources are not yet safe to adopt.
4. In fogged modes, prefer passages actually known to `s.intel.rooms` and `s.intel.doors`; avoid revealing unknown architecture while repairing a stalled MOVE. The frozen repro uses full-view and cannot itself certify fog parity.
5. The R7 auditor should eventually report both **requested candidate** and **committed authored GO**. Keep the existing frozen protocol unmodified while investigating; compare any audit correction separately rather than silently changing the denominator.

## Proposed next bounded implementation stage

- **D3.27D1:** Add a cold, bounded **exact-motor-edge route search** or short physical departure connector around the sill, targeting a genuinely reachable approach to OPEN-D3. Require every edge to pass real 0.3-unit full-body clearance and every stage to be physically enterable. Do not relax walls or hide actors in props.
- **D3.27D2:** Preserve route ownership across the exact turns; door contact/open is still handled only by the physical door motor. Neither landing position nor authored GO changes.
- **D3.27D3:** Re-run exact seed 19285501 for 45s, verify Moss physically arrives (not just logical plan completion) and check other three real arrivals remain intact. Run independent 22×2 corpus; require >=160/176 arrivals, >=36/44 squads, <=1 loop, zero integrity regressions.
- **Release:** No D3.27 main merge or deployment until independently verified gains; the latest good deployed build remains D3.26.

## Evidence

- Draft PR [#1727](https://github.com/lowlevelwizards/Fieldwork3D/pull/1727), seeded read-only workflow [D3.27 garage contact](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44342776981). Output logs include `D327_GARAGE_CONTACT` with exact authored goal, wall/cover contact, counterfactual door routes, first motor collisions, north opening evidence, and passage candidates.
