# Consolidation Package B — B6: final direct frame/body pose architecture

**Verified baseline:** B5 merged main `2cd2c24aad7225daede1eb3dd32d199582567861`, deployed by Pages `43147503598` with successful exact public build verification.
**Branch:** `refactor/consolidation-b6-final-frame-pose-output`.
**Objective:** finish all six direct B2 pose-output owners, eliminate visible intermediate frame/body mutations, and retain compatibility/coordinate mathematics for the existing tactical game.

## B0–B5 source audit / authoritative dependency graph

B0's census identified one public `poseOperator` path for live, replay, Operator Lab and Studio. B1 owns the resolved action/handling policy. B2 owns six complete, rig-local atomic output stages. B3 publishes eight leg transforms directly from scheduled contacts. B4 publishes six arm/hand transforms from the existing V3/V4 and authored pose solvers. B5 publishes eleven firearm and equipment transforms (including the three sling segments) from reusable component values.

**B6 starts with only five transitional visible pose writes/snapshots:** `root`, `legacy-frame`, `pelvis`, `chest` and `head`. The current controller writes `r.root/r.hip/r.chest/r.head` at several phases before B2 performs generic frame/body snapshots. These writes are also consumed by:
- B3 leg IK (`r.hip.position` and `r.root.position.y`, plus `r.legacyYaw/Pitch/Roll`).
- V3/V4 weapon fit, yaw offset, sight/head alignment, low-ready torso assist, manual short-stock shoulders, Lab interpolations, physical door/treatment reaches and paired arm placement.
- B5 dropped-weapon world origin and quaternion, and held/dropped sling span parent-space conversion.
- Late trauma, surrender, flash reactions and the `operator-pose-cavity-lighting` shader.
- The real wardrobe geometry/pouch/magazine hierarchy, which **must not be reparented to a shadow rig**. `v4AuthoredPouchAnchor` determines sockets by testing exact identity of the actual `r.chest` and `r.hip`, not arbitrary transforms.

**Hazard:** updating the visible scene before the publication boundary creates a second writer; removing those writes without a substitute destroys same-frame world-space calculations. Simply copying the old five mesh components into new typed tuples would satisfy API syntax but **not** finish the B6 architecture. Thus B6 builds an isolated, non-rendered working parent hierarchy with exact existing local-axis and external-parent semantics.

## Complete B6 implementation and non-negotiable acceptance

### B6.1 — Rig-local working frame, zero visible intermediate writes

Extend the existing `OperatorPoseScratch` (already allocated once per rig in `beginOperatorAnimationFrame`) with five `THREE.Object3D` transforms: root → legacy-frame → {pelvis, chest → head}. These are non-rendered transform-only objects; add **none** to the visible tactical root or its children. Cache precisely one stable `workingRig` view per rig for legacy type-compatible math consumers. The view inherits every unmodified simulation, weapon, appearance and IK field from the real rig but overrides only those five transform node references.

At each pose begin, sync from the real root/frame/body nodes and follow the real root's current **external parent world matrix**, without inserting the working root into the scene. This preserves movement of actors controlled by the tactical motor or test/Studio parents, and uses Three.js's existing `getWorldPosition`, `getWorldQuaternion` and `worldToLocal` mathematics rather than inventing a new spatial basis or stepping time.

### B6.2 — Reparent *calculation*, not equipment or visible geometry

The main evaluator writes its root, pelvis, chest and head transforms only to the working frame. B3 `applyOperatorLegIK` receives the same working frame view, but still uses the one authoritative recorded/live feet scheduler, existing foot diagnostic/bend state, and the single B3 direct lower-body output.

The original rig remains the argument for `updateOperatorAppearance` and real pouch/magazine model construction. `v4AuthoredPouchAnchor` continues receiving the **real** `r.chest,r.hip` identity because it walks actual model parents to compute socket positions. All gameplay/appearance identities, real action magazine state and original `r.root.userData` diagnostics remain unchanged.

### B6.3 — Preserve every torso/turn/aim decision

Keep the existing B1/B4 unified policy, turn sample/caches, stationary low-ready coupling, V3 coordinated torso assists, V4 reload handoff, weapon-fit origin/rotation, sight/head moves, crouch body shifts, down/trauma, stand/unarmed styling, authored manual short stock, Lab retarget blending and treatment/door reach. Merely reroute the 5 frame/body transform writes; do **not** retune a single numeric constant, change a controlled joint limit, duplicate the handling or footstep clock, or alter shot ballistics.

The existing `applyOperatorTraumaPose` public API remains compatible; optional B6 working-frame input writes the root/chest/head to shadow components. `r.legacyRoll` must remain a field of the real rig to preserve flash/reaction history, not a shadow-only new owner.

### B6.4 — Same-frame world-space drop and sling parity

Call B5's `solveOperatorDroppedWeapon` and `solveOperatorDirectSlingPose` with the B6 working view. These functions use current shadow `root/chest/legacy-frame` world matrices, the B5 direct held/drop firearm transforms and unchanged world conversion algorithms. They may only update B5 direct output components; they do not mutate a registered visible firearm or body node before final publication.

### B6.5 — Replace both generic final-stage snapshots

Introduce `finishOperatorFramePose`, which converts the five working node components into exactly five stable, per-rig, 11-value tuples. Their IDs/order match the B2 registry:
- **frame:** `root`, `legacy-frame`.
- **body:** `pelvis`, `chest`, `head`.

Replace both production `stageOperatorPoseOutput(r,p,'frame'/'body')` calls with `stageDirectOperatorPoseOutput` at the same late point, after trauma and before the existing one `commitOperatorPoseOutput`. All six B2 stage owners are now **direct** in production. Keep the B2 legacy generic snapshot as an isolated compatibility method for diagnostic consumers only; it must not appear in `poseOperator`.

### B6.6 — Independent parity, replay and ownership tests

New `tests/package-b6-frame-body-output.test.mjs` validates:
1. Shadow node identities, parent graph, real-scene immutability and reusable bounded output arrays; it must not appear in any rendered scene child list.
2. Exact local/world matrices and quaternion under arbitrary external parent translation/rotation and tactical root X/Z changes between frames.
3. Exact final 30-slot output ownership, visibility, values matching the public mesh for AR/AK/HK/shotgun stand, ADS, run, crouch, short-stock, V4 reload, door handle, kick, treatment, flash, injury, left/right falls, surrender and unarmed preview.
4. Recorded replay feet, seek back/repeat, output generation and cross-rig buffer isolation.
5. Preserve a single final public commit with six direct owner stages and zero registered visible frame/body transform writes in the evaluator; old generic snapshot remains compatibility-only.
6. No independent motor/action clock, `requestAnimationFrame`, random motion, new shell/shot logic or outfit parent changes.

Continue running Package B B0–B5 baselines, Stage 11, Workbench, V3/V4 magazine, all weapon variants, physical motion/contacts, architecture, production build, and real WebGL tactical/replay/Lab/Studio browser tests. Update source-shape tests to name new direct stage calls; do not disable any simulation or animation correctness assertions.

### B6.7 — Reliable merge and production

Commit complete B6 branch and open one PR with evidence. Check all relevant final-head workflows (Package B, primary CI, architecture/release readiness, motion, animation integrity, WebGL tactical/replay/Operator Lab, and any Workbench-specific job). Confirm prior B5 Pages exact stamp is live, classify only the long-superseded zero-job queued Pages run if it still meets established conditions, and avoid merging while a real deployment is active. Merge once at the checkpoint, then verify the new Pages workflow includes a successful **Verify public Pages serves expected build** check and that the deployed SHA equals new main.

## Explicit non-goals and residual contracts

- The public `poseOperator(r,p,dt)` API and one external actor motor stay unchanged. This is not a new render loop, controller, combat decision, gait scheduler, or weapon fitting engine.
- Non-registered *costume*, modeled weapon assembly child geometry, magazines in actual pouches and visual kit objects still use the same existing scene hierarchy/visibility updates as before. The five-node working frame is transform-only and never renders.
- Direct outputs are rig-local, reusable, and invisible until final commit. Source `r.legacyPitch/Yaw/Roll`, existing hand bending diagnostics, action state and animation transition samples remain real rig-owned mutable presentation state; no claim of pure functional simulation.
- Existing legacy `stageOperatorPoseOutput` and `captureOperatorPoseOutput` remain supported for explicit diagnostic consumers but **not** invoked by the production pose evaluator.
- Even after all automated acceptance, real iOS Safari GPU profiling and qualitative human appearance approval require separate evaluation; do not claim them based on CI alone.

## Completion ledger

- [x] Audited B5 main's remaining five frame/body outputs and real identity / world-parent dependencies.
- [x] Implemented shadow transform hierarchy, six direct stage handoff and late trauma parity.
- [x] Authored focused B6 tests, B0–B2 stage-source assertions and workflow integration.
- [ ] Final-head verification green across critical and browser suites.
- [ ] Safe merge plus verified public Pages build serving exact new main.

Do not mark the last two complete without actual evidence.
