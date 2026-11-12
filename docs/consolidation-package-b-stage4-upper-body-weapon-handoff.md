# Consolidation Package B — B4: weapon, hand and upper-body pose integration

**Baseline:** B3 merge `c4ea035ab33d4b876a87a12e85fae7bb97117eb8`, successful exact-build GitHub Pages run `43136405457`.  
**Feature branch:** `refactor/consolidation-b4-upper-body-direct-output`.  
**Release:** one reviewed PR after final-head Package B, primary CI, architecture, motion, animation, phone/desktop tactical/replay/Lab WebGL and production-build gates all succeed.

## B4 objective and architecture boundary

Continue the B0 audit → B1 pure decision → B2 staged output → B3 direct lower-body migration by moving the **six upper-body bone/hand transform outputs** into reusable rig-local direct values. Preserve the one B1-selected handling/action/hand-owner decision, existing weapon socket and silhouette geometry, V3/V4 production-enabled fit search, authored low/short forms, and one final B2 pose publication.

The firearm's fit is still the **single selected final local fit** used for the visible held gun and hand contacts. It is not a second simulation shot origin; exact muzzle, collision, inventory and ammunition remain owned by gameplay. B4 must not replace all intermediate weapon-root, dropped-gun and sling scene transforms while existing downstream world-transform users still require them. That separate compatibility elimination is covered by B5/B6 only after parity proofs.

## Audited sources and authority map

| Surface | Authority and B4 treatment |
| --- | --- |
| `breach-pose-decision.ts` | One presentation handling/action/upper-body strategy decision. Reuse unchanged; no second action clock or new handling ranking |
| `breach-weapon-pose.ts` and `breach-unified-upper-body.ts` | Existing weapon-fit, coupled/coordination/support/fallback search and weapon family constraints; keep selection semantics unchanged |
| `breach-operator-animation-controller.ts` | Historical procedural arm transform writes, magazine-hand alignment and selected fit; migrate six arm writes to component output and send directly to B2 |
| `breach-ik.ts` | Shared B3 anatomical `alignSegmentComponents` remains the sole segment orientation kernel; no duplicate arm quaternion calculation |
| `breach-operator-pose-scratch.ts` | Existing per-rig IK scratch; add six reusable upper-body values (no second per-rig clock or solver state) |
| `breach-operator-upper-body-output.ts` | New small adapter for component alignment, hand Euler, AK rock and six direct slot values; **not** an upper-body strategy solver |
| `operator-pose-cavity-lighting.ts` / `breach-pose-frame-finalizer.ts` | Shader cavity now consumes staged upper-arm quaternions; retains old fallback mesh path for other callers |
| `breach-operator-pose-output.ts` | Remains the only final publisher for lower/body/upper/weapon/attachment/frame and the only public transform commit |
| `breach-operator-sling-pose.ts` / V4 handoff | Existing late sling and magazine/sling/chest movement unchanged; hand-driven mag position now reads the direct support wrist |

## Complete implementation scope

### B4.1 — Weapon fit and pose decision authority

Keep B1's `prepareOperatorPoseDecision` and `resolveOperatorPoseDecision` with exactly one action owner/handling sample and one rig-scoped handling transition per pose. Preserve authored short-stock precedence, coupled stationary AR/AK low-ready, coordinated V3 when eligible, V4 reload and clear/rejected fallback priorities. Reuse the final selected `fit` for visible firearm root, primary/support wrists, head sight accommodation and magazine operations. Do not introduce a new independent fit solver, clock or side-channel ballistic muzzle.

### B4.2 — Typed direct upper-body solution

Add exactly six stable slots in `OperatorPoseScratch.armOutput`, matching the B2 registry's IDs and order:
`arm-0-upper`, `arm-0-lower`, `arm-0-hand`, `arm-1-upper`, `arm-1-lower`, `arm-1-hand`.

Each uses the same 11-number position XYZ, quaternion XYZW, scale XYZ and visibility representation as B2/B3. Per-rig transforms and Euler scratch initialize once from the original rig, retaining previous quaternion fallback for degenerate limbs and preventing cross-actor state leaks. Every frame updates existing objects instead of creating new `Object3D` nodes, 11-number arrays, or callbacks.

### B4.3 — Replace intermediate arm mesh mutations

All four extant arm solution paths — (1) explicitly authored short-stock, (2) authored Lab switch at alpha zero, (3) coupled/coordinated pair, (4) fallback IK — must use the same `setOperatorArmSegments` component adapter and `setOperatorHandPose`, preserving shoulder/elbow/wrist and bend-plane choices. The solver may continue writing diagnostic `arm.bend`, `outOfReach`, `r.elbowSpread` and `r.gripError`; those are not scene bone transforms.

Do not write `arm.upper`, `arm.lower` or `arm.hand` transforms before the final commit. In the controller, replace `stageOperatorPoseOutput(r,p,'upper-body')` with exactly one `stageDirectOperatorPoseOutput(r,p,'upper-body',finishOperatorArmPose(scratch))` after hand and magazine choreography.

### B4.4 — Precise hand/weapon attachment continuity

Preserve firing/support grip fit and short-stock before/after blend, both weapon platform/socket geometry, V4 AR bolt catch / AK rocking / HK roller motion, and all reload carry/hand-owner timing.

The support hand used to manipulate an authored magazine must be **the same solved hand** published as `arm-0-hand`. Preserve the existing local Z-axis AK palm rotation (exact quaternion composition / Euler order) and hand-magazine position/rotation while avoiding a second post-solve bone write. Detached magazine receives the identical wrist and feed-lip offset as before. Keep magazine source identities and real pouch anchors.

### B4.5 — End-of-frame cavity and late actions

Cavity shading formerly read the mutable upper-arm mesh before the final B2 commit; now it must read the directly solved quaternions before commit, with the existing rig-mesh fallback preserved for Lab/unit callers. Never defer cavity evaluation to an unbounded RAF or introduce a late bone correction after commit.

Keep all late root trauma, weapon drop, sling and unarmed-preview ownership in their existing order. B4 does not rewrite those working-rig weapon transforms or their world-to-local math.

### B4.6 — Frozen parity and regression suite

Add `tests/package-b4-upper-body-output.test.mjs`:
- Against the exact pre-B4 `alignSegment` and `Object3D.rotateZ` math, compare all six direct output slots, support-hand AK rock Euler, and confirm original arm scene nodes are untouched during computation.
- All active presentation modes through AR M4A1, AKM, HK MP5 and shotgun and representative low/ADS/short/moving/crouch/reload/throw/door/treatment/down/surrender action states.
- Published slot values equal the final rig transforms; support-magazine alignment and finite weapon/grip/eye diagnostics.
- Post-IK cavity matches the final directly published upper arm, including exact deterministic seek/repeated-time output and buffered identities.
- One publisher, no leg regression, no extra frame clock, and explicit static assertions rejecting procedural arm-mesh writes.

Keep B0, B1, B2, B3, Stage 11, Closeout Stage4, all-weapon short-stock, V3/V4 action/hand/weapon tests, Workbench/Studio/Lab, replay, motion, architecture and browser gates green. Update historical structural source assertions to recognize the new direct upper-body stage and the cavity parameters instead of disabling coverage.

### B4.7 — Integration and production release

Commit to the B4 feature branch. Run dedicated Package B suite, primary changed-source tests, architecture, animation integrity, operator motion, production typecheck/build and real WebGL phone/desktop tactical/replay/Operator Lab acceptance. Confirm predecessor B3 exact Pages artifact was served. Handle the historic zero-job stale Pages record only using the project's strict superseded-run criteria; never bypass genuine active releases. Merge only at a clear checkpoint, and confirm the exact post-merge main build is live.

## Risks, mitigation and explicit deferrals

- **Multiple legacy arm writers:** Preserve their selection policy and harmonize output only; do not silently delete a still-active V3/V4 mode.
- **Holding/reloading correctness:** Magazine and hand must share the same solved wrist; an AK rotation is not a second hand solver.
- **Cavity timing:** Read direct quaternion, not last frame's arm mesh.
- **Continuity:** Use each rig's own output and original degenerate quaternion fallback; deterministic playback may not accumulate render history or move recorded footstep contacts.
- **Upper-body aesthetics:** No retuning elbow separation, wrist offsets, stock fit, joint limits, clips, weapon geometry or authored poses.
- **B5/B6 deferral:** Held/dropped firearm root, other action-attachment scene writes and torso working transforms are intentionally not claimed pure in B4. They still feed world-to-local calculations; retire only after their respective golden evidence.
- **Device validation:** Automated Chrome phone/desktop WebGL checks do not constitute physical iPhone Safari or subjective visual QA; these remain unclaimed.

## Completion ledger

- [x] Complete B4 source audit and scope definition
- [x] Direct six-slot arm output and magazine/cavity handoff implemented on branch
- [x] Focused B4 tests and Package B CI wiring authored
- [ ] Final-head focused and cross-domain workflow results green
- [ ] Safe merge and exact served production deployment verified

Do not mark the last two complete before the evidence exists.
