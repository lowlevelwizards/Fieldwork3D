# R6.2 — Physical Contact Episodes and Definitive Completion

Baseline: main 23108616661e1ca780223a03355528bbab7cdbbd, 2026-11-23. Depends on R6.0 action census and R6.1 pure information-bounded assessment.

## 1. Goals and complete scope

Create one deterministic physical-contact episode selector for all existing in-person restraint/secure, suspect search and dropped-firearm secure GO orders, and one pure contact-time progress function. The current domain handler retains authority over eligibility, GO-time live target reads, effects, success/failure and actual fixed 60Hz order retirement. The current motor exclusively owns the physical approach. No new Session, PlanNode, replay fields, geometry owner, animation controller, or tick clock.

Present risk: RESTRAIN SUSPECT and SECURE/RESTRAIN CIVILIAN use separate copies of a seven-angle 39-unit stand-off calculation and GO-time hand range. SEARCH SUSPECT approaches the suspect's occupied body center when outside the 28-unit hand reach, risking stalls. SECURE FIREARM has a separate five-angle 25-unit stand-off, with incomplete occupied-civilian and full-body swept approach checks. All have distinct existing reach, eligibility, timers and effects.

## 2. Action matrix

| Family | GO hand reach | Conditional staging band | Real standpoint | Effect |
| --- | --- | --- | --- | --- |
| RESTRAIN SUSPECT | 42 | >42 to <=45 | Seven-angle at 39, world passable and full-body swept | Existing universal contact duration; custody only after real GO |
| SECURE/RESTRAIN CIVILIAN | 42 | >42 to <=45 | Seven-angle at 39, occupancy and swept | SECURE after facing, RESTRAIN after universal contact duration |
| SEARCH SUSPECT | 28 | >28 to <=45 | Side stand-off at 25 instead of occupied target center | Existing 0.9s; genuine restrained/surrendered unsearched target |
| SECURE FIREARM | 34 | >34 to <=58 | Five-angle at 25, full-body swept and other-actor clearance | Existing 0.75s; loose item marked secured once |

Stage bounds are not an implicit permission to move through obstacles. For every candidate: actual actor position, authored target anchor when currently required, visible/known live target, clear hand-contact lane, world passability, physical sweep from actor to candidate, and live actor/civilian occupant gap. A candidate is an approach request; never a fake arrival. If none is valid, preserve current failure behavior, do not teleport or silently finish.

## 3. Pure contract

New src/breach-physical-contact-episode.ts accepts facts supplied by existing GO owner: actor point, target point, planned anchor, actual reach radius and staging allowance, optional anchor tolerance, observation/clearance, candidate stand-off radius, ordered angular alternatives and a pure callback for candidate physical validity. Returns one explicit outcome: ready (physically already in hand range), approach (proposed standable position, motor must still traverse), blocked (no legal contact). It cannot read Session or world or call the motor; pure deterministic geometry only.

Second helper accepts existing elapsed timer, real fixed-step dt and existing action duration, returns new elapsed and whether complete. No independent clock, no state persistence. The authoritative handler still checks actual target validity, real reach and obstruction, faces the person, increments actionTimer, executes the domain-specific effect and calls completeOrder exactly once. The existing beginOrder/failCurrentOrder reset contract stays authoritative.

## 4. Protected architecture

- Preserve all R6.1 authoring/context/GO assessments; they remain information-bounded and domain-specific.
- Voice FOLLOW/STOP/CHALLENGE/ESCORT never enters the physical-contact selector; no unnecessary near-target motor route.
- General PUSH/WINDOW/POWER, door tools, FLASH, medical TREAT, casualty transport, release and automatic intel remain specialized existing owners.
- Preserve existing real actor motor, collision/swept navigation, route provenance, 60Hz tick and fail/complete history, pose system, replay, fog disclosure and save formats.
- Avoid changing contact radii or timings; change only the occupied-center approach for SEARCH and physical validity checks on firearm candidate staging.

## 5. Implementation plan

Stage A: pure contact episode and time-sampler functions plus boundary, candidate order, blocked, finite-data, timer and no-side-effect tests.
Stage B: adopt in suspect restraint and civilian SECURE/RESTRAIN, preserving <=45 conditional staging and all existing actor/target eligibility.
Stage C: adopt in suspect SEARCH and SECURE FIREARM with standable side goals, full body sweep, occupancy checks; keep real motor only.
Stage D: use pure timer sampler for suspect/civilian restraint, 0.9s search and 0.75s firearm; keep domain effects and exactly-once lifecycle.
Stage E: real fixed-step seeded positive and blocked target tests, existing D15/civilian/voice/replay and physical-movement gates, production build and exact-head CI. Reconcile non-overlapping concurrent main updates and merge only safe/clear; verify live Pages build stamp for exact merged commit.

## 6. Explicit acceptance

1. Exactly boundary conditions for hand reach 42/28/34 and staging cutoff 45/58; no nonfinite or negative accepted geometry or timers.
2. Restraint and secure happen only against real eligible living target, when the contact lane is clear, physically within reach and face-turn complete.
3. SEARCH from just outside 28 uses an unoccupied side stance rather than body center; truly obstructed/occupied candidates fail honestly.
4. Loose firearm adjacent to standing person is secured from a physically standable hand reach; no actor/body collision or duplicate item effects.
5. Contact timer progresses only while real GO hand reach and target validity persist. Cancelled order cannot complete later; failure accounting unchanged.
6. Voice commands still work from their original ranges and never require body approach; no changed medical, door, flash or optional-intel execution.
7. All focused unit/GO tests, preserved historical fixed-step movement gates, replay, TypeScript/build, architecture CI and exact-build Pages release pass.

## 7. Exit criteria

One source-owned contact episode, one pure timer rule, all targeted physical actions migrated, real GO contact and negative regressions accepted, no new clock/motor, exact-head CI green, PR cleanly merged, and public Pages served build verified against merged main SHA. Browser CI is not a claim of improved FPS or real device testing.
