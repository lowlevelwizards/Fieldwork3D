# D3.31F — force-open lock aftermath and stale detour recovery (2026-11-18)

## Observed player-facing issue
The screenshot from live gameplay showed BUILD c4223b6, UPDATE READY, and LOOK/WATCH paths near a doorway. The user reported that after kicking the handle off a previously locked door, operators took an unnecessary detour around the map and repeated locked-door blocker messages even after the door opened. Screenshot alone does not identify a door ID or prove path ownership; the source behavior provides the reproducible mechanisms.

## Specific verified sources
- `src/breach-door.ts::kickDoor` correctly sets `locked=false`, `latchBroken=true`, `open=true`, with physical hinge movement and detached hardware. Neither the kick nor the actual panel collision needs a global rewrite.
- `src/breach-order-wait.ts` propagated historical teammate `interruptedDoorPlan` to still-queued generated WAIT+ENTRY pairs **even after** the door became physically released. That generated more cancellations/toasts from a past lock. Historical failed orders still require explicit RESUME and must remain recorded.
- `src/breach-motor-route.ts::prepareMotorRoute` normally retains any nonempty transient detour, so a path calculated before a nearby kicked-open doorway became physically clear never reconsidered the now-shorter legal crossing unless another collision forced a replan.

## Narrow fixes
- A still-live generated WAIT+ENTRY pair stops inheriting a *teammate's* past interruption once its own real door is open and no longer locked/jammed/wedged/held. It remains held until `entryDoorState` reports actual collision clearance, so no open flag creates an artificial through-door step. A locked or unopened doorway still propagates the original failure. A previously cancelled order is NOT resurrected; its explicit user-controlled resume and replay/after-action record remain intact.
- For ordinary authored MOVE detours only, after a locally relevant, player-known, actually kicked-open door reaches .72 and optionally .98 opening fractions, try at most two real full-body route checks per actor/goal/door. Adopt the candidate only if it is at least 32 units shorter and at most 82% of the current detour, with unchanged authoritative goal and WATCH. Keep collision, movement, and swing authoritative. Never use a hidden door, locked door, stack/entry template, traversal, squeeze, or a pending partial opening as an excuse to shortcut.
- Transition source `forced-door-shortcut` supports future objective route auditing.

## Gate
https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44418374986 — **39/39 tests, zero failures**, including 5 new after-kick cases, historical D3.25/D3.30 entry checks, D3.29 broken-latch/lock tests, and EQA1 known-door MOVE tests; TypeScript check, production Vite build **passed**.

The test's actual full-body swept route checks at a synthetic divided-wall and kicked-door scene pass. Real iPhone visual and UX validation for this exact user's scenario remains outstanding; don't claim to have reproduced their original seed or screenshot movement from image alone.
