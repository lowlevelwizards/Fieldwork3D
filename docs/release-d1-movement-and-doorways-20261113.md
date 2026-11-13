# Release D1 — movement / doorway commitment and performance

## Code and behavior audit
Existing authoritative systems are retained: GO-time immutable passage ranking (`breach-passage-plan.ts`), one session-scoped threshold owner (`breach-passage-coordinator.ts`), persistent physically grounded door episodes, swept full-body / oriented squeeze collision, opening-leaf pressure, bounded obstruction recovery, and player-authored PlanNode authority.

Previously, the passage owner was renewed by **any** 0.7-unit position change, including lateral shuffling and motion *away* from the doorway. A perpetually rearward-moving or circling operator could therefore retain the aperture despite losing useful crossing progress. Reassigning at each candidate motor tick was undesirable; the existing 1.8-second real lease and throat protection are kept.

The motor also assembled a friendly-roster array and invoked friendly passing every tick, even though the function immediately returned the original movement proposal whenever no friendly was within its 21/25-unit proximity gate.

## Implemented stages
- **D1.1 — crossing authority:** renewal requires >0.7 units of actual forward progress along the door normal, not arbitrary body travel. A physical torso inside the throat remains authoritative even if stopped; an *outside-throat* owner that makes no progress for 1.8 seconds yields first choice to another genuinely ready approacher. Only if there is no alternative can the original owner reacquire. Authored WAIT / interrupted move immediately relinquishes ownership. Current GO-time ranks remain unchanged.
- **D1.2 — hot-path budget:** cache immutable door centers and actor identity per session/schedule; reuse each lane's tiny candidate buffer while checking order readiness live every motor call. Remove transient splice/unshift allocation and per-bisection point objects in queue gap clamping. Skip constructing a whole friendly roster or running optional swept sidesteps unless a live teammate crosses the exact existing steering proximity gate. No extra per-frame physics object, query, timer, or A* call.
- **D1.3 — acceptance:** explicit tests for counterflow ownership, stalled/backward claimant handoff, throat occupancy, WAIT interruption, four-person rank spacing, and preservation of authored instructions.

## Physical invariants
- Full-radius swept world geometry, furniture, hinge and profile checks remain in the current single motor; there is no collision exemption, teleport, forced path, authored route modification, or new duplicate queue owner.
- Q4 outward-swing staging and D2–D6 fixed maneuver / hand-grip budgets remain authoritative. A follower hold is a zero-motion proposal, not a backward reposition.
- Enemy and civilian motors remain unchanged except the operator motor's equivalent no-nearby-friendly early-out.
- An active WATCH or explicit door action is never accelerated, overwritten or silently canceled.

## Release gates
1. TypeScript production build and A9 changed-source critical suite.
2. Q0–Q4 queue ownership and four-hinge four-person live test.
3. Strict Q5/Q6 extended real-physics 70-case matrix: exactly 55 traversable completed, 10 correctly blocked, five correctly obstructed; fourth-cross worst <=15.9 s and final completion worst <=18.5 s, plus unchanged core p90.
4. D1 interruption / no-drift tests, existing clutter, squeeze, collision, locked/wedged and furniture fixtures.
5. Generated-site squad-entry representative audit. Full generated-map breadth and phone perf need their own real-device checks, not a claim inferred from the synthetic 70 cases.

Do not merge or deploy before critical checks pass. D0 outcome/fingerprint baselines and render-level validation remain unchanged.
