# Consolidation Package B — Stage B5: direct weapon and attachment pose outputs

**Verified starting baseline:** B4 main `ec7bb518ad417b8f7a722bad1232d1116deff2e8`, live Pages run `43142952406` with successful served-build verification.
**Feature branch:** `refactor/consolidation-b5-equipment-direct-output`.

## Stage goal and exact scope

B0 audited all operator-pose owners, B1 unified visual policy selection, B2 introduced an atomic staged output registry, B3 moved eight leg nodes to pure components, B4 moved six arm/hand nodes to direct staging. **B5 migrates the remaining two firearm nodes and nine attachment/sling nodes to the exact same direct producer interface**. B6 will address the retained frame/body working rig calculations, semantic deduplication and final transitional path removal.

B5 is a **visual-presentation authority** change. Keep weapon assembly, shot-time muzzle/ballistics, contact/reload/action state, 60 Hz combat, inventory/campaign, posture, B1 fit decisions, B3 planted feet, B4 hand sources, rig hierarchy, Studio/Workbench, Lab and replay untouched.

## Audited existing owners and constraints

- `breach-operator-animation-controller.ts` formerly wrote `weapon`, `droppedGun`, `magazineInserted`, `magazineHand`, `detachedMagazine`, `reloadControlMesh`, `medicalItem`, `pack`, and three `slingStraps` directly. They were snapshot through B2 at end of frame and republished on the same meshes.
- The old drop uses **the current held gun's world origin and quaternion**, the root's world origin, the final trauma/body matrices, and `legacyFrame.worldToLocal`. Direct output must reconstruct the identical *same-frame* held transform, not read the previous frame's weapon mesh.
- The old sling uses local gun position + Euler orientation when held, but calls the **dropped gun's localToWorld** and **chest.worldToLocal** when the gun drops; a direct solver must reassemble the dropped transform's world matrix before placing these spans. Three.js scene parent matrices remain authoritative; do not invent a parallel avatar hierarchy.
- The action magazine carries a real model in the hand. Mounted family magazine children and pouch selection/reload source visibility stay in their existing child/visual-kit domain, not added to the 11 B2 registered slots.
- Unarmed preview suppression occurs **after** all late pose actions, so weapon/magazine/sling visibility must be applied to staged values immediately before the B2 commit, not directly to a stale scene node.
- The existing `updateOperatorSlingPose` is called by isolated Roadmap 3 tests. Preserve its public mesh-writing API as an adapter to the same segment-placement equations; production uses direct data-only sling values instead.

## Complete workstreams

### B5.1 — Typed fixed ownership and reusable scratch

Add one `OperatorEquipmentPoseScratch` in the existing per-rig `OperatorPoseScratch`. Initialize once from the rig; it owns the transforms, Euler scratch, drop/reparent matrices and exactly 11 stable 11-component output tuples. No fresh scene object, output array or second clock per pose.

Register order strictly matches the B2 owner registry:

- **Weapon:** `held-weapon`, `dropped-weapon`.
- **Attachments:** `inserted-magazine`, `hand-magazine`, `detached-magazine`, `reload-control`, `medical-item`, `backpack`, `sling-0`, `sling-1`, `sling-2`.

Every element remains component-only until final `stageDirectOperatorPoseOutput`. Unused/hidden transforms retain their original rig-local values exactly until actually animated, to avoid changing historical pose snapshots.

### B5.2 — Held firearm, weapon sockets, and V4 control

Consume the *one* already-selected `fit`: same `fit.origin`, `fit.rotation`, `data.lengthScale`, hold/short/ADS transitions and existing `presentedWeaponFit` diagnostics. Preserve V4 reload-control visibility, socket-local travel and per-family scale. Leave all weapon geometry rebuilds, magazine child appearance and weapon-light on/off logic in their current, non-pose-registered model nodes. No shot/muzzle solver is added.

### B5.3 — Real magazine ownership and hand alignment

Use the B4 direct support wrist for all hand/detached magazine positioning. Preserve rotation as the same Euler->quaternion, local AK rocking Z rotation, feed-lip palm offset, V3 magazine-body grips, V4 real selected pouch source, and mounted/in-hand visibility windows. Do not synthesize an ammo source, duplicate a pouch magazine, or alter reload ownership timing. Preserve shotgun shell-scale rules and medical item position.

### B5.4 — True same-frame dropped firearm transform

After the unchanged `applyOperatorTraumaPose`, read the new held-weapon component, `r.chest.matrixWorld`, root world origin, and `legacyFrame` inverse. Reuse the exact old `smooth((downProgress-.30)/.70)`, resting position, hand-to-ground trajectory, quaternion blend and sling short-rest behavior. No intermediate `r.weapon`/`r.droppedGun` mutation; do not alter the scene origin or make falling guns influence collision/ballistics.

### B5.5 — Same-frame sling segments and pack

Refactor sling geometry to a shared `positionSlingStraps` kernel called by the legacy mesh adapter and the new data-only direct producer. For held guns, use the selected firearm component's local origin/rotation/scale. For dropped guns, assemble `legacyFrame.matrixWorld * compose(drop position, quaternion, scale)` and convert mount points to chest-local. Preserve the fixed three-segment routing, sway, scale clamp, fabric and sling visibility. Move pack inertia to the same direct data owner with the exact old yaw/roll and side-offset formula.

### B5.6 — One final publication and compatibility

Controller stages B3 lower, B4 upper, B5 weapon/attachments, and transitional frame/body, all under the unchanged B2 commit. No direct registered equipment node writes between frame start and commit. `finishOperatorPoseFrame` receives the B5 scratch to hide gun/magazines/slings for unarmed previews; keep the historic mesh fallback for older stand-alone finalizer callers.

### B5.7 — Focused and cross-domain parity tests

`tests/package-b5-equipment-output.test.mjs` verifies:
- all 11 registered slot identities, full values and visibility match their committed scene nodes;
- frozen pre-B5 dropped-gun world-position/quaternion equations for right/left fall, sling-equipped down, injury and surrender;
- frozen pre-B5 sling segment outputs for held, dropped, unarmed and disabled slings;
- no weapon/attachment scene mutation during direct solve, stable buffer identities and per-rig isolation;
- representative AR, AK, HK, shotgun configurations and low/ADS/short/reload/treatment/down/surrender/unarmed action states;
- deterministic replay backward seek, repeated timestamps and single atomic commit;
- no new action, motor, shot, inventory or foot-contact authority.

Retain B0–B4 gates, Stage11, Roadmap3 sling, Closeout4, V3/V4 magazine, all-family short-stock, primary integration, animation, motion, typecheck/build, and actual WebGL tactical/replay/Operator Lab checks.

### B5.8 — Safe release checkpoint

Commit on feature branch and open B5 PR. Run exact final-head workflows. Check predecessor B4 Pages run served the correct main commit. Do not merge into main while a genuinely active Pages publish exists. Classify the known `43098274766` queued run strictly as a superseded, old zero-job exception only if its later same-SHA success and no-job status still hold. Merge one release checkpoint, then confirm new Pages workflow success and its **Verify public Pages serves expected build** step against merged main.

## Audited deferrals / exclusion

- B5 does not remove scene writes for `r.root`, `r.legacyFrame`, `r.hip`, `r.chest` or `r.head`. Those still feed shooting/studio geometry, world parent transforms and IK in the legacy composition. **B6** is responsible for resolving that final dependency graph.
- Visual children inside the authored weapon assembly and actual pouches are intentionally not registered as independent B2 pose targets; retaining their legacy child visibility does not violate the 11-slot output ownership.
- Direct staged firearm transforms do not imply new gameplay weapon physics, independent aim solutions, per-weapon reload simulations, or new sling animation.
- Green automated browser acceptance does not substitute physical iPhone Safari testing, subjective pose/visual evaluation, or GPU profiling.

## Completion evidence

- [x] Scope audited and 11 output owners identified.
- [x] Direct weapon/attachment scratch and drop/sling equations implemented on feature branch.
- [x] Focused parity, isolation and action tests authored and registered in Package B CI.
- [ ] All final-PR-head critical integration and browser jobs green.
- [ ] Safe B5 merge, successful release and exact public Pages stamp confirmed.

Do not check the last two boxes before verifying them.
