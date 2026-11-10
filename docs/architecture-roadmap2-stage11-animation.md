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

## Implemented ownership map — Stage 11

| Concern | Owner after refactor | Allowed writes |
| --- | --- | --- |
| Frame contract | `breach-operator-animation-contract.ts` | None; shared `OperatorPose` type for live/replay/Labs |
| Rig construction | `breach-operator-rig.ts` | Meshes, anatomy, materials, sockets and visual kit at creation; retains compatibility `poseOperator` export |
| Animation orchestration | `breach-operator-animation-controller.ts` | Pose-only torso/head/weapon/arm transforms; ordered entry/exit of stages |
| Frame lifecycle | `breach-operator-animation-frame.ts` | Reusable IK scratch, render discontinuity, turn history; never simulation |
| Appearance | `breach-operator-appearance.ts` | Wardrobe/equipment visual state, material ledger and reversible desaturation |
| Contact + legs | `breach-operator-lower-body.ts` | Consume already-authorized footstep targets, apply leg/boot IK, report reach; never motor movement |
| Action/handling | Existing `breach-pose-action-state.ts`, `breach-pose-director.ts` and `breach-pose-transition-director.ts` | Decide pose intent, blend histories; do not write physics |
| Upper-body constraints | Existing `breach-unified-upper-body.ts`, V3/V4 reload and anatomical contact modules | Select approved coupled arms and fitted weapon contacts |
| Finalization | `breach-pose-frame-finalizer.ts`, `breach-operator-sling-pose.ts` | Trauma overlay, sling, cavity uniforms and frame snapshot |
| Scene | `breach-3d.ts` | World placement, visibility, lighting, attachments; no autonomous IK or targeting |

### Mandatory precedence and no-double-writer policy
1. Simulation facts are read as `OperatorPose`, then the frame lifecycle resets stale replay handoffs and bounds presentation delta.
2. Appearance is evaluated once per fingerprint before movement and posed attachments, and injury desaturation always derives from original palette values.
3. Locomotion foot targets come from `advanceFootsteps` or validated replay feet, **never both**. Only the leg solver consumes those targets. No secondary replant or shoe teleport.
4. Action priority is decided once. Handling transition owns phase/history; coordinated upper-body, reload, aiming and door/throw/treatment actions use their existing decision gates. A released action hand cannot also be claimed by a weapon grip.
5. The weapon presentation fit is committed before final hand IK, which solves to the actual visible weapon contacts. The authoritative firearm muzzle still comes from gameplay weapon clearance, not these display-only transforms.
6. Trauma and post-IK finalizer run after limb solutions; the final snapshot is recorded exactly once. The next frame's base turn uses stored unmodified targets, not the final, layered chest/head Euler values.

### Deliberate future-overhaul seams
- **First:** introduce a compact, read-only pose decision result: handling state, action priority, contact ownership, locomotion request and fixed-time transition alpha. Remove ad hoc boolean precedence from the remaining large orchestration method.
- **Second:** produce an explicit staged pose output (pelvis/torso/head, rigid weapon fit, support/firing hand targets, left/right foot targets) before any Three.js transform writes.
- **Third:** consolidate redundant V3 / V4 pose adapters behind one compatible solver with named constraints and a deterministic fallback, while retaining the approved short-stock, low-ready, reload, gear and firearm contact targets.
- **Fourth:** apply output in one ordered transform-commit pass with visual attachment updates last. Centralize hand and magazine handoff authority, remove obsolete IK branches only after exact golden parity.
- **Fifth:** tune animation aesthetics and blend durations separately from this architecture change; preserve a rollback route for each pose family.

The intentionally remaining complex upper-body orchestration is now isolated from rig creation, appearance and foot scheduling. Stage 11 does **not** claim that the future unified solver has already replaced its detailed choreography.

### Regression matrix
- New Stage 11 frame/contract tests for source ownership, bounded dt, repeated frame, seek reversibility, appearance change, and immutable replay foot targets.
- Existing V3/V4/short stock/ADS, operator and muzzle, pose transitions, Lab, replay, animation integrity, motor and performance regressions remain authoritative.
- Historical source-location assertions now follow the extracted owner **without** deleting their physical safety/continuity assertions.
- Both operator-motion and operator-animation CI path filters include the new owner modules, so later overhaul PRs cannot bypass those gates.
