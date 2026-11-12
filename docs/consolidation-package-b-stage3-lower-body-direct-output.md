# Consolidation Package B — B3: lower-body IK and locomotion pose outputs

**Starting production:** B2 PR #1232, merged main `778d4ed458c7967737c7c4d131fb916558dd32a9`, Pages run `43133266737` completed with exact public-stamp verification.
**Branch:** `refactor/consolidation-b3-lower-body-direct-output`.
**Change intent:** migrate **lower-body local transform output** from eight procedural scene-mesh writes to the B2 direct slot contract. Do not redesign gait, rewrite the motor, add foot avoidance, change recorded replay evidence, alter the shot-time muzzle, touch campaign state, or change the approved leg silhouette.

## Source audit: what existed after B2

- `breach-pose-decision.ts` already resolves locomotion policy and physical speed; B3 does **not** add a second posture/gait decision.
- `breach-operator-lower-body.ts::sampleOperatorFootContacts` is the single dispatcher: replay uses `validatedReplayFeet`; live input uses `advanceFootsteps`. The latter is the *only* scheduler changing footstep contact state.
- The old `applyOperatorLegIK` wrote `foot.upper`, `foot.lower`, `foot.ankleLink`, and `foot.shoe` scene transforms directly. It also wrote presentation diagnostics (`foot.bend`, `outOfReach`, `swinging`, `anchor`, and `r.legGap`). Those diagnostics are not a competing movement authority.
- B2 captured the rig's eight leg transforms immediately after the old solve, while the final frame commit published them alongside all other owners.
- `alignSegment` in `breach-ik.ts` remains actively used by upper-body IK and the Workbench. It cannot be removed or retuned.
- `breach-operator-pose-scratch.ts` provides existing per-rig reusable solver vectors and live seek-reset coordination. No second independently timed leg memory may be introduced.

## Complete B3 implementation scope

### B3.1 — Preserve authoritative locomotion and recorded contacts

Keep `prepareOperatorPoseDecision` and `resolvePoseLocomotionFrame` policy unchanged. Do not bypass `sampleOperatorFootContacts`, `validatedReplayFeet`, or `advanceFootsteps`. Preserve the 60 Hz Session clock, travel/pelvis/head yaw, root X/Z and footstep scheduling. The pure leg solve consumes the supplied targets exactly once.

### B3.2 — Reusable direct leg solution

Extend the existing `OperatorPoseScratch` with precisely eight ordered leg output slots, per-component local transforms, shoe Euler scratch and a one-time legacy-rig initialization. Per-rig buffers are allocated once; no new per-frame `Object3D`, arrays, `Vector3`, extra clocks or independently updated scheduler.

The registered IDs and order must remain:
`leg-0-upper`, `leg-0-lower`, `leg-0-shoe`, `leg-0-ankle`,
`leg-1-upper`, `leg-1-lower`, `leg-1-shoe`, `leg-1-ankle`.

Local values retain the same 11-element B2 representation (position 3, quaternion 4, scale 3, visibility 1). No extra rig model, bone hierarchy, or alternative material branch.

### B3.3 — Exact historical IK math

Factor `alignSegmentComponents` out of existing `alignSegment` so both existing mesh callers and new direct components share *identical* anatomical reference vectors, joint bend planes, degeneracy fallback, quaternion construction and length scaling. Preserve `solveTwoBone` limits and the original requested (not silently corrected) contact.

Preserve the visible ankle link threshold `r.legGap[i] > .10`. When hidden, its previous transform stays retained exactly as in the old mesh path. Preserve the shoe's recorded pitch and `worldYaw - headingYaw` orientation. The right foot's existing kick interpolation reaches the same recorded door-leaf point, and the root inverse still transforms contacts from world space into the legacy local basis.

### B3.4 — Eliminate lower-body scene writes before publication

`applyOperatorLegIK` remains the one documented lower-body solve entrypoint for compatibility, but computes into reusable off-scene components and returns the complete direct slot set. It may update diagnostic reach, bend, swing and anchor fields, but must **not** set visible leg mesh positions, rotations, scales or visibility.

`poseOperator` retains the same invocation after scheduled feet and root fall/turn transforms. Replace B2's `stageOperatorPoseOutput(r,p,'lower-body')` snapshot with `stageDirectOperatorPoseOutput(r,p,'lower-body',legPose)`. The existing final `commitOperatorPoseOutput` writes these eight transforms exactly once alongside the rest of the completed frame; no second publication or post-commit toe correction.

### B3.5 — Preserve gait and animation feel

Keep existing standing, crouching, walking, running, strafing, foot pivots, bracing, door kicking, down/surrender, hip rise, vault tuck, reach and planted contact behavior. No interpolation retuning, authored animation replacement, scaling change, knee stretch, artificial foot catch-up or new movement intent.

The B3 refactor's leg transform values must match the old B2 writer within stringent floating-point tolerance. Keep historical ankle link transforms even while hidden, because published snapshot parity includes all registered slots.

### B3.6 — Focused regression contract and compatibility

`tests/package-b3-lower-body-output.test.mjs` independently reproduces the frozen B2 writer and compares full local transforms for planted, strafe/swing, crouch, turn, down, door kick and unreachable contacts. It asserts solver-time mesh immutability, diagnostics and reach flags, stable per-rig buffers, no scheduler advancement, replay-foot immutability, backward seek/repeated timestamp parity and the shared alignment kernel.

Update B2's structural test to assert the new **direct** lower-body handoff, while preserving its remaining six-stage ordering and atomic publication gates. Keep Stage 11, B0/B1/B2, weapon-family, V3/V4, Studio, Lab, replay, animation, motion and all critical architecture regression tests.

### B3.7 — Production verification

- Run `node --experimental-strip-types --test tests/package-b3-lower-body-output.test.mjs`, existing B2 and Stage 11 tests, B0 census, and `npm run build`.
- Run Package B, animation integrity, motion critical, primary CI, architecture and actual WebGL tactical/replay/Operator Lab browser jobs at the **final PR head**.
- Reject any regression in physical foot placement, leg silhouette, reload/held weapon pose, operator Studio/Lab or historical replays. Do not dismiss tests merely to make a structural gate green.
- Before merge, check latest main Pages success and served stamp, classify and exclude only the previously documented zero-job superseded queued record; do not queue behind an active publish.
- Merge one B3 PR only after green acceptance, then confirm the new GitHub Pages deployment and exact public build stamp. Physical iOS Safari/GPU subjective review remains a separate, explicitly unclaimed acceptance axis.

## Risk audit / exclusions

| Potential mistake | Avoidance |
| --- | --- |
| Implicit new gait or step timing | Reuse B1 locomotion decision and the exact original `sampleOperatorFootContacts` scheduler |
| Different knee quaternion or tiny foot shifts | Share unmodified `alignSegment` math in `alignSegmentComponents`; independent frozen B2 golden comparison |
| Foot meshes briefly move before the final frame | Direct eight-slot staging; no leg-scene transform writes until B2 commit |
| Hidden ankle disappears but its transform resets | Preserve its prior rig-local transform in persistent per-rig scratch |
| Replay seek inherits another actor's state | Existing per-rig scratch, exact replay-foot targets, seek and cross-rig regressions |
| Accidental workbench/upper-body IK changes | Keep the historic `alignSegment(mesh,...)` API as a thin adapter on the same kernel |
| Material/garment/gait cosmetic changes obscure parity | No art or authored-socket changes in B3 |
| Overclaim that *all* rig transforms are pure now | Only lower-body eight slots migrated. Other procedural intermediates deliberately remain for B4/B5/B6 |

## Completion evidence

- [x] B3.1–B3.4 direct leg solver/owner implemented on feature branch.
- [x] B3.5–B3.6 frozen-reference tests authored and registered in CI.
- [ ] Final-head CI, architecture, motion, WebGL tactical/replay and Lab acceptance.
- [ ] Post-merge production release with exact public Pages verification.

Do **not** mark the final two boxes complete until those checks actually pass.
