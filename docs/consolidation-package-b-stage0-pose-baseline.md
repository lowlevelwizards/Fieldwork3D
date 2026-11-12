# Consolidation Package B — B0: animation architecture audit and frozen baseline

**Production starting point:** A10 main `76391519873120fa1b9011c17a0c8eeb317f63fb`, public Pages `763915198731-mwci6p1z`.  
**Status:** B0 implementation on its own feature branch, pending integration acceptance and one safe release.  
**Change boundary:** documentation, inventory/audit script, fixtures, a dedicated narrowly scoped CI workflow. **No runtime/pose logic, visual meshes, save/replay formats, motor, weapon simulation, or aesthetic tuning.**

## Objective and full B0 scope

B0 maps the architecture that B1–B8 will *replace internally* without redefining live simulation or destroying approved pose silhouettes. Its exit is a reproducible, reviewable evidence trail and a safe migration plan, **not** a rewritten solver.

1. **B0.1 — Census.** Enumerate all live pose entrypoints, direct callsites, rig construction/disposal, animation-phase modules, transform producers, compatibility and Lab-only branches, and CI/visual verification paths.
2. **B0.2 — Source of truth.** Document every public anatomical/weapon/attachment slot, its current output owner, its in-place working rig writers, and the *separate* motor, foot contact, weapon muzzle and world-position authorities. Document the alternate workbench editor without mistaking it for a second tactical pose clock.
3. **B0.3 — Parity freeze.** Confirm the existing public input/output contracts and final commit boundary with tests for the 60 Hz-derived replay contacts, rig-scoped frame/disposal, low/high/ADS/short/reload/down/crouch, hand/weapon fitting, and live/replay/Lab/Studio adapters.
4. **B0.4 — Risk register.** Mark which V3/V4 routes are production active; which are debug-only, preview-only, or preserved references; classify double-writes, duplicated decisions, pose continuity, weapon-family coupling, hardcoded assumptions, and performance.
5. **B0.5 — Repeatable audit and CI evidence.** Provide an inspectable script emitting a machine-readable JSON and human-readable Markdown census, validating non-negotiable boundaries and tests. Run targeted animation/pose/rig/motion regressions plus TypeScript/build. Retain the authoritative architecture and existing real WebGL phone/desktop smoke.
6. **B0.6 — Final acceptance and release.** Verify exact PR head, CI and WebGL jobs, and public predecessor build; merge only when Pages has no pending work; confirm post-merge Pages serves the new commit. Hardware-specific subjective review is a separate task.

## Verified codebase audit (B0 source baseline)

| Surface | Observed current structure | Ownership / consequence |
| --- | --- | --- |
| Pose API | `src/breach-operator-animation-contract.ts` exposes `OperatorPose`; `src/breach-operator-rig.ts` exports `poseOperator` as compatibility entry | Keep one stable API through B1–B8, without modifying motor, weapons or inventory |
| Rig creation | `breach-operator-rig.ts` builds canonical -Z root and legacy +X compatibility frame; `dispose()` resets pose-output registry | Retain canonical/legacy coordinate conventions and all live garment/material/attachment nodes |
| Main evaluator | `breach-operator-animation-controller.ts` ~1,183 lines/~61 KB with 46 imports, multiple intermediate in-place transforms, and **one final** `commitOperatorPoseOutput(r,p)` | This is the primary complexity hotspot; existing final commit is not evidence of a pure, side-effect-free solver |
| Published output | `breach-operator-pose-output.ts` creates a WeakMap per rig with **11-value** buffers, unique node ownership, final capture and commit | Do **not** create another final output owner; B2/B6 should use/extend this published registry |
| Phase lifecycle | `breach-operator-animation-frame.ts` bounds dt, resets on seek/discontinuity and keeps scratch per rig | Temporal blending may occur only when explicitly allowed; deterministic replay cannot inherit render history |
| Contact/IK | `breach-operator-lower-body.ts` selects `validatedReplayFeet` or `advanceFootsteps`, and applies IK; `breach-live-gait.ts` identifies production hybrid with optional legacy comparator | Recorded simulation contacts are authoritative; IK cannot invent or teleport a planted step |
| Decisions | `breach-pose-director.ts` chooses handling/action and upper-body eligibility; `breach-pose-transition-director.ts` owns transition history | B1 builds on these policies, without creating an independent action/handling clock |
| Upper-body families | `breach-unified-upper-body.ts`, `breach-pose-v3-*`, `breach-reload-v4-*`, `breach-weapon-pose.ts` and 61 KB controller use coupled, coordinated, fallback, and bespoke short-stock/reload strategies | Name *intermediate* writer ownership and fallback precedence; do not delete still-referenced paths by filename |
| Frame finalization | `breach-pose-frame-finalizer.ts` and `breach-operator-sling-pose.ts` finish trauma/sling/cavity before the published commit | No post-commit correction stage for anatomy, weapon, or magazines |
| Tactical/replay | `breach-3d.ts` calls `poseOperator` using live actor or recorded motion/feet; replay sets deterministic input; visual root scene placement is separate | Historical information and shot-time muzzle remain simulation-owned, not controlled by visual bone transforms |
| Operator Lab | `breach-operator-lab.ts` uses the same API, but intentionally supports optional V3/V4 comparisons, manual handling, strict-contact diagnostics, and historical/hybrid gait comparison | Never promote Lab-only test conditions to production defaults |
| Studio | `operator-studio.ts` uses shared API with deterministic neutral pose and optional **24 fps** armed idle presentation | Studio's preview clock is visual-only and must never tick Session or introduce shot authority |
| Pose workbench | `operator-pose-workbench.ts::applyWorkbenchPose` directly writes a preview rig's chest/weapon/arm transforms for authored target editing | **Existing intentional second preview writer**, not yet part of the published `poseOperator` commit; B7 must route this through the shared output pipeline only after editor fidelity tests |

The source audit distinguishes **public commit ownership** (already centralized) from **intermediate in-place transform writes** (still spread among the controller, leg IK, trauma/finalizer, reload attachments and independent workbench). Declaring the latter resolved would be inaccurate.

### Current output registry: protected roles

- **frame:** `root`, `legacy-frame`.
- **body:** `pelvis`, `chest`, `head`.
- **lower-body:** left/right upper leg, lower leg, shoe, ankle link.
- **upper-body:** left/right upper arm, lower arm, hand.
- **weapon:** held and dropped weapon roots.
- **attachments:** inserted/hand/detached magazines, reload control, medical item, pack, and each sling strap.

These are output slots, not full mesh/object trees. Camera, collision, exact physical barrel origin and cosmetic authored sockets must not be reclassified as animation output without a specific parity proof.

### Active versus special-purpose paths

- **Live production:** `breach-3d.ts` explicitly supplies `poseV3Preview:true` and `poseV4ReloadPreview:true`, so a V3/V4 filename is **not** evidence that code is obsolete. `hybridSupport:true` is active in live/replay presentation.
- **Replay:** `replayFeet`, pelvis/travel yaw, acceleration and deterministic timeline are supplied by the existing recording/scene pipeline; backward seeks reset history.
- **Lab:** query-selected `poseV3Preview`/`poseV4ReloadPreview`, `poseV3StrictContact`, editable handling transitions, diagnostic reports, historical gait comparison, and optional visual overlaps are not baseline combat semantics.
- **Studio:** deterministic paused outfit/pose snapshot and optional bounded idle preview animation; separate material/appearance edits do not change the tactical pose solver.
- **Workbench:** direct transforms are deliberate offline editing; cannot be promoted as gameplay IK or counted as a second final combat pose commit.
- **Compatibility:** canonical root versus legacy +X skeleton, historical event scheduler, previous V3 contact/short-stock/reload paths, and compatibility exports remain until individual golden evidence demonstrates retirement is safe.

## Risks and decisions for B1–B8

| Priority | Risk | B0 decision / successor |
| --- | --- | --- |
| P0 | Working rig transforms can be assigned by several intermediate stages; final output currently copies their *result*, not a pure computed pose | B1/B2 define immutable decision and staged output; B6 removes working-rig writes with test-proven parity |
| P0 | Visual muzzle/weapon fit diverges from authoritative firing and collision clearance | Never move shot/ballistics authority; B4 compare sampled contacts, origins, and family geometry across live/replay |
| P0 | Replay foot targets/seek time can inherit Lab or render-frame history | B3/B8 preserve recorded contact identity, pose seek reversibility, no new motor clock |
| P1 | V3/V4 branches, coupled search, fallback, strict-contact and manually authored short-stock can choose conflicting strategies | B4/B5 make one explicit precedence table and retire each strategy only after case-by-case parity |
| P1 | Magazines, support/firing hands, thrown/dropped gun, trauma, sling and action attachments have separate late stages | B2/B4/B6 assign named stage writers and one ordered commit; ensure no late post-commit changes |
| P1 | Workbench authoring writes the rig directly while normal Studio/Lab use `poseOperator` | B7 preserve pure editing targets but avoid directly modifying a shared active live/replay rig |
| P1 | Cross-mode pose flags and clocks vary legitimately | B1 input normalization may be introduced only with explicit mode-specific default preservation |
| P2 | The large controller remains an allocation/performance/maintenance risk | Profile before partitioning; do not mistake lines saved or an extra controller class for performance |
| P2 | Operator Studio/Arsenal/Operator Lab appearance/rig setup and cleanup overlap | B7 share narrowly owned setup/disposal primitives, not all three UX workflows |
| P2 | Standalone specialized visual workflows have historical branch filters and optional browser setup | Preserve the independent critical browser gate, name missing hardware coverage, do not claim unattended device tests |

## Baseline test matrix and evidence

**Minimum automated contract:** 
`breach-roadmap2-stage11-animation.test.mjs`,
`breach-closeout-stage4-pose-output.test.mjs`,
`breach-pose-director.test.mjs`,
`breach-pose-transition-director.test.mjs`,
`breach-pose-v3-baseline.test.mjs`,
`breach-reload-v4-rig.test.mjs`,
`breach-motion-22.test.mjs`,
`operator-lab-unified-poses.test.mjs`,
`operator-pose-workbench.test.mjs`,
`breach-unified-pose-stability.test.mjs`, plus the B0 census fixtures.

**Independent acceptance:** A10 primary changed-path CI, A0–A10 architecture suite, simulation critical suite, real Chrome/WebGL tactical + replay/Bodycam + Operator Lab phone/desktop jobs, and TypeScript/Vite production build. Operator Studio's existing smoke remains available as an independent workflow; B0 does not claim full visual review merely because the shared `poseOperator` input is unchanged.

**Audit command:**
```sh
node --test tests/package-b0-pose-audit.test.mjs
node scripts/verification/package-b0-pose-audit.mjs --check --json artifacts/package-b0/audit.json --markdown artifacts/package-b0/audit.md
node --experimental-strip-types --test tests/breach-roadmap2-stage11-animation.test.mjs tests/breach-closeout-stage4-pose-output.test.mjs
npm run build
```

**No visual/tactical runtime source files change in B0.** The generated reports are Actions artifacts, not shipped game assets.

## B1 handoff constraints

1. Define a *read-only decision value* from current director and transition policy, preserving every input and emitted mode.
2. Reuse the existing `OperatorPose` contract and `OperatorPoseOutput` registry.
3. Do not merge an alternate director, new foot scheduler, new frame clock or second authoritatively committed arm/weapon solution.
4. Before retiring a V3/V4 or legacy branch, prove zero live caller, replay, Lab, Studio, workbench, test and tooling consumer dependencies; record golden low-ready, ADS, short-stock, reload, crouch, down, surrender, all weapon families, and recording seek parity.
5. Preserve this B0 audit in CI; update its ownership map intentionally when B1–B8 change boundaries rather than masking drift.

## Release closeout ledger

- Feature branch: `refactor/consolidation-b0-pose-baseline`
- PR and verified SHA: pending.
- Source changes: **none**.
- Audit/fixture/CI/real-WebGL/build acceptance: pending.
- Previous main Pages build: `763915198731-mwci6p1z`, verified before work; recheck at merge.
- Production served stamp after merge: pending.
- Physical Safari, human-reviewed visual parity and device GPU performance: not claimed.
