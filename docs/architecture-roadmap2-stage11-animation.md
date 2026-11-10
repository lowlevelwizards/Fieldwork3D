# Roadmap 2 — Stage 11: operator animation architecture

## Objective
Make a future unified, concise animation overhaul straightforward by untangling presentation orchestration from rig construction and establishing explicit, testable ownership of appearance, pose frame timing, foot contact, upper-body fitting, handoffs, and final pose. This stage is architectural, not a redesign of the poses or gameplay.

## Authoritative contracts
1. The fixed 60 Hz motor and firing controllers own actor movement, collision, muzzle clearance, action timing, reload state, hit registration and combat. The animation system is presentation-only.
2. The **OperatorPose** input is the cross-mode frame contract for live tactical gameplay, deterministic replay, operator Lab and equipment/workbench preview. It is a value snapshot; rendering must not mutate it.
3. A presentation-owned **frame lifecycle** guards time discontinuity, nonnegative bounded dt and scratch reuse. Replay seeks and paused frames must not inherit stale contact / handling state.
4. A presentation-owned **appearance stage** fingerprints equipment, wardrobe and inventory, resolves palette and attachments only when needed; injury desaturation is reversible. It must not own motion.
5. The **foot scheduler** remains the sole contact authority. Leg IK consumes contacts and reports reach errors, never moves contact anchors or writes the motor.
6. A single **pose director** chooses action priority and handling; the transition director owns history and blending. The existing coupled weapon/hand solvers and reload corridors remain the only writers of their accepted solutions. No extra post-IK pass.
7. The **finalizer** applies trauma, dropped gun/sling and final snapshots. The 3D scene only positions the visual rig in world space and handles visibility and lights; it does not decide combat or IK.
8. All temporary vectors, previous-turn state and transition memory are rig-scoped and bounded; expensive debug arrays must stay opt-in.

## Extraction roadmap and boundaries
- **11.1** Introduce a common animation-frame lifecycle/scratch boundary, with deterministic seek semantics.
- **11.2** Separate pose application orchestration from rig creation. Preserve the public `poseOperator` export for all live/replay/Lab callers.
- **11.3** Move appearance / outfit cache and dynamic desaturation into an isolated visual stage.
- **11.4** Separate contact-driven lower-body IK application from upper-body weapon fitting.
- **11.5** Keep single action, handling, weapon, hand, and reload transition precedence. Do not duplicate the existing pose policy modules or create a second blend tree yet.
- **11.6** Document a future modular pose-output path for shoulder, elbow, hand, spine, gait and attachments; no new behavior or tuning in this stage.
- **11.7** Add tests for phase ownership, same-time stability, replays, visual kit changes, contact authority, weapon/muzzle parity and no second simulation clock.
- **11.8** Pass typecheck, critical integration, operator animation integrity, simulation performance, and production Pages verification before merging.

## Future overhaul readiness
The future rework should be able to replace the inner fitting strategy, coordinate one single transform commit and consolidate the large choreography graph **without** rewriting rig mesh construction, session inputs, wardrobe colors, footstep contact ownership, or replay clock handling.

## Non-goals
No changes to pose silhouettes, approved low-ready/short-stock firearm targets, combat muzzle origin, recoil, armor geometry, rig hand placement, action durations, footsteps, authoritative collision, or Campaign state. Do not rebaseline existing tests.
