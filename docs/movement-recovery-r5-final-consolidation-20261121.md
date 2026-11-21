# R5 — final shared recovery provenance and policy-bookkeeping consolidation

Date: November 21, 2026. Follows merged R0 source inventory, R1 typed shadow observer, R2 enforcing ordinary obstruction gate, R3 specialist door/STACK/squeeze gate and R4 exceptional acquisition gate.

## Audit: what was genuinely duplicated

The three gate families intentionally have different authority and clearance semantics. An ordinary first-stride detour must not overrule a generated STACK/door episode, an oriented narrow exit cannot be judged by a full-body sweep, and an empty initial-intel search is a valid negative acquisition (not an adopted path). **Do not collapse these distinct policies into one permissive status flag.**

What R5 can safely consolidate:

1. R2 ordinary and R3 specialist recovery each hand-built the same actor/order/door/blocked/retry/proposed-route data envelope, creating two maintenance points for one R1 verification contract.
2. R2 ordinary progress and R4 acquisition progress each allocated an actor-scoped WeakMap holding the same last adopted position, order identity, goal and timestamp. Both independently derived a 0.3-unit *real foot movement* threshold and superseded-order state, which could leave two mutually contradictory records for one actor.
3. R2, R3 and R4 each reimplemented finite-point and finite-waypoint validity checks.

## Implementation

`src/breach-recovery-adoption-shared.ts` is an intentionally small cross-stage core. It exports:

- `makeRecoveryProposal(actor,session,options)`: builds the exact live typed R1 envelope for enforcing R2/R3 gates, once, with actor/order/door/blocked state, original source/policy, proposed transient route, evidence and retry metadata; no order/route mutation, allocations beyond the one preflight object, or background observer.
- `finiteRecoveryPoint`, `finiteRecoveryRoute`, `recoveryDistance`: numerical predicates and distance calculation reused across R2–R4. Route emptiness is deliberately **not** a finiteness rule: empty acquisition, witnessed post-escape invalidation and ordinary recovery each require their own separate eligibility.
- `recordAdoptionWitness` / `readAdoptionWitness`: one private actor-keyed WeakMap storing the **latest** R2 ordinary or R4 acquisition event. No per-frame work or new gameplay state. Historical R2 and R4 API functions remain available as thin projections with their exact old outputs and status names.

`ordinaryRecoveryProgress(actor)` still returns the R2 structure `{source,status,traveled,remaining,adoptedAt}` with status `provisional`, `foot-progress` or `superseded`. `acquisitionProgress(actor)` still returns the R4 structure `{source,state,distance,selectedAt}` with `no-route`, `provisional`, `moved` or `superseded`. These only report for the most recent same-family adoption. A later negative initial query does not leave a stale 'successful' ordinary witness behind; a later real ordinary recovery supersedes a stale negative acquisition. Rejected proposals do not create events.

The shared witness records the **physical body position**, copies it and the goal at selection time, and records the original order ID. Only a real physical >=0.3-unit displacement counts as `moved`/ `foot-progress`. A negative route query remains `no-route` until a new route is selected; a new authored order is always `superseded`. No witness calls `provisionalRouteAccepted`, resets blockedTime, changes recoveryAttempts, claims an actual arrival, changes a door, or opens a portal.

## Deliberate exclusions

- Retain the R1 exhaustive `RECOVERY_SOURCE_POLICY` union, base reason codes, and opt-in shadow snapshots. Observational copies must remain snapshots, unlike enforcing live preflight data.
- Retain R2 per-family retry windows and `allowPhysicalRouteReissue` cross-source physical recurrence budget; do not erase it merely because another writer previously adopted.
- Retain R3 owner/certificate matrix, hinge episode and STACK/ENTRY/SYNC controls, narrow profile and actual post-leaf escape exception.
- Retain R4 legit `no-route` results, original known/intel route-finding and forced-door two-phase physical checks; the shared witness is diagnostic only.
- Retain the existing 60Hz motor, physical collision authority, player-authored orders and frozen tests.
- Do not make every R1 telemetry event drive a separate state machine or silently promote unresolved route-acquisition progress into physical clearance.

## Regression and acceptance

New `tests/movement-recovery-r5-shared-provenance.test.mjs` covers the exact R1 proposal envelope, finite route predicate, R2 physical-progress threshold and original metadata, same-actor alternating R2/R4 adoption, negative query precedence and authored order supersession, rejected proposals not mutating witnesses, R3 STACK priority, R0/R2/R3 frozen line audits, and 480-tick actual motor parity with the opt-in observer off/on.

Run the targeted family tests (R0–R5), original authored GO/order checks, generated door/STACK physical regressions, typecheck, production build and current source-owned primary CI and modern physical 88-/176-operator acceptance. Avoid duplicating Actions or weakening historical locked-door validation.

    node scripts/verification/movement-recovery-r0-audit.mjs --check
    node --experimental-strip-types --test tests/movement-recovery-r5-shared-provenance.test.mjs
    node --experimental-strip-types --test tests/movement-recovery-r0-inventory.test.mjs tests/movement-recovery-r1-shadow-contract.test.mjs tests/movement-recovery-r2-ordinary-adoption.test.mjs tests/movement-recovery-r3-specialist-adoption.test.mjs tests/movement-recovery-r4-acquisition.test.mjs
    npm run build

**R5 exit:** exact-head primary verification, architecture integration, focused D3, current physical truth and prior exact-build Pages release readiness pass. Squash-merge one coherent PR and let the existing main-only Pages workflow deploy once. Verify the public stamp against the merge commit. Known historical 76/88, 17/22 and D3.25 fresh22 154/176 movement-quality shortfalls must remain documented and visible; this R5 cleanup does not claim to repair those physical completion targets.
