# R3 — Specialist movement recovery and physical ownership

Date: 2026-11-21. Continues merged R0 inventory, R1 advisory proposal contract, R2 ordinary route adoption. R3 is an enforcing preflight for specialist door, generated STACK and squeeze routes; it is NOT a second movement, collision or door controller.

## Authoritative responsibilities

The 60 Hz motor remains the only owner of physical footsteps, hinge contact and collision. The existing door maneuver, STACK/SYNC/ENTRY coordination, oriented squeeze, physical overlap-escape, local world sweeps, WATCH and retry/recurrence claims still run in their existing selectors. The new specialist adoption gate receives only routes that were already selected by these real checks. It evaluates original order identity, legal route source, compatible owner, correctly typed clearance evidence, finite geometry, retry and recurrence claims, and a route that is useful without implying physical progress.

## Migrated specialists

| File | Route writer classes |
|---|---|
| src/breach-door-traversal-maneuver.ts | Door short-entry, rehearsal local/world/waypoint join, joined portal handoff, one-per-episode approach drift |
| src/breach-motor-collision.ts | Generated STACK fine-world and micro-corner, cycle lane owned by door OR STACK, swept post-escape rejoin, genuine empty-route invalidation after moving the body, hinge relief, stable leaf rejoin, oriented ENTRY squeeze |
| src/breach-motor-route.ts | Stable post-escape leaf route, future operable-door prefix, bounded narrow leaf exit, original GO-preserving world/local portal rejoin |

The R1 source 'lane-cycle-world' has TWO real uses: owner door-episode (priority 4) and owner generated-stack (priority 3). R3 passes a contextual source-policy override to the optional R1 shadow witness without rewriting global source definitions or treating a generated STACK waypoint as ordinary world routing.

## Preserved exceptional rules

- A door-managed prefix need not end at the distant authored GO. It only approaches the next real operable door and all physical crossing remains under the motor.
- Narrow-profile routes require the actual oriented squeeze state and selector sweep. They are NEVER generalized collision exemptions or full-body certifications.
- A genuinely empty door-leaf-escape route is permitted ONLY when physical body relocation has already occurred. It invalidates stale nav; it never completes any order.
- No generated STACK/SYNC/ENTRY PlanNode is skipped, replaced, or declared done by adoption. Door phases, maneuver retry counters, physical hinge state and passage reservation remain specialist-owned.
- Preflight does not clear blockedTime or recoveryAttempts; physical feet and threshold travel establish real progress.
- Initial route acquisition, fire retreat, shove staging, forced-door shortcut, first operable-door acquisition, and ordinary cold probe families stay on their existing controllers for R4. Ordinary full-body lanes and generic collision replans remain on R2.

## Acceptance

Focused unit tests in tests/movement-recovery-r3-specialist-adoption.test.mjs verify source-owner compatibility, R1 source-context evidence, generated STACK versus door precedence, narrow and prefix exceptions, witnessed physical escape invalidation, stale order and malformed routes, plus 480-tick real motor parity with the shadow observer off/on. The R0 exact source census must still report 30 motor/route and 36 total sites and must retain historical R0 and R2 line anchors.

Commands:

    node scripts/verification/movement-recovery-r0-audit.mjs --check
    node --experimental-strip-types --test tests/movement-recovery-r3-specialist-adoption.test.mjs
    node --experimental-strip-types --test tests/movement-recovery-r2-ordinary-adoption.test.mjs tests/movement-recovery-r1-shadow-contract.test.mjs tests/movement-recovery-r0-inventory.test.mjs
    node --experimental-strip-types --test tests/door-traversal-d2d3-four-operator.test.mjs tests/release-d3-28-entry-loop.test.mjs
    npm run build

Modern 88-/176-body physical truth, generated STACK loops and the four outward/inward door variants must be checked in the repository's existing source-owned release gates; do not introduce a new queue of expensive redundant Actions. Historic 80/88 and 18/22 assertions that incorrectly require crossing locked leaves remain known stale gates, not evidence of a new geometry failure. Never mask true pending physical failures or falsely credit cancelled orders as arrivals.

## Release guard

Commit on the R3 branch and merge only if the exact head passes primary CI, architecture and modern physical gate; previous main Pages publish must be completed, successful and serving its exact build. Let one ordinary main merge trigger deployment once; verify the resulting public build stamp and workflow completion before calling it live.
