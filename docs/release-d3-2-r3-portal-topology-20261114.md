# D3.2 R3 — sampled portal connectivity, actual clinic seed 31175

Feature continuation of draft PR #1395. Diagnostic-only stages, not a gameplay
reliability closeout or release candidate. R2.6 head: `37f805825b3e295bb68b791d0cbae7a1df0b6d74`.

## R3.0 — classify real physical disconnection (offline only)

At real generated clinic entry, Vale at ~ (411.13,362.48), goal
(442.14,462), D6 fully open, 9-unit current leaf gap. Both endpoints are
world-passable and full-body-clear.

A bounded 4-unit orthogonal flood using existing `bodyClear` and
`sweptBodyClear` explored 17,965 cells and exhausted the real physical
component WITHOUT reaching the goal. The same site with static walls and
furniture ONLY connected after 10,014 visited cells. Thus the static building
floor is sampled-connected; current door leaves separate the active physical
route. The diagnostic cannot prove continuous-space impossibility outside its
4-unit resolution and must not be used as live collision permission.

## R3.1 — which kind of leaf matters

Same seed, same fixed tick and authoritative geometry:

| Hypothesis | 4-unit sampled route |
| --- | --- |
| All current physical leaves solid | No (exhausted) |
| Static walls and cover only | Yes (111 steps) |
| Omit only CLOSED, not locked/jammed/wedged/held hinged leaves | Yes (209 steps) |
| Omit only already fully open leaves | No (exhausted) |
| Omit nearest leaf D6 alone | No (exhausted) |

A current open D6 is **not** an explanation for the remaining
destination-level disconnection. Closed and hypothetically operable doors must
be represented as *future traversable portals*, but the original panels still
remain physically solid until a real player/operator interaction changes them.

## R3.2 — ordered hypothetical portal chain

Record a compact witness of every actual CLOSED leaf blocking the sampled
hypothetical path, using real `sweptBodyClear` for each segment. The
209-step counterfactual path would cross **SERVICE → D4 → D3** at sample points
~ (180,444), (320,444), (388,448). The last actually swept-clear point
before the first blocked contact is (176,444). D7 is locked and is not
misclassified as operable. This is one candidate chain, not guaranteed
optimal, reachable after actuation, or authorized for execution. No path
points are published to the motor; no live actor coordinates, orders,
hinge impulses, per-frame ticks, or movement permissions are modified.

## Next correction contract — D3.3

The missing subsystem is an **action-aware portal route**:
1. Distinguish solid *now* from proven operable doors without weakening the
   authoritative body/leaf collision. Respect locked, held, wedged, jammed,
   and explicit CLOSE semantics.
2. Produce a **first reachable door approach** and downstream portal chain.
   Prefer the existing world/known-intel route providers and door-opening
   interaction. Do not rerun a 4-unit global flood each fixed tick.
3. Stage only physically swept-clear transient route instructions up to the
   next door; let the existing motor / handle-side / hinge authority open
   the panel. Never teleport or edit authored PlanNode[].
4. Re-evaluate only on navigation request, door state revision, or bounded
   stall-retry, with per-route CPU and search budgets; support partial
   invalidation instead of a second physics engine.
5. Demonstrate more completed long-range operators/squads in same-seed
   generated 11-site 900/1800-tick acceptance. Preserve zero invalid
   movement, zero order corruption, Q5 exact door 70-case, D1/D2/D5/D6,
   Ground Zero, frame-time safety, and R2's D6/D2 oscillation suppression.
   If this cannot be proven, keep the gameplay fix off the live branch.

## Verification

At R3.2 HEAD `04369ffcda38dc87f47a3d933d80a6eb4dc515d4`:
- [Focused D3 + true clinic witness](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43620511879) — successful
- Same workflow's exact base-vs-feature gameplay parity — successful
- TypeScript and production Vite build — successful
- R3 five focused regression tests, including locked/wedged refusals,
  actionable chain ordering and no hypothetical motor route — successful

No additional live motor work was authorized by this evidence.
Draft PR #1395 remains **unmerged and undeployed**. Do not queue a new
Pages release until a release checkpoint meets the acceptance criteria.
