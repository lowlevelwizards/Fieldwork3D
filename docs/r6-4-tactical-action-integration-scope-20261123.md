# R6.4 — Tactical Action Integration and Selective Subtraction

Date: 2026-11-23. Baseline: `main` 8955eaaaf74898192302f1dfffc4d0c5b8afb70c. Prerequisites: merged R6.0 inventory, R6.1 action assessor, R6.2 physical contact episodes, and R6.3 session-bound outcome presentation.

## 1. Objective and authority boundary

Close the R6 tactical action architecture series without a new gameplay feature or a second simulation owner. Prove that selection -> authoring -> GO-time eligibility -> real 60 Hz motor/hand contact -> domain-owned world effect -> completed/failed PlanNode -> observed event -> transient HUD feedback has no contradictory leftover implementation. Delete an adapter only after verifying all production, tests, labs and imports. Keep action assessment pure, physical stance selection pure, interaction GO handlers authoritative, and feedback presentation-only.

The existing 15 PlanKinds, 17 interaction variants, 35 contextual commands, four door methods and six tool methods stay unchanged. Preserve movement R0–R5, D3.16B exact current-main per-actor parity, real swept clearance, actual-authored GO rather than raw pre-authoring candidates, replay archive and knowledge, per-session fog, the single Game/Session/actor motor and fixed-step simulation phase order.

## 2. Candidate and consumer audit

The former `personContactStandpoint(from,target,valid)` thin wrapper is no longer imported by production sources. `src/breach-physical-contact-episode.ts` is the production owner of `contactStandpointAtRadius`, with per-action reach and offsets. Remaining imports of the wrapper are limited to `tests/contact-medical-choice-20261122.test.mjs` and `tests/r6-2-physical-contact-policy.test.mjs`. R6.4 will remove that wrapper and migrate these tests to the explicit underlying geometry API and the same constants. This is a source-contract cleanup, **not** a new contact policy.

Retain `contactStandpointAtRadius` and `PERSON_CONTACT_REACH/STANDOFF/OFFSETS`: production contact policy consumes them. Retain `assessTacticalAction`: selection, authoring and GO handlers consume it. Retain `ExecutionNoticeFeed`, `locateNoticeOrder`, `liveNoticeEligible` and existing HUD compatibility: all have active presentation consumers. Retain domain-specific door, voice, medical, push/window/power, FLASH, optional-intel and casualty transport handlers. No dead adapter inferred solely from a similar filename.

## 3. Implementation

A. Freeze this scope and explicit candidate evidence. Do not edit main directly.

B. Delete only `personContactStandpoint`; update its two test callers to `contactStandpointAtRadius` with explicit R6.2 constants. Reconcile the R6.0 fail-closed inventory boundary and cross-layer reuse ledger to the actual radius-aware geometry function (the first PR CI run correctly detected the stale pre-R6.2 adapter reference). Keep the seven-offset deterministic ordering, 39-unit person standoff, side clearance and blocked outcomes. Assert the wrapper stays absent so it cannot silently reappear.

C. Add an integration acceptance test using a real `newSession`, `toggling` and `stepSession` at 60 Hz. Verify voice escort without approach and hand-contact restraint with movement/elapsed-time/physical spacing; then a genuinely failed order with no fabricated completion, immutable execution facts, a current typed warning, retired-warning invalidation and a second Session that cannot reuse the prior notice even with reused actor/order IDs. No mock executor or fake motor completion.

D. Include R6.0–R6.3 executable source inventory, action assessment, real GO, physical policy/contact, live feedback and the new integration regression in the existing architecture critical suite. Do not add another workflow or duplicate simulator. Keep the architecture, movement/door, fog, replay and historical physical gates unchanged.

E. Run the exact branch's focused Node tests, R6.0 drift audit, TypeScript/build, curated architecture suite, selected campaign/replay/movement/door regressions and CI. Review the changed-file manifest against baseline for zero unplanned runtime modifications. Compare any performance evidence only on identical hardware, source revisions and seeded sites; because this is test-only subtraction of a non-consumed wrapper, **do not claim an FPS or simulation-speed gain** without comparative measurement.

F. Reconcile main before merging. Do not merge while previous Pages production publishing is incomplete, or while any required CI job is failing/pending. Require an exact-head merge and a successful Pages job that checks public `fieldwork-build.json` against the merged revision.

## 4. Acceptance matrix

1. 15 PlanKinds, 17 interaction variants, 35 contextual command identifiers and door/tool method inventories still pass the R6.0 fail-closed drift check.
2. R6.1 selection/authoring/GO remain observed-only, with voice commands distinct from hand contact and timed custody.
3. R6.2 person restraint/search and dropped firearm contact still use the one 60 Hz motor, full body swept stance checks, real hand reach and actual domain-owned effects; no remote contact or false-arrived orders.
4. R6.3 current-order provenance, recent terminal failure, session reset and click-time locator validation remain intact; no old narrative warning is resurrected.
5. Existing tests for voice FOLLOW/STOP, suspect ESCORT/STOP, challenge, real SEARCH/RESTRAIN/SECURE, doors, windows, power, FLASH, medical care, casualty carry/release, automatic intel, playback and campaign remain selected or covered by their existing specialist gates. Do not reimplement those domains in R6.4.
6. Fixed-tick completion, movement arrival/cancellation truth, replay/knowledge and fog are unchanged. The D3.16B corrected authored-goal baseline is not weakened; legacy historical movement debt remains visible.
7. Absent source adapter has zero production consumers, every migrated test still asserts its prior geometry behavior, TypeScript/build and CI pass, and no new runtime allocations/loops/owners are introduced.
8. R6.4 branch is reconciled, PR merged only if safe, Pages deployment completes and publicly serves its exact merged build stamp.

## 5. Rollback and release

This is deliberately narrow: one removed test-only compatibility wrapper, two updated callers, one cross-stage regression suite, and an explicit existing-suite selection. If any test exposes a true behavior conflict, fix it in its existing authoritative owner with an independent failing witness rather than broadening this cleanup to motor/collision/fog changes. Revert the R6.4 commit/PR to roll back the subtraction; no save migration, world conversion or replay schema change is necessary.

Definition of done: no obsolete R6.2 public wrapper left, no weakened legacy gates, repeatable cross-stage acceptance on exact HEAD, clean required CI, main reconciliation, merged PR and verified public Pages stamp.
