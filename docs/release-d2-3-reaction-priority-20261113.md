# D2.3 — Decisive reaction priority and committed physical correction

**Base:** Integrated and public-verified D2.1 + D2.2 release `b3b790060a34fbd866362d9e581c2f16cdf1f183` (PR #1377). **Development branch:** `feature/d2-3-reaction-recovery-priority-20261113`. No merge/deploy in this stage without explicit follow-up.

## Audit of current behavior and ownership

- Player orders: `breach-order-executor.ts` runs once in the fixed actor phase. It already prioritizes traversal, then a short firing correction, confirmed-contact pause, ordered movement/interaction, and optional idle gaze. The correction formerly ran before examining new authored orders, weapon state or policy; it could continue after a move goal was changed or the user switched to a hard action.
- Enemy doctrine: `breach-enemy-decision-controller.ts` scanned sound before its optional correction, correctly letting actionable alarms cancel; its correction cancellation rules had diverged from the player executor. The same physical motor performs both.
- Targeting: `breach-firing-pipeline.ts` already selects only confirmed visible contacts and owns adaptive shoulder/ready/short-stock, contextual posture, and an existing bounded physical self-step. There are no missing simulation bodies or reasons to add a second solver.
- Reaction: `breach-simulation-actor-phase.ts` previously issued an incoming-hit heading after `runFriendly()` had already rotated for contact or WATCH; the firing pipeline separately reacted using its weapon yaw. Without a shared priority, these two allowed a shot or hard door/tool action to compete with an old hit.
- Motor: `breach-actor-motor.ts` owns real foot translation with full swept geometry; `breach-order-lifecycle.ts` owns fixed-step turning and committed 180° pivots. Do not replace them or remove A3.8 pivot episodes.
- Performance: quiet ticks should not evaluate new interruption decisions, and active corrective steps must first reject cheap invalidity BEFORE invoking `sweptBodyClear`. The existing D2.1 counters are sufficient for number of searches/probes; no new continuous profiler loop is justified.

## D2.3a — One interruption contract for physical corrections (implemented)

`breach-fire-recovery-policy.ts` provides a pure, constant-work `fireCorrectionStopReason`, `cancelFireCorrection` and `correctionContactChanged`, consumed by both blue and red. The existing actor motor remains the only owner of physical translation. A correction continues for its existing 0.55–1.25 s bounded lease only while:
- operator remains physically able to shoot (not stunned, reloading, sprinting, climbing, squeezing, carrying, treating or throwing);
- no hard authored action, changed waypoint/order kind/destination, newly authored sprint or fire HOLD/SUPPRESS policy supersedes the correction;
- the red AI has not decided to withdraw or heard an actionable fresh alarm, and usable ammunition remains;
- the physical step remains real, swept, and the endpoint is not already reached.

Capture only the current authored node ID/kind/point and selected confirmed contact when committing the step. These are a few passive actor fields, NOT a per-frame index or stale fire permission cache. Existing replay states with absent metadata retain their previous bounded lease/kind checks. Edited player `PlanNode[]` is never mutated by correction cancellation; only transient nav is cleared.

## D2.3b — Contact change cancellation (implemented)

The player firing pipeline reuses its already-computed, confirmed visible target: losing or changing that contact cancels an obsolete optional footstep without another actor/LOS scan. The footstep search still performs every physical sweep and real muzzle/friendly/civilian check before it can start. Enemy alarm interruption remains before any visual work, with the original short lease as a fallback for an enemy that has not yet updated target evidence.

## D2.3c — Explicit facing priority (implemented)

`hitFacingInterrupted` makes current physical/hard action, a true contact stop and a recent active firing contact outrank optional incoming-hit facing. Neither LOOK/WATCH nor authored moving routes are deleted. The idle player executor now chooses **one** heading source in order: confirmed visible threat, then recent actual incoming-hit direction, then authored LOOK/WATCH. The later actor-phase hit override applies only while a soft active plan remains; it does not apply a second idle turn. A3.8 turn episodes remain owned by `rotate()`. The shared predicate is also used by weapon-yaw hit response. Quiet ticks short-circuit on hit age before calling the priority function.

## D2.3d — Validation and release gate

- New tests validate identical-plan continuation, hard action/hold/return/reload/sprint/retreat/no-ammo interruptions, same-node drag edit, different node ID/kind edits, contact-change and loss, cancellation without plan mutation, hit vs hard/active contact precedence, and no new render-time scheduler.
- Real `breach-two-sided-fire-recovery`, `release5-investigation-continuity`, A3.3/A3.8/A3.10/A3.11, tactical targeting, D1 coherent crossing and R7 four-person firefights must pass. Also build/typecheck.
- No expectation of exact D2.2 after-state fingerprints where **intentional** interruption changes shorten/cancel corrective motion. Compare same-build deterministic seeds and gameplay outcomes plus sight/correction counters; do not disguise changed intended behavior as a parity regression.
- Tests are the critical fast integration gate. Real-device profiling of 60-second firefights is required before claiming FPS/thermal improvement; Node CPU measures CPU only.

## Non-goals, limitations, and next work

No new behavior clock, large hierarchy object, per-frame cached hazard physics, artificial smoothing, collision downgrade, extra ray queries, auto-moving teammates or changing authored WAIT/WATCH, no change to stochastic shot/far tracer/civilian protection. There remains an active-soft-order hit-facing override after ordinary locomotion orientation; replacing that with a single all-order heading owner would require broader A3.8 movement/PIE/door camera replay evidence and is intentionally **not** smuggled into this safety-focused checkpoint.

D2.4 remains stationary contact / cover-height / single pose-output optimization; D2.5 is perception versus recognition versus accuracy/range quality; D2.6 is integrated acceptance and real mobile performance verification.
