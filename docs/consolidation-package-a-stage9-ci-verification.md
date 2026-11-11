# Consolidation A9 — CI, verification and obsolete-test consolidation

**Baseline:** A8 released at `09083275` (Pages `09083275ebc1-mwceqmqp`); A9 branches from `116dd69b87b4e7e7f5e63d9f135fa33597d8fa14` after concurrent After Action V4 Stage 3 integration.  
**Change boundary:** GitHub Actions, verification entrypoints, test-selection contracts and documentation. No simulation, rendering, replay, save, movement, combat, equipment or content changes.

## A9-A — Audited inventory and decisions

On the integration baseline, `.github/workflows/ci.yml` is 2,105 lines (about 198 KB), with **401 named steps** across seven jobs, **375 conditionally selected steps**, **714 distinct explicit test references**, and **37 separate invocations** of the same Pages preflight. The repeated release-era branches are not proof that their tests are obsolete. Many are still unique coverage of weapons, visual systems, the campaign, UI, generated sites, replay and previous fixes.

The supported repository contains about 1,300 Node test entry files, more than fifty named workflows, and two intentionally maintained architectural acceptance paths: `scripts/verification/breach-critical-suite.mjs` (authoritative architecture and replay domains) and `.github/workflows/closeout-stage6-browser.yml` (real WebGL phone/desktop tactical flow, bodycam and Operator Lab). `npm test` already provides the complete test discovery path.

**Current open-PR compatibility review:** the current PR list includes historical draft work on replay controllers and P9 performance, the LOOK/WATCH bug fix, verification stabilization, and long-recording replay. The A9 gate must not change their code, change the public Pages artifact, or discard their independent opt-in checks. `perf/scene-frame-p9-` had a named selective CI gate, so the generic change-path selector must cover scene-frame changes instead of depending on that historical branch name. Historical full-suite tests remain accessible through `npm test` and an opt-in/manual Actions path.

## Complete scope and acceptance

1. **A9-A Census and freeze:** report conditional, duplicated, test-only and active gates; preserve prior evidence and branch-specific exceptions needed for live PRs. Never infer dead tests from duplicate references.
2. **A9-B Common critical verification:** replace branch-name-only gates in primary CI with deterministic, bounded baseline and changed-path coverage for simulation, movement, doors, fog, replay, debrief, operator presentation, campaign and mission flow. Maintain independent curated architecture gate.
3. **A9-C Retire obsolete CI duplication:** remove previous one-off branch conditions and repeated preflight commands from the active CI workflow. Preserve test files and opt-in full-suite execution. Do not delete special visual audits or workflows without independent consumer/cost analysis.
4. **A9-D Self-verification:** test the selector, path patterns, coverage contracts and missing-test detection. Fail closed for unknown `src/` changes to avoid accidental under-testing.
5. **A9-E Release safety:** keep TypeScript and production build, architecture-boundary audit, existing real-WebGL phone/desktop acceptance, a single explicit release preflight and the Pages job's exact served-build verification. Validation must not deploy or pile commits onto a running Pages job.
6. **A9-F Integration:** check branch Actions, inspect any failure, prove source-only changes have no gameplay/runtime diffs, and merge only after the previous main Pages run has succeeded and serves its expected stamp. Verify the new deployed stamp after merge. Physical iOS Safari and desktop GPU remain manual hardware acceptance, not implied by headless tests.

## Preservation rules

- No `tests/*.test.mjs` files are deleted merely because their branch-name CI invocation is removed.
- `npm test`, focused individual test files, and a manual full regression workflow remain available. Asset, lighting, replay-video and browser workflows are not collapsed into Node-only assertions.
- Changes to `src/` not recognized by specific domain selection execute the broader critical suite, not a no-op.
- A9 must never change the release queue: CI and preflight verify; only `pages.yml` publishes after a deliberate merge to main.
- The A8 session isolation and AAV4 Stage 1–3 contracts remain covered.

## Verification commands (after implementation)

```sh
node --test tests/ci-regression-plan.test.mjs
node scripts/verification/ci-regression-plan.mjs --check
node scripts/verification/ci-workflow-contract.mjs
node scripts/verification/ci-regression-plan.mjs --list --files src/breach-world-context.ts
node scripts/verification/ci-regression-plan.mjs --run --files src/breach-world-context.ts
node scripts/verification/breach-critical-suite.mjs
node scripts/verification/breach-architecture-boundaries.mjs
npm run build
```

**Release status:** Development branch only until the complete gate and release criteria above have been met.
