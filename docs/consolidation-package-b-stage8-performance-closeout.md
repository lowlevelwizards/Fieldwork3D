# Consolidation Package B — Stage B8: measured performance, verification and final closeout

**Baseline:** B7 main `0dcb02eb23cf786c7414c9a52c5b455a18f051e0`. Exact publicly served Pages build verified by successful workflow `43151758232` (including `Verify public Pages serves expected build`).  
**Branch:** `refactor/consolidation-b8-performance-closeout`.  
**Intent:** finish Package B without introducing new animation systems or trading proven tactical parity for speculative speed.

## Codebase audit and final ownership map

The B0 census now recognizes exactly one public tactical `poseOperator` evaluator and one B2 `commitOperatorPoseOutput` implementation. B7's offline Pose Workbench is the only other explicitly authorized caller of that same commit, with its own manual authoring calculations but no gameplay clock. The B2 registry has exactly **30 registered nodes** with six unique direct-stage owners:

| Stage | Nodes | Source |
|---|---:|---|
| lower-body | 8 | B3 recorded/live foot contacts and leg IK |
| upper-body | 6 | B4 constrained arm IK and action handoffs |
| frame | 2 | B6 non-rendered root and legacy transform hierarchy |
| body | 3 | B6 pelvis, chest and head |
| weapon | 2 | B5 held/dropped firearm components |
| attachments | 9 | B5 magazines, control, medical, pack and three sling spans |
| **Total** | **30** | One B2 atomic validation and commit |

The architecture already has rig-local stable output buffers, scratch-owned quaternions for IK, independent actor replay time, direct source stages, and a single publication point. The evaluator remains about 1,179 lines but size alone is not a valid reason to extract another controller. The old generic stage/capture path has **diagnostic/test compatibility callers**, so it must not be removed merely because the six production stages are direct. Weapon assembly rebuild, magazine model child geometry, appearance updates, and tactical simulation retain separate owners.

## B8.1 — Reproducible measurements first

Add `scripts/bench-operator-pose-pipeline.mjs` and `npm run bench:operator-pose`. Measure CPU time **per posed operator** with 2, 8 and 16 concurrent rig instances in fixed worksets, after a dedicated warm-up:
1. Steady motion and ready/low presentation.
2. Tactical movement, crouch/ADS/short-stock/reload/down action transitions.
3. Deterministic recorded contact replay with reverse seek.
4. Manual Workbench authoring for 2 and 8 rigs.

Measure median, 95th percentile, max per-batch pose time, pose count, published output slot completeness/generation and heap observation; record Node/arch/platform/number of samples in JSON. Use **same** benchmark script before and after changes on the same GitHub runner class. Report comparisons only as indicative and avoid hard performance thresholds: CI host contention, JIT, GC and changed source trees make cross-run wall-time comparisons non-scientific.

`--quick --out artifacts/package-b8/pose-performance.json` is the required CI probe. Full command remains opt-in for deeper CPU experiments. **These are Node CPU measurements, not game FPS, GPU frame time, iPhone thermal behavior or browser memory leaks.**

## B8.2 — Lowest-risk measured hot-path cleanup

The animation controller has narrow, confirmed temporary allocations in:
- The V3 coordinated torso lean assist: a new vector and quaternion allocated for each active clear-body coupling calculation (despite a comment saying there are no allocations).
- Lab-authored hip retarget: two quaternions allocated per blending frame.
- Lab-authored chest retarget: two quaternions allocated per blending frame.

Add **one** reusable vector and **three reusable quaternion scratch values in the existing B3–B6 per-rig `OperatorPoseScratch` (one lean quaternion plus a blend from/to pair: **three quaternions**) and replace those ephemeral allocations with `set`/`setFromEuler`. Preserve the original `slerp`, Euler order, angles, blend phases, positions and action selection. No temporary objects are shared across rigs and no live scene node is written until final B2 commit. Do not 'optimize' deeper fitting algorithm variants without a profiler demonstrating a bottleneck and separate golden acceptance.

**Before accepting:** verify numerical parity of the old quaternion/lean equations over randomized-looking *deterministic* angles and all B3–B7 golden paths, and inspect CI benchmark before/after. A small or noisy timing delta is reported as such, not exaggerated.

## B8.3 — Final cross-mode and lifecycle verification

Add `tests/package-b8-pose-closeout.test.mjs` asserting:
- 30 registered nodes, distinct IDs, six direct owner stages, exactly one production commit and one B2 commit implementation.
- Repeat poses on 2/8/16 rigs with stable published typed buffer identity, complete finite values, no cross-rig scratch contamination, and registry reset at disposal.
- Replay seek and same-time evaluation parity under recorded foot contacts, and independent actor action clocks.
- Workbench authored handoffs and JSON format still reconcile with normal tactical rebase; no motor/inventory mutation.
- Correct retarget quaternion and torso offset math, including Euler XYZ, interpolation and signed-zero preservation.
- Benchmark harness correctness (finite, nonzero counts and physical-device caveat), without any absolute CI performance gate.
- Producer contracts remain free of alternative gameplay rendering authority, new controller, simulator clock or generic source-stage production writes.

Keep B0–B7 golden tests; legacy pose, V3/V4 action reload/muzzle, replay and contact tests; critical integration/release readiness, operator motion, animation integrity, actual WebGL phone/desktop tactical/replay/Operator Lab, Studio and dedicated Workbench mobile smoke. Execute only relevant independent specialized gates, not a full unbounded test suite.

## B8.4 — Final disposition and residual risk register

Document before/after CPU evidence and what was and was not proven. Close all B0–B8 task scopes with source SHA, approved tradeoffs, ownership map, remaining compatibility APIs and deliberate exclusions. Preserve current animation aesthetics, movement physics, firearm semantics and gear materials. Any future major pose refactor should be supported by a measured performance ceiling or a gameplay feature—not continuation for its own sake.

Known deferred/legitimate work:
- Real iPhone Safari/device GPU and heat testing, optional GPU CPU-vs-render frame breakdown, and subjective pose silhouette comparison.
- Tactical gameplay systems: enemy encounters, team movement, tactical feedback and post-action presentation. Not architecture closure blockers.
- `breach-operator-animation-controller.ts` large size, legacy visual-only V3/V4 branches, Workbench editor UI and actual attachment geometry remain; no blind code deletion without dependency proof.
- B2 generic capture remains available for diagnostics; one *implementation* with two authorized callsites, not two independent writers.

## B8.5 — Merge and release protocol

Commit stage updates to the B8 feature branch. Require every critical workflow at the **exact final PR head**. Confirm prior B7 Pages run `43151758232` served the exact SHA. Check no genuinely active deployment before merging; the historical `43098274766` queued **zero-job** record is an exception only if its later same-SHA Pages deployment `43129618363` remains successful. Merge once at the stable release checkpoint; verify new main SHA, completed Pages workflow and successful **Verify public Pages serves expected build** at the exact merge SHA.

## Closure ledger

- [x] Audited ownership, reachable production branches, current published slot counts and remaining temporary quaternion candidates.
- [x] Scoped a read-only reproducible performance probe, compatibility boundary and safe allocation change.
- [ ] CPU baseline and post-change evidence gathered; documented honestly.
- [ ] All B0–B8 / cross-mode / browser / build gates green on exact final PR head.
- [ ] One safe main merge and Pages exact served build verified.

*This document records the planned architecture and should not claim the last gates completed until actual workflow evidence exists. Release PR closeout may carry the final verified SHA without triggering a docs-only deployment.*
