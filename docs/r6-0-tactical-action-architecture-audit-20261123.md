# R6.0 — Tactical Action Architecture Audit and Consolidation Scope

**Date:** 2026-11-23
**Starting main:** 4c586d1b57986bb5282788b466793b88ca74c4ca
**Status:** Read-only architecture audit / executable source inventory / R6.1–R6.4 design handoff.

## 1. Goal, scope, and non-goals

Player-facing tactical actions traverse selection, authored planning, GO-time execution, physical contact/motor movement, world-effect commits, status/events, player notices, and recorded playback. The same action can be available in a palette, eligible for authoring, yet no longer physically executable at GO. These distinctions must be preserved.

R6.0 deliverables: (a) complete live PlanNode and interaction discriminant census; (b) named current owners for each stage of action execution and feedback; (c) annotated evidence of repeated rules, contact thresholds, command modality and out-of-band interactions; (d) R6.1–R6.4 proposals and regression gates; (e) repeatable read-only script and tests; (f) PR verification and safe merge checkpoint.

**R6.0 modifies no production runtime files.** No changes to fixed 60 Hz simulation, movement and collision, weapon/door physics, timers, animations, UI behavior, AI, visibility, inventory, save formats, replay semantics, or mission generation. This audit must not claim to fix interaction bugs.

## 2. Existing execution and ownership chain

| Step | Authoritative files / contracts | Preserve |
| --- | --- | --- |
| Palette and selection | src/ui/tactical-palette-controller.ts, src/breach-civilian-context-selection.ts, src/breach-medical-target-choices.ts | Read-only, player-visible eligibility |
| Command dispatch | src/breach-tactical-context-command.ts | Calls existing planners; does not own world |
| Temporary target arming | src/breach-tactical-interaction-state.ts | No competing PlanNode or session |
| Authored plan | src/breach-plan.ts, src/breach-plan-node-commands.ts, src/breach-plan-authoring.ts | Undoable intent is independent of transient motor routes |
| Planning authority | src/breach-game.ts and existing plan helpers | Reconcile known-world targets and edited final-point origins |
| Fixed-tick order dispatch | src/breach-order-executor.ts, src/breach-order-execution-port.ts | Single ordered 60 Hz path |
| GO handlers | src/breach-order-interactions.ts, breach-order-medical.ts, breach-order-entry.ts, breach-order-door.ts, breach-order-movement.ts, breach-order-utility.ts | Recheck real targets and permissions at GO |
| Actual physical position | src/breach-actor-motor.ts, src/breach-navigation.ts, src/breach-person-contact-standpoint.ts | Swept collision and reachable standpoints, never teleport |
| Order result | src/breach-order-lifecycle.ts, src/breach-order-outcome.ts | Failed/retired orders are not physically successful arrivals |
| Status and event facts | src/breach-execution-state.ts, src/breach-execution-events.ts | Truth scoped to actor and authored order, no hidden intel |
| User feedback | src/ui/execution-feedback.ts, src/ui/live-execution-presentation.ts, src/ui/tactical-hud-controller.ts | Derived notice, never simulation authority |
| Recorded history | src/breach-replay.ts and replay presentation | Immutable historical outcome and observed-only knowledge |

This is an authority inventory, not a call to merge every file. Packages A/B and movement recovery R0–R5 already established important single-owner contracts.

## 3. Complete PlanKind census (15)

- Entry: tool (breach-order-entry.ts).
- Medical/transport: recover-medical, evacuate, treat (breach-order-medical.ts).
- Movement and aim: move, look, pie (breach-order-movement.ts).
- Door: door (breach-order-door.ts).
- Utility: sync, reload, flash, switch-weapon (breach-order-utility.ts).
- Core dispatch and hold: wait, holdClear (breach-order-executor.ts and breach-order-wait.ts).
- Contextual objects and people: interact (breach-order-interactions.ts).

Do not put movement route generation, reload cadence, FLASH throw geometry, and spoken commands into one state machine merely because they are all PlanNodes.

## 4. Complete interaction census (17)

| Modality | Subtypes | Existing planner |
| --- | --- | --- |
| Voice: civilian | follow-civilian; stop-following-civilian | planCivilianInteraction |
| Voice: suspect | challenge-suspect | planSuspectChallenge |
| Voice: suspect escort | escort-suspect; stop-escorting-suspect | planSuspectEscort |
| Person physical contact | secure-civilian; restrain-civilian | planCivilianInteraction |
| Person physical contact | restrain-suspect; search-suspect | planSuspectRestraint / planSearchSuspect |
| Object physical contact | secure-firearm | planSecureDroppedFirearm |
| Object physical contact | push; open-window; close-window | planNearbyInteraction |
| Object physical contact | power-on; power-off | planSitePowerControl |
| Custody/transport release | release-civilian; release-capture-target | planCivilianRelease / planCaptureTransportRelease |

All 17 variants are consumed by the existing GO interaction handler. Classification describes **intended modality**, not shared eligibility or guaranteed success.

Related but separate interaction flows:
- Automatic optional intel collection in src/breach-optional-intel.ts is proximity/timing based, not a PlanNode.interaction variant.
- Door handling, entry tools, casualty transport and FLASH have distinct PlanKinds and authority.
- Temporary targeting controls are UI intent, not physical action progress.
- A drained order queue is not an arrival or an interaction outcome.

## 4A. Context-command and method census (additional entry surfaces)

The context dispatcher has **35 distinct command identifiers**, several of which change authored controls rather than emit an interaction PlanNode. All 35 are included in the executable R6.0 ledger:

- Civilian and suspect: ctxChallengeSuspect, ctxEscortSuspect, ctxFollowCivilian, ctxRestrainCivilian, ctxRestrainSuspect, ctxSearchSuspect, ctxSecureCivilian, ctxSecureFirearm, ctxStopEscortSuspect, ctxStopFollowingCivilian.
- Capture and civilian transport: ctxCarryCapture, ctxCarryCivilian, ctxDragCapture, ctxDragCivilian, ctxReleaseCapture, ctxReleaseCivilian.
- Doors and team entry: ctxOpen, ctxClose, ctxKick, ctxTool, ctxFormationCycle, ctxStackTeam, ctxSquadEntry, ctxResumeEntry, ctxResumeSquad.
- Weapon, movement policy and editing: ctxFire, ctxPace, ctxStance, ctxReload, ctxSwitchWeapon, ctxWait, ctxDelete.
- Other contextual world objects: ctxPower, ctxWindow, ctxTreat.

Dynamic variants such as ctxTreat:patientId, ctxPower:on/off:id and ctxTool:method share one command identifier with validated payload, not an unbounded list of independent commands. The palette also exposes ctxWatch through the established temporary facing/selection route; it is explicitly recorded as a **palette-only** identifier, not incorrectly counted as a 36th dispatcher branch.

The PlanNode schema additionally provides **four door methods** (open, close, kick, hold) and **six entry-tool methods** (pick, pry, cut, wedge, unwedge, breach). These are separate subtypes of door/tool orders and must not be mistaken for human interaction subtypes. R6.0 drift-checks both unions.

These inventories complete the currently known authored and contextual command surfaces; future commands must update the inventory intentionally instead of being silently absorbed by a generic handler.

## 5. Consolidation findings and candidate duplication

### 5.1 Range, obstruction and eligibility

Civilian person reach is used by authoring, GO execution and contextual selection. This is a shared named constant, but callers independently decide how to interpret line of sight, body obstruction, and terminal success. Voice variants now intentionally use larger conversational/audible range and **must not approach the target body**. The November 23 voice fixes are positive constraints, not bugs to reverse.

R6.1 opportunity: reusable **pure action assessment** with distinct modality, target eligibility, player-observed knowledge, GO-time live validation, range policy and structured denial. Do not let the UI ask omniscient questions about unseen suspects. Do not collapse voice commands into a motor-required contact action.

### 5.2 Standable positions and reach

The current personContactStandpoint produces candidate points beside a person. Suspect/civilian restraint both use it with local collision and occupancy predicates. Securing a dropped firearm has separate candidate-contact geometry; other objects use their own reach rules. Closely related logic exists, but the target shape and clearance envelope differ.

R6.2 opportunity: shared contact request and validated standpoints for target types, while the **existing** motor performs approach and swept body movement. The same action can be near enough by hand but unstandable at a body center. Check exact contact-range boundaries, doors, walls, other operators and dependent rescue posture before modifying ranges.

### 5.3 Timers and world-effect commit

Restraint timing, spoken commands, secure-firearm timing, medical treatment and door handling differ legitimately. A common lifecycle could expose request accepted, moving, in reach, working, completed or blocked, but each domain should continue to own its target-specific effects. Never make an editor/presentation callback consume inventory, update custody, or synthesize a physical arrival.

### 5.4 Order-result and notification reconciliation

The lifecycle, execution-status interpreter, sparse execution events, notice feed, and HUD each have part of a command outcome. Notices can become obsolete if an order was replaced, cancelled, completed or belongs to a prior session.

R6.3 opportunity: stable session/actor/order/attempt provenance and one invalidation rule. Preserve genuine negative outcomes as historical facts rather than hiding them. No notice text becomes GO-time simulation authority.

### 5.5 Protected existing architecture

Preserve stepSession and the fixed simulation phase order; createOrderExecutor and order execution port; Session-scoped world geometry; authored PlanNodes separate from temporary routes; the physical motor and its recovery contracts; typed temporary UI target state; operator pose-output owner; immutable replay and disclosure.

## 6. Downstream roadmap and implementation constraints

**R6.1 — Shared action assessment:** Introduce one small pure action-requirements interface, separating voice, person contact, object manipulation and release. Adopt one family at a time with negative and positive GO/authoring tests. Retain domain-specific rules and permission boundaries.

**R6.2 — Contact episodes and definitive completion:** Reuse verified approach standpoints and contact windows, with the existing motor and actual player-authored goal left untouched. Provide consistent action attempt statuses; domain-specific hooks still commit restraints, weapons, health or equipment only at actual GO. No new simulation clock or independent collision resolver.

**R6.3 — Outcome provenance and user feedback:** Reconcile observed order/attempt/mission state with warnings, target dots and contextual feedback. Cancel, complete, restart, new session and replay transitions must invalidate only obsolete notices; events remain truthful and replay-safe.

**R6.4 — Integration and selective subtraction:** Delete only proven obsolete adapters after a consumer and lab audit. Run exact seeded physical-motor, interaction, campaign, replay, UI and graphics smoke gates. Compare performance from identical sources and scenarios. Merge at a sparse release checkpoint.

## 7. Required future behavioral acceptance matrix

These are proposed gates for later behavioral PRs, **not** tests R6.0 claims to have run.

1. Civilian FOLLOW/STOP and suspect ESCORT/STOP succeed from unobstructed voice distance without near-body approach; obey targets that move between planning and GO.
2. Challenges respect observed enemy, cooldown, live viability and challenge-specific rules.
3. Suspect/civilian restraint from front, side, walls, nearby hinge and adjacent people, reaching a physically valid hand contact without blocking on the target body.
4. Suspect search, disarm and dropped-gun secure work from accessible nearby standpoints and reject genuinely inaccessible objects.
5. Medical treatment, supply recovery, casualty drag/carry/release keep their supplies, triage and actual transport requirements.
6. Locked and kicked doors, opposing hinges, tools, PUSH, windows and power controls preserve side and contact constraints.
7. FLASH, LOOK/WATCH, WAIT, movement, STACK/SYNC, secondary draw/reload and automatic intel are not inadvertently re-timed or reclassified.
8. Failed → recovered, cancelled, edited and reissued orders never leave stale UI feedback or false executed/arrived credit.
9. Consecutive generated missions, replay seek, Campaign deployment and restart have no cross-session action, notice or hidden-intel leakage.
10. Existing deterministic 60 Hz order outcomes, replay evidence, save formats and physical-arrival baselines remain accounted for. Never weaken historical movement gates to make a refactor pass.

## 8. R6.0 verification and release policy

Files introduced:
- scripts/verification/r6-0-tactical-action-audit.mjs: read-only source inventory, modality and boundary ledger, policy-reference candidates, discriminator drift gate, optional JSON report.
- tests/r6-0-tactical-action-audit.test.mjs: parser, completeness, authority, modality and fail-closed checks.
- This document: comprehensive scope, ownership and downstream handoff.

Commands to run in CI:

    node scripts/verification/r6-0-tactical-action-audit.mjs --check
    node --experimental-strip-types --test tests/r6-0-tactical-action-audit.test.mjs
    npm run build

The existing changed-file test selector can run the newly added test directly. Do not introduce another overlapping GitHub workflow. Completion requires exact-head green checks, a healthy preceding public Pages release and a verified Pages build at the eventual merge SHA. Browser CI does not demonstrate real iPhone Safari GPU, thermals or visual sign-off.

## 9. Definition of done

- Exactly all 15 live PlanKinds, 17 interaction variants, 35 contextual command identifiers, four door methods and six tool methods inventoried, with no unknown subtype silently ignored.
- Every source authority stage and known out-of-band action identified, without creating new runtime owners.
- Repeated rules labeled as **candidates**, not proven bugs; distinct voice and physical-contact behavior explicitly protected.
- Follow-up R6.1–R6.4 contracts, risks and test matrix written.
- Audit and source tests pass on the exact PR branch; no runtime code touched.
- PR merged only when integration and deployment gates are met.

R6.0 is the architectural audit and scope checkpoint. New action execution or UI state logic belongs to later stages.
