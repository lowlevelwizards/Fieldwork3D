# Consolidation Package B — B7: Workbench / Operator Tools Integration

**Production baseline:** B6 main `8df1ae75babf45ac38ef929f094a11a74085abc6` served successfully by GitHub Pages workflow `43148990311` with `Verify public Pages serves expected build` successful.  
**Feature branch:** `refactor/consolidation-b7-workbench-pose-integration`.  
**Intent:** eliminate the independent *visible transform writer* in the standalone Pose Workbench without redefining its artist-controlled IK targets or coupling Arsenal to an operator skeleton.

## 1. B7 source audit — observed architecture, not assumptions

| Surface | Original code | B7 disposition |
|---|---|---|
| Battle, replay, Operator Lab, Studio | `createOperatorRig/poseOperator`; B6 now stages all **30** B2 registered transforms directly and commits once | Preserve single tactical entrypoint and rendering/clock semantics |
| Pose Workbench | `applyWorkbenchPose` independently writes `rig.chest.rotation`, `rig.weapon.position/rotation/scale`, two `arm.upper/lower` and both `arm.hand` nodes; uses a **single** `solveTwoBone` per arm with an author-supplied elbow pole | Retain recipe and solver, route into B2 with shared B4/B5/B6 output components |
| Workbench UI | `rebaseFromReady` deliberately invokes tactical `poseOperator` once when selecting a platform, captures *actual* displayed targets, and authors edits independently; slider/blend playback is manual and not a tactical clock | Keep UI, JSON, authored references, transfer and frame timing unchanged |
| B6 pose scratch | `breach-operator-animation-frame.ts` already owns one per-rig `OperatorPoseScratch` WeakMap | Export a **read-only lifecycle accessor** for the same scratch; do not allocate a new authoring cache |
| B2 output | Six stable owners `lower-body / upper-body / frame / body / weapon / attachments`, validated 11-value slots, one atomic `commitOperatorPoseOutput` | Retain exact published shapes, time and stage order; editor may snapshot *unchanged* feet but must never write edited scene nodes mid-frame |
| Operator Studio | Temporary full operator rig, specialty graphic/toon lighting cleanup before disposal | Preserve exact detach → lighting cleanup → rig disposal |
| Operator Lab | Temporary rigs for gait comparison, kit variants and the main preview | Share only the detach/dispose pair; no combined viewer controller or shared UI state |
| Campaign kit preview | Separate full operator rig and on-demand WebGL renderer | Reuse rig release while preserving renderer and pointer teardown |
| Appearance grid | Reused temporary rig for thumbnails, with graphic/toon lighting restoration | Reuse same release and owner-specific cleanup order |
| Arsenal V2 viewport | Own **weapon-only** model with separate camera/renderer and no `OperatorRig` | **No integration** with pose pipeline. Keep its existing viewport, input, geometry and resource lifecycle |

**Audit outcome:** B7's important defect is the *Workbench’s independent transform publication*, not the 10+10 two-bone solver itself. Moving editor computation through the tactical strategy selector would remove intentional artist control. Similarly, forcing the Arsenal weapon-only model through B2 would increase coupling without providing a usable pose slot.

## 2. Complete change specification

### B7.1 — Manual authoring is authoritative within Workbench

Preserve WorkbenchPose v1 (stock, left/right shoulders, left/right wrists, elbow guides, torso and weapon XYZ degrees). Preserve real-weapon-socket stock conversion, independent hand targets, physical 10+10 segment limits, no-arm-stretch policy, and reporting of elbow-guide, wrist and grip gaps. Keep the independent shareable v2 pose library format, short-stock reference statuses, apply-to-all drafts, export/import, and local save/load exactly as before.

### B7.2 — Reuse the existing rig-local pose scratch

Expose `operatorPoseScratchForRig(r)` in `breach-operator-animation-frame.ts` and call it from both `beginOperatorAnimationFrame` and Workbench. This is a synchronous scratch getter, **not** a frame update or an additional WeakMap. It retains hand/weapon fallback continuity across ready → Workbench → tactical rebase, and does not advance replay time, footstep state or an action clock.

### B7.3 — Keep geometry, replace independent scene writes

`applyWorkbenchPose` still evaluates exactly one `weaponWorkbenchContacts` and one `solveTwoBone` for each arm. Replace direct scene writes with:
- B6 `beginOperatorFramePose` + direct `frame.chest.rotation`.
- B5 `beginOperatorEquipmentPose` + direct held-weapon position, Euler quaternion and length scale.
- B4 `beginOperatorArmPose`, `setOperatorArmSegments` and `setOperatorHandPose`; preserve old shoulder/elbow/wrist, local anatomical side and the weapon-Y hand yaw.
- Mutable editor-only diagnostics (`arm.bend/outOfReach`, `elbowSpread`) stay on the rig, as prior, but **no registered visible transform** may change until the completed B2 transaction.

### B7.4 — Publish one six-stage B2 frame

Call `beginOperatorPoseOutput` using the **existing** rig's `lastPose` time. For a completely new unposed preview rig only, use a neutral authoring time snapshot—never run the motor. Stage the untouched `lower-body` from existing visible feet, direct `upper-body` from B4, direct `frame/body` from B6, and direct `weapon/attachments` from B5; then commit the six stages exactly once. All 30 slots remain registered, finite and unchanged in shape. Editor updates must never invoke `poseOperator`, advance footsteps, alter actual inventory, retime reloads or recalculate a tactical weapon fit.

The B2 transaction rejects missing, invalid or non-finite outputs before visible commit. An invalid edit must leave visible anatomy untouched and be recoverable by the next valid edit. The stage-generic capture API remains for unedited lower-body support; it is read-only and does not create a second publisher.

### B7.5 — Narrow shared preview rig lifecycle

Introduce a minimal `releaseOperatorPreviewRig(host, rig, optional afterDetach)` that performs exactly scene removal, optional host-owned appearance/lighting cleanup, and `rig.dispose()`. Apply only to compatible temporary operator previews in Studio, Operator Lab, CampaignKitPreview, and appearance-grid thumbnail rigs. Guarantee `rig.dispose()` even if lighting cleanup throws. Retain each caller's scene/event/renderer/observer ownership and original specialty cleanup sequence. **Do not** change battle actor ownership or Arsenal's weapon-only viewport.

### B7.6 — Golden parity and isolation acceptance

Add `tests/package-b7-workbench-pose-output.test.mjs`, which implements a frozen independent copy of the original Workbench transform writer and compares every registered node and report, numerically, across M4A1, AKM, MP5 and shotgun plus authored extreme/manual poses. Verify output ID/values/slot count, one generation per edit, stable rig-local typed arrays, no changed foot contacts or last tactical pose time, invalid edit atomicity, JSON recipe roundtrip and multi-step blend, rebase from manual editing back to tactical ready, and isolation across multiple rigs. Test preview teardown order and B2 registry reset.

Keep existing `operator-pose-workbench.test.mjs`, `operator-pose-library-transfer.test.mjs` and `scripts/smoke-pose-workbench.mjs` **mandatory**. The latter checks mobile WebGL, repeated slider drag, all target selection, recipe export/import, AK reference, M16 draft, bulk transfer and desktop viewport; these cannot be inferred from Node unit tests alone.

### B7.7 — Critical cross-domain acceptance and release

Maintain B0–B6, Stage 11, action pose and V3/V4, operator motion, animation integrity, Studio, Operator Lab, architecture, CI typecheck/build, real-WebGL phone/desktop tactical/replay/Lab acceptance, plus dedicated mobile Workbench smoke. Update the dedicated Workbench smoke trigger to include the new shared scratch and preview lifecycle files. Commit on B7 feature branch, merge only when every required workflow passes at the **same exact** final feature head and the previous main Pages release is serving the expected commit. Detect real in-progress deployments; the old `43098274766` queued record may only be ignored if it still has zero jobs and was succeeded by the later same-SHA successful run. Post-merge, verify GitHub Pages build stamp at the new exact main SHA.

## 3. Risk audit and mitigations

| Risk / ambiguous plan outcome | Decision |
|---|---|
| Unifying Workbench with the *tactical* pose solver would discard manual shoulder/wrist/elbow control | Share IK primitive and output publisher only; no tactical action/policy selection in authored edits |
| A second Workbench pose buffer would create stale orientation when selecting presets | Use the exact same per-rig scratch already owned by animation frame |
| Naive equipment/attachment snapshot might erase currently displayed gear | Preserve current B5 reusable equipment components and B2 registry, test every slot and switch between weapons |
| B2 output publication could advance combat or replay time | Use existing pose timestamp for validation only; no scheduler/motor calls, no `lastTime` or `lastPose` writes |
| Loss of hand stock offsets or IK reach truth | Frozen reference tests use original `alignSegment` and `solveTwoBone` and compare the entire 30-slot pose plus diagnostic fields |
| Shared cleanup could destroy Studio materials in the wrong order | A single explicit optional after-detach callback executes exactly where legacy cleanup was performed; rig disposal runs in `finally` |
| Arsenal is a separate mesh/viewport, so merging its lifecycle into operator rigs would be spurious | Out of scope, documented explicitly |
| A green Node suite does not prove drag/import/renderer behavior | Keep real mobile/desktop Playwright Workbench smoke alongside shared tactical/Lab WebGL |
| Large controller and low-level helper cleanup would risk scope creep | B8 owns measured performance and safe dead-code consolidation; B7 makes no new controllers or solver retuning |

## 4. Closure ledger

- [x] Complete source and dependency audit, golden tests and focused scope decisions.
- [x] Integrate shared scratch, authored transforms, B2 publication and narrow preview teardown on branch.
- [x] Wire B7 golden and mobile Workbench smoke to CI.
- [ ] All final-head critical and phone/desktop browser checks green.
- [ ] Clear deployment queue, merge and verify exact B7 public Pages build.

Physical iPhone Safari, visual aesthetic acceptance and GPU hardware profiling are separate from automated Chrome emulation and intentionally not claimed.
