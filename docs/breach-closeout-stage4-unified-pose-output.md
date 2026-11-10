# Fieldwork Breach — Closeout Stage 4: unified pose-output ownership

## Scope and non-goals

Closeout Stage 4 establishes ONE stable final publication boundary for
visual anatomy, held and dropped weapons, hands, feet and action attachments.
The next animation overhaul can replace the internal fitting/choreography
engine without changing tactical, Director replay, Operator Lab, or Studio
callers. Stage 4 is **architecture**, not new motion design.

Specifically out of scope: tuning run/idle/ADS/short-stock poses, swapping
shoulders, weapon grip geometry, recoil, collision, combat muzzle traces,
equipment sockets, authoring new actions or changing the authoritative 60 Hz
motor. Frozen deterministic outcomes and visual contact golden tests stay
unchanged.

## Audit: Stage 11 baseline versus unfinished work

Roadmap 2 Stage 11 already provided:
- one `OperatorPose` contract and exported `poseOperator()` for tactical,
  replay, Lab and Studio
- rig creation separate from `breach-operator-animation-controller.ts`
- per-rig bounded animation scratch and seek-aware frame lifecycle
- appearance and contact-owned lower-body solvers
- pure handling/action director and time transitions
- final trauma/sling/cavity stages with visual-only presentation
- extensive V3/V4, reload, short-stock and IK regression checks

What remained: anatomical/weapon final presentation was still implicit in
many in-place intermediate writes in one 61 KB controller. There was no
stable named **output schema** available to a replacement solver or to
parity-check a posed Lab/Director frame; no explicit final commit interface.
Introducing yet another independent animator would add more transform
writers, not solve the ownership problem.

## New published-output contract

`src/breach-operator-pose-output.ts` defines a single typed
`OperatorPoseOutput` with one named slot and owner for each registered
pose-controlled scene node. The slots are made **once per rig** and reuse
bounded `Float64Array(11)` buffers: XYZ translation, XYZW quaternion, XYZ
scale, visibility. Their numerical values are copied without smoothing,
quantizing, recomputing, or allocating GPU meshes. Root-space X/Z stays
under the scene's world-placement authority; the canonical frame handles
rig-local heading/lean.

| Stage owner | Published slots |
| --- | --- |
| Frame | root and canonical-to-legacy frame |
| Body | pelvis, chest, head |
| Lower body | both thigh/shin bone pairs, shoes and ankles |
| Upper body | both arm upper/lower bones and hand nodes |
| Weapon | held and dropped weapon roots |
| Attachments | inserted, carried and detached magazine, reload control, medical item, pack and sling straps |

This registry rejects duplicate IDs and duplicate node ownership. It is
rig-scoped via WeakMap and explicitly reset when the physical rig is
disposed; there is no global scratch, shared pose history or independent
animation clock.

### Exact evaluation order

1. `beginOperatorAnimationFrame` prepares bounded dt and seeks.
2. `updateOperatorAppearance` resolves equipment and visual materials.
3. Contact scheduling and leg IK consume authoritative movement/foot data.
4. Existing pose director, upper-body search, weapon fit, reload, action and
   hand IK evaluate their **working rig-local transforms** as before.
5. Existing trauma, dropped weapon and sling stages finish.
6. `finishOperatorPoseFrame` records presentation snapshots and cavity.
7. **Exactly one** `commitOperatorPoseOutput(r,p)` captures and publishes
   the complete named final frame, without extra smoothing or modifying
   physical outcomes.

### Important limit and future-overhaul seam

The compatibility solver still computes some intermediate transforms
*in place* on its working rig, because grips, chest rotations and leg
targets depend on each other during IK. This stage does not pretend that
the 61 KB legacy fit has become a pure function or that every intermediate
`.rotation` assignment has been eliminated.

Instead, there is now exactly one **public final output/commit owner** per
registered transform. The next overhaul can evaluate into those named
buffers directly, remove legacy intermediate mesh writes one pose family
at a time, and retain the public `poseOperator` API throughout. It must
retain the current contact and muzzle parity until golden comparisons
establish correctness. Future work must not add another finalizer or
post-commit pose pass.

## Verification / release gates

Dedicated Stage 4 tests:
- slot completeness and unique ownership, fixed capacity and array reuse
- one commit per pose call, explicit disposal and per-rig isolation
- identical deterministic outputs for low ready, short stock, reload,
  crouch, down and surrender through live/replay/Lab-style callers
- repeated timestamp stability, backward seek reversibility
- frozen replay-foot and animation input immutability
- structural proof that one commit follows trauma, sling and finalization

Critical integration retains original authoritative door, medical, combat,
civilian and replay SHA-256 fingerprints; animation integrity CI exercises
legacy IK, reload, muzzle, frame-stability and V3/V4 parity. Production
TypeScript/build and the previous Pages served-build checkpoint must pass.
Merge only after green CI, then verify the new public Pages build stamp.
Manual physical device and subjective aesthetic review remain outside the
automated completion gate.
