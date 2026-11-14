# D2.0 — Source-verified combat and physicality architecture audit

**Audit baseline:** main 990c0b35c19ed2850a76d2827c98d5bc596342cc (D1 deployed and public Pages build verified).  
**Scope:** source inventory of 740 top-level src entries, 1,000 top-level test entries, 250 top-level documentation entries, 112 top-level scripts, and 89 existing workflows; targeted reading of the live tactical simulation, firing, awareness, movement/pose, contact, 3D renderer and previous A3/Package B/D0 evidence. These counts are *directory entries*, not an exhaustive symbol-by-symbol audit of every file or nested folder.
**Output:** evidence-based ownership map, source-specific opportunities, risks, ordered D2.1–D2.6 release plans and acceptance contracts. No gameplay code is modified in D2.0.

## 1. Current ownership — do not rebuild this

| Concern | Current authority and evidence | Decision |
| --- | --- | --- |
| Fixed-step lifecycle | breach-runtime-loop.ts fixed tick; breach-simulation-phases.ts lines 56–118 single ordered doors → visual awareness → actor intent → civilian/motion → contacts → report/observe → fire | KEEP one 60Hz clock and bounded catchup. Never move recognition/shot authorization into render RAF. |
| Player orders and movement | breach-order-executor.ts runOrders, breach-order-movement.ts and breach-actor-motor.ts, with real geometry and breach-movement-authority.ts | KEEP authored WATCH/WAIT/pace/position and actual swept collision. Recovery may propose but not teleport. |
| Personal visual evidence | breach-game.ts lines 1260–1293 geometricallyVisible/inSight/personDetected; breach-visual-acquisition.ts; breach-visual-perception.ts | KEEP geometric silhouette, detected/unidentified presence, confirmed identification as separate stages. |
| LOS query memoization | breach-perception-cache.ts invalidates on tick, geometry revision, exact door state, pose, heading and positions | KEEP existing pair cache. Do not add another stale global LOS/result store. |
| Enemy doctrine | breach-enemy-decision-controller.ts, breach-ai-work-scheduler.ts | KEEP one enemy intent/reaction scheduler, evidence-local decision inputs and bounded elective work. |
| Tactical shooting | breach-game.ts shared runCombat; breach-firing-pipeline.ts; breach-shot-resolution.ts; breach-shot-ignition.ts | KEEP the final shot authority and exact RNG order; preflight cannot license a post-spread shot. |
| Muzzle geometry | breach-weapon-clearance.ts → breach-muzzle.ts → breach-weapon-pose.ts | KEEP one rigid weapon, shared with the renderer; short-stock, elbow/shoulder changes must match ballistic muzzle. |
| Safety and recovery | breach-fire-safety.ts; breach-friendly-safety-volume.ts; breach-physical-micro-aim.ts; breach-combat-reactions.ts | KEEP physical torso/head volumes, full beyond-target friendly veto, civilian veto, bounded swept microsteps. |
| Physical cover and supports | breach-cover-stance.ts fixed tick; breach-contextual-support-contact.ts fixed tick; pose contacts and action hand ownership | KEEP simulation-owned cover height/contact timestamps; never generate gameplay permissions from visual IK. |
| Operator presentation | breach-pose-decision.ts and breach-pose-director.ts; breach-operator-animation-controller.ts; breach-operator-pose-output.ts | KEEP B1 policy, B2 30 outputs/six unique owners/one final commit, B3–B8 rig-local scratch and one poseOperator. |
| 3D disclosure | breach-3d.ts presentation / hostile hidden rig prewarm; interpolatedActor pose data | KEEP hidden-truth disclosure, prewarm and replay safety. No cached render pose becomes an authoritative shot. |
| Profiling | breach-performance-timeline.ts, breach-sight-cost-counters.ts, D0 workload audit, Package B8 pose CPU benchmark | KEEP opt-in attribution; do not claim any real-device gains without repeatable iPhone/desktop capture. |

**Important prior work:** A3.2 already provides seven finite micro-aim offsets, A3.3 a bounded auto-crouch lease, A3.4 local foot correction, A3.5–A3.9 physical contacts / cover-height / turns, A3.10 narrower height-aware friendly safety and A3.11 progressive readiness/short-stock emergency point fire. D2 must consolidate these *existing* behaviors, not recreate them.

## 2. Ranked findings, with code-level evidence

### F1 — Three kinds of LOS scanning, but one exact geometry cache (P1, low–medium risk)
- breach-visual-acquisition.ts lines 15–33 iterates every living opposing pair to progress identification, as it should.
- breach-order-executor.ts lines 65–68 constructs two filtered arrays and sorts every visible defender to choose the first order-interrupting contact.
- breach-firing-pipeline.ts around 519–530 independently builds a visible-target array, then breach-target-selection.ts copies and sorts it, followed by more lane assessments.
- breach-ai-visual-evidence.ts also builds a confirmed-target array for reaction/evidence on the enemy intent phase.
- Repetition does **not necessarily** mean repeated raycasts: breach-perception-cache.ts already saves exact same actor-pair calculations within its invalidation boundaries. Actor movement, changes of posture, doors or cover between phases are why simply caching a full target list globally is unsafe.
**Opportunity:** remove the order executor's sort/filter allocation with a stable, single-pass nearest visible selection; make target selection fast-path 0/1 visible contacts before cloning/sorting; reuse existing validated pair LOS without a second sight authority. Preserve stable ties, personal recognition and timing. Record visibility query/hit/miss counts before attempting broader sharing.

### F2 — Weapon-clearance probes stack in the most expensive combat moments (P0, medium/high risk)
- breach-weapon-clearance.ts lines 36–159 performs horizon tests, five binary refinements, small shoulder/carry grids and short-stock fallback, with geometry tests for each candidate.
- breach-firing-pipeline.ts runs this during target feasibility, passive WATCH shoulder offset (~0.16s gate), active shoulder offsets (~0.16s), no-target clear-look (~0.48s), friendly sidestep preflight and attempted firing.
- breach-shot-resolution.ts lines 65–176 repeats real muzzle clearance at centered, settled and randomized post-dispersion yaw, and tests near-target, far-beyond-target friendly/civilian/cover lanes.
- breach-3d.ts around lines 2060–2110 samples clearance for the *interpolated visual barrel*, not identical to fixed-tick geometry.
**Opportunity:** define one pure, typed same-snapshot FIRE PREFLIGHT evaluation result (muzzle, blocker, feasible target lane, friendly/civilian warning, candidate reason) consumed by target choice and adjustment *within the same phase only*. Only reuse when the precise actor position, heading, shoulder offset, posture/coverStanceDrop, yaw, weapon assembly and geometry revisions are unchanged. **Final ignition, stochastic yaw and far-tracer civilian/friendly veto must be recomputed from the actual final shot**; do not cache a boolean "safe to fire" across a shot. Gather counts for weaponClearance, muzzleAtShot, static-cover checks, candidate evaluations, solver retries and shot ignition. Do not insert a new persistent per-frame simulation layer.

### F3 — Multiple correct but independent reaction/facing writers (P0, medium/high risk)
- breach-simulation-actor-phase.ts applies recent incoming-hit facing after runFriendly.
- breach-order-executor.ts can orient toward contact and WATCH before and during MOVE.
- breach-enemy-decision-controller.ts applies surprise facing, retreat/cover, investigation and opening muzzle recovery.
- breach-firing-pipeline.ts can face the hit source briefly, set weaponYaw to a confirmed target and call rotate if gun-to-body yaw is large; breach-order-lifecycle.ts owns deterministic pivot direction.
- breach-turn-hierarchy.ts then spreads recorded actor heading/shotHeading through torso/head at presentation time.
**Concern:** this is *one motor*, not redundant clocks, but different stages may issue opposed guidance within the same fixed tick. First quantify heading/weaponYaw retargets, suppressions, blocked reasons, attempted clears, and number of corrections to get a shot.
**Opportunity:** explicitly document and test an actor intent priority: alive/stun and physical safety → authored hard actions (reload, treatment, door, traversal) → confirmed contact / forced hit reaction → authored LOOK/WATCH → idle bearing. Avoid creating another heading controller; instead ensure each existing writer uses the same precedence. Head/torso aim may react while feet complete a legitimate authored path.

### F4 — Temporary firing-lane adjustments and cover crouching need one recovery ownership rule (P1, medium risk)
- breach-physical-micro-aim.ts returns the smallest feasible deterministic lateral offset, preserving current offset to prevent flutter.
- breach-combat-reactions.ts chooses bounded footstep candidates; breach-firing-pipeline.ts requestClearFireStep validates swept bodies, furniture, true muzzle, full friendly/civilian lanes and authoring constraints, then stores fireRetreatTarget with ~0.55–1.25s lease.
- breach-order-executor.ts consumes this motor correction before returning to the plan; red AI handles the same target through its own enemy intent path.
- updateContextualCrouch in breach-firing-pipeline.ts lines 299–389 can change *only its own* un-authored posture when a rear teammate has a confirmed, demonstrably safer shot; 0.18s probe and 1.1s lease.
- breach-cover-stance.ts adjusts posture within the existing authored band and uses exact recorded cover height.
**Opportunity:** clarify selection order within a single known shot obstruction: small shoulder adjustment → legal point/short-stock accommodation → (where appropriate) voluntarily lower stance → local swept corrective step → hold. Never simulate all candidate maneuvers every tick. Preserve actual CONTACT urgency and never push/move the stopped front operator.

### F5 — Low-value per-tick allocations and eligibility checks (P1, low risk if parity tested)
- breach-firing-pipeline.ts updateContextualCrouch computes a.plan.some(...) before its 0.18s physical probe limit. This can become a cheap cached "has busy planned operation" signal keyed to the active authored plan version, or be done only after cheap eligibility; prove that changing future orders invalidates it immediately.
- breach-order-executor.ts builds filtered/sorted visibleThreat arrays even with a single relevant contact.
- breach-target-selection.ts always copies/sorts the visible list when count >1; stable nearest and current-target choices can be reproduced without array materialization, but verify tie/penetrable-cover semantics.
- breach-shot-resolution.ts makes filter/map friend safety rosters inside the ignition path. Preflight and ignition can reuse a same-tick immutable safety-body scratch *only if no position/posture change occurred*. Prefer a local per-call shared buffer over a Session-level copy.
- breach-contextual-support-contact.ts calls sessionWorldGeometry(s) before filtering actors, and later only eligible actors scan nearby surfaces. Delay lookup to first eligible candidate if this is measured.
- breach-3d.ts 1926–2160 still makes several small per-visible-actor arrays/objects and loops over live actors for related position/target data; only optimize after scene-profile measurements. Rendering is not a safe place to use fixed-tick un-interpolated clearance.
**Do not** change collision body radii, action clocks, RNG call ordering, sight progression or the final output pose to chase allocation statistics.

### F6 — Pose pipeline is already a major consolidation success (P2, low immediate ROI for major rewrite)
- B8 measured CPU work and maintained 30 final transform slots and six distinct stage owners. Three.js rig-local scratch and single poseOperator/commit already exist.
- breach-pose-director.ts declares coupledEligible=false for production while retaining narrow Lab/preview paths and B8 compatibility APIs. Those are not automatically dead; first prove callsite/replay/Workbench reachability before removing any.
- breach-operator-animation-controller.ts has 1,289 lines in main, and multiple actions/diagnostic branches. Size is **not** evidence of runtime duplication. Its live P3/V4 path is used by breach-3d.ts with poseV3Preview:true and poseV4ReloadPreview:true.
- In the 3D renderer every presented actor gets its own interpolated geometry clearance and pose; those can be necessary for correct camera-time barrel position. Prewarm of unseen hostiles already avoids first-contact rig construction stalls.
**Opportunity:** keep one pose owner; optimize *proven* live allocations and unreachable Lab-only work, keep published transform parity, then consider narrow readable helper extraction only if tests demonstrate no new writer or repeated solve. Do not launch another top-to-bottom B0–B8 refactor.

### F7 — Vision, identification and accuracy are already separated (P2 gameplay-tuning risk)
- breach-visibility-range-policy.ts maps clear sight to site diagonal, not an arbitrary ~20-foot hard limit.
- breach-visual-perception.ts uses a distance falloff around 220 world units, angular field .94rad, moving/crouching modifiers, separate detectedSight (.16) and confirmedSight (.999) thresholds.
- breach-firing-pipeline.ts additionally uses weapon-specific acquisition, stability, aiming turn and accuracy; breach-shot-ignition.ts uses range spread. Enemy encounters have their own reaction delay.
**Opportunity:** only after F1–F4 are stable, instrument actual detection/confirmation/acquisition/shot latency and hit-rate across fixed distances. Adjust perceptual latency vs shooting dispersion independently. Longer *notice* must not imply instant threat ID or laser accuracy. Test visibility blocked by glass/cover, low-light and body posture, civilian identification, and absence of hidden-intel aiming.

## 3. Release roadmap (small implementation checkpoints)

### D2.1 — Target/evidence hotpath and baseline instrumentation (P0, low gameplay risk)
**Change:** one-pass nearest confirmed threat for order interruption; skip avoidable 0/1-target sorting, avoid redundant friend roster construction where state is already local; add opt-in counters (not enabled by default) for actor sight queries, clearance evaluations and preflight attempts. Do not modify the existing PerceptionPairCache invalidation or target preference until tests prove parity.
**Acceptance:** same deterministic D0/D1 event, movement, fire, hit, rank and replay fingerprints; A3.10/11, R7 fire lanes, enemy recognition, personal-intel and sight-cache invalidation tests; check/build. Before/after identical Node contact workloads and 60s iOS comparison. Commit separately. Goal is **less work at equal behavior**, not a claimed shot-time improvement.

### D2.2 — Single same-snapshot fire preflight and clear-shot policy (P0, high safety risk)
**Change:** extract common typed exact muzzle/lane preflight, remove duplicated unchanged checks between target selection, shoulder candidates and shooter preflight. Keep shot-resolution responsible for random spread, final near/far trajectory and all civilian/friendly vetoes. Ensure observation vs current-geometry divergence is handled safely. Sample only bounded candidate offsets when necessary.
**Acceptance:** multi-target with cover penetration, head/torso/crouch friendly stacks, sideways and over-shoulder opportunities, wall/door/frame/cover, windows, known civilians/unseen neutral impact, both factions, short-stock emergency and recoil RNG parity. Measure evaluations/accepted shot/rejected shot and performance, not only FPS. Abort if any safety veto relaxes or shot evidence changes unexpectedly.

### D2.3 — Decisive interruption hierarchy and committed micro-corrections (P0, medium gameplay risk)
**Change:** formalize precedence across runOrders, AI, hit-facing and fire; make existing micro-aim → compressed weapon → self-crouch → footstep sequence deliberate and interruptible. A corrective maneuver retains a short commitment until it finishes, loses target, becomes physically impossible or its authored priority changes; no perpetual left/right retry. Reuse fireRetreatTarget and existing motor; NO new pose authority or collision proxy.
**Acceptance:** active threat at shoulder, two/three/four-man stacked shooters, opposing contact while WATCH, 180-degree pivot near wall, reload/door/tool cancellation safety, no authored movement deletion, no teammate forced movement, legitimate shooter can clear line where real space permits. Include profiler counters for correction attempts/holds/plan edits/idle thrashing.

### D2.4 — Stationary contact, cover height and pose-seam polish (P1, medium risk)
**Change:** review support contact and cover scans only when eligible, prove one hand owner for door/tool/reload/brace/teammate. Remove redundant environment lookups and unnecessary visual-only work. Validate user-authored stance remains exact; no separate visual cover height or artificial firing elevation. Preserve B2 output contract and historic replays. Optimize only measured recurring pose cost.
**Acceptance:** full A3.5–9 contact tests, B0–B8 30-slot output/IK/reload tests, varied shirt/armor/weapon configurations, static/moving/cover/door/stack transitions, deterministic same-time reverse replay, 2/8/16-rig B8 Node benchmark, real iOS/WebGL sample.

### D2.5 — Perception, identification, reaction and range-quality tuning (P1, gameplay balance)
**Change:** characterize range-dependent silhouette notice, identification, target acquisition, weapon accuracy and enemy reaction individually; adjust only outlier policies and preserve firsthand information. Do not couple detectedSight to fire permission or revive a distance hard cap.
**Acceptance:** controlled known distances/angles/lighting/cover, stationary/moving/crouched, first sight vs previously observed, civilian vs hostile, noise-only and false-hidden-target tests, ranged shot scatter statistics for each weapon category. Compare per-seed outcome distributions; tune only with evidence and user playtest feedback.

### D2.6 — Integrated contact release checkpoint (P1)
**Change:** reconcile remaining performance and gameplay regressions; no new subsystems. Review real mobile/desktop 60s contact captures and generated-mission ambushes, four-person entry plus target acquisition, suppress/return/hold policy, physical reactions, recoil/reload/replay evidence.
**Acceptance:** D0 CPU/fingerprint parity (changes separately explained), D1 physical crossing strict 70-case matrix, A3 all essential physicality/shot tests, R7 real four-person firefights, representative generated buildings, B2/B8 pose integrity, production build. One logical main merge, Pages build-stamp public verification. No blanket CI-walltime pass/fail threshold.

## 4. Performance measurement requirements

Collect identical D0 CPU workloads: no threats, suspected target, just-confirmed contact, sustained automatic fire, four operators in a crowded corridor, red + blue simultaneous contact, civilian movement, replay. Record per-fixed-tick p50/p95/p99/max and opt-in phase slices for actor-actions, visual-awareness, fire, contacts, 3D pose, first-contact rig build, and sight-query hit/miss. Add count-based acceptance: clearance calls, candidate tests, target scans, safety vetoes, corrective steps and expensive route searches per successful shot, not just elapsed time. Hardware baseline on mobile must include battery/Low Power Mode, thermals and idle-vs-live periods. Distinguish Node CPU-only timing, browser JavaScript RAF time, GPU draw/triangle observations and *actual* GPU execution as different metrics.

## 5. Hard architectural prohibitions / release risks

1. Do not move combat, aim progression or pose clearance into the browser RAF.
2. Do not remove post-spread friendly/civilian ray tests or allow an unseen target to be engaged.
3. Do not cache a boolean fire-permitted flag across movement, yaw, stance, target, door, cover or weapon changes.
4. Do not change deterministic random-roll order or replay/after-action source evidence as an incidental optimization.
5. Do not give the renderer a second muzzle/shot authority or reduce physical footprints.
6. Do not weaken D1 queue/crossing to unblock fire and do not override user-authored WAIT/WATCH/stance/door manipulations.
7. Do not delete Lab-only / compatibility pose paths without complete caller migration and tests.
8. Do not claim measurable FPS/thermal improvements until a real matching device comparison is available.

## 6. Audit disposition

D2.0 is **audit/documentation only**. No performance or gameplay change is implied, no simulator run or device benchmark was executed by this document, and the subsequent builds are scoped proposals rather than finished tasks. A detailed first-contact reproduction and multi-operator safe-shot cases should be added to D2.1 acceptance before code changes begin. Complete the stages with separate feature commits, fast critical tests and logical release checkpoints, not one large unreviewable rewrite.
