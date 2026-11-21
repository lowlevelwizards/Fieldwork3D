# Movement recovery consolidation — R0 baseline

Date: 2026-11-21  
Source baseline: fe2489f3a430aa170478bb4cb2d7b412961ccb1e (main before R0)  
Scope: read-only inventory and test guard, **no runtime movement changes**.

## Architecture to preserve

The fixed-tick coordinator in **src/breach-actor-motor.ts** remains authoritative over traversal, route preparation, passage, door handling, and collision. **src/breach-motor-collision.ts** owns actual physical response; **src/breach-motor-route.ts** owns disposable route acquisition and retries. **src/breach-route-transition.ts** records transient route assignments, not authored-order changes. Door manoeuvre, queue and passage reservations retain their own physical and sequencing authority.

**Do not** add a second motor or treat a proposed route as physical progress. The current provisional-route operation clears a retry timestamp without clearing blocked duration or failed attempts. A later recovery policy must preserve this distinction.

## Frozen writer census

**19** callers in collision + **11** in route = **30 core call sites**; **4** more in door traversal, **1** generated entry settle, **1** passage observer = **36 total tracked call sites**.

| Source | Calls | Categories |
| --- | ---: | --- |
| src/breach-motor-collision.ts | 19 | Local/full-body detours, cold fine-grid, repeated STACK loops, leaf escape, squeeze departures, world/intel replans |
| src/breach-motor-route.ts | 11 | Initial acquisition, portal/leaf joins, forced-door shortcut, fire retreat, shove stage |
| src/breach-door-traversal-maneuver.ts | 4 | Door short-entry, rehearsal and drift |
| src/breach-order-movement.ts | 1 | Generated entry settle |
| src/breach-motor-passage.ts | 1 observer | Passage retreat: source-tag witness immediately followed by real in-place prepend |

These are not all equivalent **recovery proposals**. There is also an intentional empty-route invalidation after a real physical door-overlap escape, and a separate in-place nav clear during pie-order progression. The transition helper implementations themselves are excluded from caller counts. R1 should explicitly distinguish ordinary obstruction recovery from initial route acquisition, authored movement sequencing, fire retreat, hinge overlap escape, and passage retreat.

Each call in **scripts/verification/movement-recovery-r0-audit.mjs** has a frozen line/source label, writer API, existing eligibility selector, physical evidence descriptor, and review profile describing precedence, cooldown, and required real-world progress. These are observational annotations, **not certification** that all strategies already implement a common contract.

Run the ledger:

    node scripts/verification/movement-recovery-r0-audit.mjs --check
    node scripts/verification/movement-recovery-r0-audit.mjs --json

The audit compares all call sites against the frozen source snapshot and errors on added, removed, reordered, moved, or relabeled writers. It uses source text only, without importing or running the motor. The JSON output includes source hashes and the frozen acceptance-scenario paths.

## Known architectural hazards for the next stages

- **Independent eligibility and ownership.** Specialized cold claims, door manoeuvre ownership, fine-route ownership, entry/stack claims, squeeze geometry, and passage reservations live in different modules. A shared adoption policy must not cancel specialist protections.
- **Uneven physical clearance evidence.** Some cold routes verify every 0.3-unit motor stride, some verify a first step or swept approach, and some deliberately stop at the next real operable door. Do not reject a legal portal prefix for failing to end at a remote GO, or allow an unswept future segment through a closed leaf.
- **Mixed cooldown / recurrence accounting.** Retry timestamps, stationary probe witnesses, per-goal claims and cross-source recurrence each have roles. Ordinary stalled routes already share an M2 recurrence family; generated STACK and ENTRY are intentionally distinct.
- **Backward oscillation.** Temporary reverse movement may be physically necessary to clear a door, but repeated returns to the same anchor without threshold or GO advancement cannot be counted as progress.
- **Exceptional mutation.** The empty transient route after a physical escape, the in-place passage prepend, and an initial route assignment are not the same kind of adoption and must not be transformed blindly.

## Frozen representative regression suites

| Scenario | Existing suite | Expected outcome |
| --- | --- | --- |
| Four-person inward/outward swing | tests/door-traversal-d2d3-four-operator.test.mjs | All four pass and finish each swing variant; no hinge ping-pong |
| Stationary route recurrence | tests/release-d3-17b-route-recurrence.test.mjs | Identical near-anchor routes cap; new plan/door/progress resets |
| Ordinary recovery ownership | tests/movement-m2-recovery-ownership.test.mjs | Reject different tail behind same blocked first leg; share ordinary recurrence |
| Cold retry and geometry wake | tests/release-d3-17e-recovery-accounting.test.mjs | Bounded initial probes; periodic re-probe on persistent blockage |
| Provisional route progress | tests/release-d3-18b-provisional-recovery.test.mjs | Route assignment does not erase failure evidence |
| Generated STACK cycle | tests/release-d3-28-entry-loop.test.mjs | Cross-source loop evidence before cold alternate full-body path |
| Door route provenance | tests/release-d3-11c-route-handoff.test.mjs | Transient source observer works; authored plan unchanged |
| Furniture physical departure | tests/release-d3-17c-physical-departure.test.mjs | Recovery eligibility and full-body departure verified |

Historical diagnostic witnesses to retain for future live-motor comparison: **Motel 31149** (furniture corner oscillation), **Apartment 19036595** (coarse first-leg false clearance), **Garage 19089932** (fully open leaf near STACK), and **D3.28** (cross-source generated STACK loop). These are historically reported incidents, **not new claims that current main still fails**.

The prior movement reliability release document reports historical results of 75/88 real operator arrivals, 16/22 four-person completions and 13 locked-door terminal non-arrivals in its 11-site baseline. Those numbers are NOT fresh R0 observations; locked-door preservation must not be misreported as a motor regression or bypassed by fake clearance. Preserve the seeded 11-site and independent 22-map corpora for later before/after testing.

## Focused verification

    node --experimental-strip-types --test tests/movement-recovery-r0-inventory.test.mjs
    node --experimental-strip-types --test \
      tests/door-traversal-d2d3-four-operator.test.mjs \
      tests/release-d3-17b-route-recurrence.test.mjs \
      tests/movement-m2-recovery-ownership.test.mjs \
      tests/release-d3-17e-recovery-accounting.test.mjs \
      tests/release-d3-18b-provisional-recovery.test.mjs \
      tests/release-d3-28-entry-loop.test.mjs \
      tests/release-d3-11c-route-handoff.test.mjs \
      tests/release-d3-17c-physical-departure.test.mjs

R0 is accepted only with the 36-site ledger matching source, the eight scenario files present, motor and transition ownership intact, and no gameplay code changes. Future R1–R5 work must compare the same seeds, build horizon, physical outcomes and route observer telemetry, not merely raw new-route counts.

**Release discipline:** commit and validate on the R0 branch; do not merge while a previous Pages release is failed, pending, or unverifiable. Confirm required checks and public exact-build stamp before any new main deployment; a failed previous deploy is a blocker, not permission to queue another.
