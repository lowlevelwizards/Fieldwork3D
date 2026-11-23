# R6.1 — Pure Tactical Action Assessment and Incremental Adoption

Date: 2026-11-23. Starting deployed main: b081a27ef6b162384fa9de68cff34fa0ee984bad.
Scope: one purely evaluative interaction requirement contract, and its safe adoption in existing planning, contextual-selection, and GO-time decision paths. This is the **R6.1** architecture implementation; R6.2 owns physical contact episodes, R6.3 owns notice provenance, R6.4 owns final consolidation.

## 1. Objectives

R6.0 inventoried 15 authored PlanKinds, 17 interaction subtypes, 35 contextual control identifiers, four door methods, six tool methods, and automatic proximity intelligence. It identified different callers reinterpreting voice/contact and visibility/physical reach independently. R6.1 builds one action *assessment* interface, not an action executor.

Deliver:
1. A pure, deterministic, complete typed registry mapping the 17 PlanNode.interaction values to the existing categories voice, person-contact, object-contact, release. A new subtype must fail TypeScript exhaustiveness.
2. A total, side-effect-free result from explicitly supplied facts: action, phase (selection, authoring, GO), actor/target availability, domain eligibility, range, disclosure requirement, and physical lane availability. Denials use stable machine-readable reasons; no UI strings or world mutations.
3. Distinct domain-specific reach limits. Existing constants and behavior remain authoritative; the assessor must not invent a global interaction distance. Voice never requests hand contact or movement. Custody release does not get a synthetic spatial requirement.
4. All existing world and actor state reads remain with domain callers, including the contextual palette's known-only rules and GO handler's live physical collision checks. The assessor may not import Session, world, camera, rendering, replay, door, collision, voice LOS or AI state.
5. Incremental adoption first for spoken civilian FOLLOW/STOP and suspect CHALLENGE/ESCORT/STOP, then person contact civilian SECURE/RESTRAIN and suspect RESTRAIN/SEARCH, then loose-weapon SECURE. Preserve existing raw geometry calls (sweptBodyClear), state checks, specific stage timing, reach boundary and user-visible notices. Object manipulation/door/power, release, medical and auto-intel retain domain-specific execution in this stage; all 17 still have authoritative registry classifications.
6. Targeted pure unit tests and real GO-time simulation acceptance for both passing and failing voice/contact cases; source/contract checks proving the new evaluation module has no competing simulation or movement state and that referenced production paths actually use it.
7. Merge only after exact-head primary CI, targeted interaction regressions, production TypeScript/build, prior public served build readiness and no concurrent deployment. Confirm post-merge exact served Pages SHA.

## 2. Architecture and input/output

The proposed module is src/breach-action-assessment.ts. It takes structured facts *already witnessed or physically assessed by its caller* and emits a simple verdict. It does not acquire world data.

Inputs:
- interaction: an explicit current PlanNode interaction discriminator
- phase: selection | authoring | go
- actorAvailable, targetAvailable, domainEligible (distinct failure reasons)
- observed / requireObserved: caller-specified epistemic gate; never reads hidden actors
- range / maxRange for actions whose domain requires proximity; validate finite nonnegative values
- unobstructed / requireClearPath: swept legality computed using the caller's existing real Session and collision radius

Outputs: allowed, modality, needsContact, failureReason. Failure priority is stable: invalid actor, missing target, ineligible domain state, undisclosed target, unavailable range, out-of-range, blocked physical lane. Result does not imply a success, arrival, or outcome event. Evaluating a target at planning does NOT certify its future GO viability.

Registry categories:
- voice: follow-civilian, stop-following-civilian, challenge-suspect, escort-suspect, stop-escorting-suspect
- person-contact: secure-civilian, restrain-civilian, restrain-suspect, search-suspect
- object-contact: push, open-window, close-window, secure-firearm, power-on, power-off
- release: release-civilian, release-capture-target.

A tagged classification is intentionally not a generic action engine. GO authority remains createInteractionOrderHandler, state mutation remains existing domain branches, actual movement remains advanceActorMotor, and a typed target model cannot bypass LOS, unknown-room disclosure, or swept clearance.

## 3. Adoption boundaries and regression risks

| Family | Planning and context | GO-time | Protected behavior |
| --- | --- | --- | --- |
| Civilian voice | planCivilianInteraction, nearestContextCivilian | breach-order-interactions | 150-unit unobstructed command, already-escorted/STOP exception, speech priority before queued route |
| Suspect voice | planSuspectChallenge, planSuspectEscort, tactical-context-command | breach-order-interactions | 100-unit challenge and 150-unit escort, observation policy, refusal/cooldown, no approach/teleport |
| Person contact | planCivilianInteraction, planSuspectRestraint, planSearchSuspect, civilian context and GO | breach-order-interactions | actual 42/28-unit hand reach, reach only after physical motor, stance selection unchanged, restraint/search timers unchanged |
| Loose firearm | planSecureDroppedFirearm, context | breach-order-interactions | known loose target, 58-unit authoring/approach, 34-unit GO hand reach, real standable side approach |
| Other objects | existing power, windows, props | existing handlers | No R6.1 changes to specialized object geometry or timed commits |
| Release | planCivilianRelease, planCaptureTransportRelease | existing handlers | Custody ownership and transport, no fake range checks |
| Medical, doors, intel | existing independent PlanKinds / automatic collector | existing handlers | Outside shared interaction assessor until a measured later stage |

**Ordering:** The GO executor's existing "contactCommand" bypass of arrival at n.p is intentionally preserved, as is the R0–R5 recovery contract. The assessor cannot cancel a partly completed episode, displace a target, or retime an action. For near-but-not-yet-reachable cases, existing approach remains the only movement provider (until R6.2). Explicit domain eligibility remains alongside the assessor until separately proven equivalent; a shared verdict must never silently relax specialized constraints.

## 4. Test/verification plan

- Exact 17/17 registry coverage against PlanNode discriminants, disjoint category map, known and release-only classification, no unrecognized action.
- Pure assessment boundary values: zero, exact reach, beyond reach, missing/NaN/negative range, physical obstruction and disclosure requirement. Stable failure priority. Voice has no hand-contact requirement, release does not require a location or clearance.
- Selection versus GO: same interface, caller-specific observation and availability. GO never trusts a previously accepted planning verdict.
- Multi-actor and sequence tests using actual existing Session, planner and 60-Hz stepSession: prequeued MOVE plus within-earshot FOLLOW/ESCORT executes voice before movement, out-of-earshot and blocked tests fail or wait honestly; known / not known authoring remains gated; restrain and gun pickup remain physical, with no body-center teleport.
- Historical focused regressions: follow-voice-pose-continuity, civilian-voice-escort-controls, dispatch-d15-suspect-escort-go, dispatch-d15-suspect-restraint, dispatch-d15-weapon-security, civilian-c4-contextual-contact, eqa3-10-restrain, r6-0 inventory, relevant context target selection tests.
- Build/npm typecheck, source-selected CI and real environment checks. If CI skips a specialist suite, document it rather than claiming it ran.
- Preserved 60 Hz, real motor, physical non-arrivals not masked, replay knowledge and source ownership. Browser/CI does not prove real iPhone frame pacing.

## 5. Completion and rollout

Stage A: freeze unchanged behavior with pure registry+assessment and evidence tests.
Stage B: replace duplicated spatial/visibility decisions in authoring and context selection, one family at a time.
Stage C: use the same pure contract in GO-time voice, person-contact and loose-weapon branches, with domain effects and animation untouched.
Stage D: verify current-main parity and cross-system checks, then safe merge and exact Pages serving verification.

Exit only with the final branch SHA green and a verified post-merge deployed artifact; otherwise keep the PR unmerged and report the blocker. R6.2 (standpoint contact episodes), R6.3 (feedback/notice provenance) and R6.4 (selective deletion) remain separately scoped.
