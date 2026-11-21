# Movement recovery R2 — ordinary obstruction proposal/adoption

Date: 2026-11-21. Base: merged R1 shadow contract. This is the first **enforcing** recovery-adoption stage for ordinary collision strategies, not a motor rewrite.

## Completed scope

The existing motor and physical collision response remain the only authorities for actual movement and door contact. All ordinary world/actor obstruction route writers now ask **src/breach-ordinary-recovery-adoption.ts** for a typed adoption verdict *before* changing disposable `a.nav`. This module does not move actors, change plan nodes, open doors, run A*, invent intel, or override the 60Hz collision/door/queue pipeline.

Migrated writers:

| Strategy | R2 validation / proof | Shared recovery budget |
| --- | --- | --- |
| `full-body-lane` | Existing first 0.3-unit full-body stride, complete starting sweep, WATCH clearance, normal-lane timer | `full-body-lane`; M2 shared budget after sustained ordinary MOVE stall |
| `local-detour` (early blocked actor) | Existing local detour/candidate direction, explicit body sweep, WATCH, hysteretic detour timer | Normal hysteretic timer; no additional recurrence charge |
| `local-detour` (cold frame-actor denial) | Existing useful full-body first step, both side-route sweeps, WATCH | `frame-actor-detour` budget, separate from ordinary world and generated queue |
| `blocked-leg-connector` | Exact physically useful first step and unchanged transient tail; blocked route retry | `blocked-leg-connector`, participating in shared ordinary stalled budget |
| `collision-world-replan` | Materially changed trusted world/enemy-route result; collision retry | `collision-replan`, sharing ordinary stalled budget |
| `collision-intel-replan` | Materially changed known-intel route when world candidate was not adopted; collision retry | The **same** `collision-replan` family; cannot evade source-independent recurrence |

The new gate enforces: original order identity, finite and nonempty routes, typed source/operation proof, route-specific physical/provenance certificate, WATCH permission, active traversal and outside-leaf owner precedence, appropriate retry entitlement, a meaningfully changed first route leg, and source-independent recurrence where already established.

**Specific hardening:** after 1.25 seconds of physical blockage, a new *ordinary* world or intel route cannot be adopted merely because distant tail waypoints changed while the same unreachable first waypoint remains. Existing generic `usefulFullBodyRecoveryRoute` supplied this test for connectors, but the ordinary world/known-intel fallback previously did not consistently share it.

## Physical evidence is not hypothetical

`first-full-body-stride` means a real 0.3-unit body sweep has already run in the selector. `swept-local-detour` additionally checks the local candidate's whole starting step, including a frame-denial detour. `world-route-selected` / `known-intel-route-selected` mean the route-producing world/intel planner returned a candidate; these are **not** certified complete body-clearance routes. Every actual stride remains subject to real collision against current leaves/cover and the same squeeze/traversal rules.

The caller passes `RecoveryAdoptionProof` on the existing transient-route write only after an affirmative gate verdict. The R1 optional observer can now report five **real caller-supplied** proofs and contextual owner for migrated writers, rather than assuming unknown after seeing a route assignment. Ordinary gameplay still installs no observer; there is no per-frame diagnostic evaluation. The existing generated STACK/ENTRY, door hinge rehearsal, door escape, forced portal, narrow squeeze and fire retreat routes remain on their specialist authorities for R3/R4.

## Progress accounting

A successful policy verdict means only **provisional route adoption**. It does not reset `blockedTime`, `recoveryAttempts`, or any authored order. The existing motor calls `provisionalRouteAccepted` where it did before, without manufacturing movement.

The actor-scoped R2 witness records order ID, source, physical anchor, intended GO and adoption time. `ordinaryRecoveryProgress(actor)` reports `provisional` until the body has *actually* displaced at least 0.3 units, `foot-progress` after that physical movement, or `superseded` after a new authored order. It is evaluated only when requested; it never advances or cancels the motor. Older shared recurrence proof still checks goalward improvement and same-anchor reissues, so a transient backwards step is not by itself permission to churn indefinitely.

## Preserved invariants

- No authored GO edits, no silent skipping of a generated STACK/ENTRY/SYNC, and no route adoption is a physical arrival.
- No door penetration, false open-leaf clearance, relaxed full-body capsule, or squeeze-through-wall exception.
- Ordinary same-anchor world/intel/full-body/connector route changes cannot evade M2 cooldown by alternating source labels.
- A physical hinge traversal, outside-leaf waypoints, or actual passage reservation retains its specialist ownership.
- Nonordinary `lane-cycle-world` writers remain outside R2 because the same route source can represent generated STACK and door-specific recurrence; migrating them without context would be unsafe.
- Original R0 19-collision/11-route writer identities and R0 historical line anchors remain preserved; the R0 audit tracks R2-reviewed source line movements and 5-argument verified writes.

## Focused checks

    node scripts/verification/movement-recovery-r0-audit.mjs --check
    node --experimental-strip-types --test tests/movement-recovery-r2-ordinary-adoption.test.mjs
    node --experimental-strip-types --test tests/movement-recovery-r0-inventory.test.mjs tests/movement-recovery-r1-shadow-contract.test.mjs
    node --experimental-strip-types --test tests/movement-m2-recovery-ownership.test.mjs tests/release-d3-17b-route-recurrence.test.mjs tests/release-d3-18b-provisional-recovery.test.mjs
    node --experimental-strip-types --test tests/door-traversal-d2d3-four-operator.test.mjs
    npm run build

Additional authoritative PR gates and frozen physical cohorts must remain physically truthful. Prior D3.14D2/D3.17C 80/88 and 18/22 expectations are obsolete after correcting locked-door truths; the validated contemporary R0 floor was 75/88 physical arrivals and 16/22 complete squads on the historical 11-site cohort. These historic numbers do **not** excuse new physical regressions. Compare exact seeded results and never change a gate to hide a new outcome.

## Exit / release

R2 is acceptable only with its ordinary proof gate, R0/R1 preservation, no new physical/plan violations, targeted tests and primary CI green, and the last exact-build Pages release confirmed healthy. Merge a single coherent PR when safe; the ordinary main push launches Pages once. Check the post-merge workflow and served build stamp before declaring deployment successful.