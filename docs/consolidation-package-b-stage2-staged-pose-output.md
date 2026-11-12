# Consolidation Package B — B2: direct staged operator pose output

**Baseline:** B1 merged on `main` at `539f92c2617bc723e4c47b3c10b551897de2d659`; its Pages deployment (run 43131503972) succeeded before B2 development.
**Branch:** `refactor/consolidation-b2-staged-pose-output`.
**Boundary:** renderer-only outputs, no additional animation clock, no weapon/ballistic, motor, foot scheduler, replay schema, inventory, geometry, visual art or physics changes.

## Goal and scope

B0 inventoried pose-transform ownership; B1 unified the *decision* consumed by the existing controller. B2 makes **all published local pose transforms** explicit, owner-addressed, complete and transactional, rather than letting the last mutable rig state be captured opportunistically by the commit. It is a migration seam for B3–B6's direct solvers, **not** a claim that all intermediate procedural rig writes are already gone.

### B2.1 — typed output taxonomy

The existing `breach-operator-pose-output.ts` registry remains the **one** final publisher. Its original registered slots and owners are preserved:

| Owner | Registered local output |
| --- | --- |
| `frame` | canonical root and +X legacy frame |
| `body` | pelvis, chest, head |
| `lower-body` | left/right upper and lower legs, shoes, ankle cuffs |
| `upper-body` | left/right upper/lower arms and hands |
| `weapon` | held and dropped weapon roots |
| `attachments` | inserted, hand and detached magazines; reload control, medical kit, backpack and all sling straps |

No costume subtree, graphics camera, world-placement adapter, collision volume, shot origin or authored socket is promoted to pose authority. Every named output has one registered node, one owner and one current rig, with registration rejecting duplicate IDs and duplicate nodes.

### B2.2 — rig-local pending stage buffers

- Preserve the existing published 11-float layout (`position XYZ + quaternion XYZW + scale XYZ + visible`) and stable `inspectOperatorPoseOutput` object/arrays.
- Add one additional set of **bounded, reusable** per-slot pending arrays and per-owner index tables, initialized once per rig, freed on its existing dispose path.
- `beginOperatorPoseOutput` starts one timestamped candidate frame without modifying published values.
- `stageOperatorPoseOutput` captures a **final** working-rig owner's transforms into its own pending region; same-stage duplicates, non-finite transforms and wrong timestamps are rejected.
- `stageDirectOperatorPoseOutput` accepts a *complete, ordered* typed list of slot values from a future pure solver; requires precisely the registered IDs and 11 finite entries per slot; it never reads or changes scene transforms.
- Neither API advances time, contacts, authoritative action state or sim ticks. The direct API is implemented and executable, but production writers remain transitional until their individual B3–B6 parity gates.

### B2.3 — ordered solver handoff

`poseOperator` is still the sole production pose entrypoint. Its B1 decision, transition and existing solve order are unchanged.

1. Begin B2 pending output after the existing seek-aware animation frame begins.
2. Sample recorded or live foot contacts, solve leg IK, stage **lower-body** after its final writer.
3. Solve the active arm and magazine-hand choreography, stage **upper-body** after all arm adjustments (including AK magazine rock), before late trauma.
4. Apply trauma/fall/root reactions, dropped weapon placement, sling updates, and the finalizer (including unarmed visibility).
5. Stage **frame**, **body**, **weapon**, **attachments** only after all late modifiers. These are the final local transforms for those owners.
6. Call **one** `commitOperatorPoseOutput(r,p)`, which refuses to publish unless all six owners have staged at the same timestamp. The commit copies pending values to published buffers and applies only changed transforms. It increments generation precisely once.

The normal production stage order is `lower-body → upper-body → frame → body → weapon → attachments → commit`. Snapshotting an owner after its last writer avoids a fallback second commit or a late “corrective” publisher.

### B2.4 — parity and data authority

Preserve current locomotion, gait/recorded feet, low/high/ADS/short, authored short-stock, coordinated fallback, V3/V4 active reload paths, magazine insertion, action hands, down/surrender, injury, sling, frame continuity, legacy +X orientation and canonical -Z root. The 60 Hz combat clock, muzzle/shot/collision and scene X/Z positions remain unchanged. Lab manual switches and strict-contact variants remain optional. Workbench continues as a separately scoped offline authoring tool and is **not** silently reclassified as a production pose-output producer.

### B2.5 — fail-closed contracts and tests

`tests/package-b2-pose-output.test.mjs` covers:

- All public anatomical/equipment output slots and six unique owners.
- Duplicate/missing/wrong-timestamp stage rejection with no partially published frame.
- Values staged before a later working-rig mutation actually winning at final commit.
- Complete direct typed stage acceptance, strict ID/owner checks, and no direct-stage node writes.
- Non-finite value rejection without loss of previous published output.
- Two-rig isolation, bounded stable per-slot published buffers and clean disposal.
- Deterministic replay rewind and timestamp idempotence; stage ordering and a single final commit after the finalizer.

Keep existing B0 census, B1 policy, Stage11, Closeout Stage4, contact, IK, reload, all-weapons short-stock, motion, Lab/Workbench and Studio/browser gates. CI must include the B2 tests and `npm run build`.

## Definition of done

- [x] New staged owner taxonomy and typed direct stage input.
- [x] Reusable per-rig pending buffers, no new per-frame object tree/clock/renderer.
- [x] Named lower/upper/frame/body/weapon/attachment stage handoff, single guarded final commit.
- [x] Preserve stable existing output buffers and published pose API semantics.
- [x] New isolated/negative/parity regression contract registered in Package B workflow.
- [ ] CI and focused WebGL/browser job results at the **final** PR head.
- [ ] Safe production checkpoint and exact GitHub Pages stamp verification, **only** if no queued or running earlier release.

## Audited deferrals

B2 does **not** remove every intermediate `r.hip`, `r.chest`, leg, arm, and magazine transform assignment. Those writers are still live, feed other dependent calculations (weapon fitting, IK, cavity, drop world-to-local conversion), and cannot be removed merely because the final output is now staged. B3–B5 will migrate concrete leg/body/weapon/hand solutions under golden output constraints; **B6** retires transitional working-rig mutations and confirms that the direct stage interface is the only production bone-output path.

Do not mistake six staged local outputs for six alternative final publishers. There remains **one** published pose, with one generation increment, through `commitOperatorPoseOutput`.

## Release record

- Baseline main: `539f92c2617bc723e4c47b3c10b551897de2d659`
- B2 PR head / dedicated workflow: pending
- Primary CI, architecture, motion, animated WebGL / replay and Lab acceptance: pending
- Pages predecessor verified as successful run `43131503972`
- Live exact B2 stamp, iPhone Safari subjective review and physical GPU profiling: not yet claimed
