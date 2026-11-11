# Consolidation A10 — Final integration and architecture closeout

**Baseline:** main `b81f3aad5ecb15b2bf910a426485e47652de3a84`, the A9 production-verified release (`b81f3aad5ecb-mwcg4pxb`).  
**Plan status:** A0–A9 completed the original ten-package run. A10 is an explicit extra closeout/stabilization package, not Roadmap 2 Stage 10 or an After Action V4 stage.  
**Scope:** CI regression selection, architecture closeout runner, verified coverage invariants, final acceptance, and documentation only.

## A10-A — Baseline, risks and scope freeze

1. The existing A9 selector adds an always-on fixed-clock/world/disclosure/replay/debrief baseline and tests chosen from filenames in `src/`. It **does not execute a modified test file merely because that test changed**. Therefore a test-only regression can be green without running its own changed assertions.
2. Changes under `tests/` (helpers, fixtures), `scripts/` (verification and browser smokes), root production entries (`index.html`, `breach.html`, `vite.config.ts`), and non-`src/` runtime assets also need a conservative fallback. Documentation-only changes need not trigger every historical suite.
3. A0–A8 each have independent acceptance tests. Their combined closeout is not currently one named repeatable command and must be proved independently of its PR-branch prefix.
4. Preserve the established release barrier. A9's production build is served. New code may coexist with After Action V4 work on another branch, but cannot override live changes, merge during an active Pages publish, or claim a device acceptance that headless Chromium cannot provide.

**Negative scope:** no gameplay, mission, generator, UI, weapon, animation, replay format, save, simulation clock, RNG, fog, renderer or screenshot modifications. No broad deletion of historical tests. No restructuring of previously intentional compatibility adapters.

## Full acceptance deliverables

### A10-B — Targeted CI hardening
- Newly added or edited `tests/**/*.test.mjs` are run directly alongside the baseline. A deleted test is **not** passed to Node as a missing filename; it triggers broad critical coverage and remains visible in selection diagnostics.
- Changed `tests/` helpers/fixtures, `scripts/` verification or smoke runners, runtime entry HTML, root build configuration, deployable assets and unknown runtime paths receive the curated fallback.
- Pure documentation changes retain the lightweight baseline. Source-domain selection, de-duplication and independent branch naming remain unchanged.
- Both the existence checks and CLI invocation are tested; actual CI compares the pull request diff against `origin/main`, never a stale local base.

### A10-C — Package A integration contract
- One tracked closeout runner covers A0 inventory, A1 legacy removal, A2 persistent configuration, A3 application flow, A4 targeting, A5 replay presentation, A6 main composition, A7 game façade, A8 isolated world context, plus source boundaries and A9/A10 test-plan contracts.
- Keep this runner distinct from full `npm test` (approximately 1,300 historical tests): critical checks should remain quick enough for routine integration.
- CI must advertise, execute and validate the closeout runner on consolidation changes; future maintainers can invoke it directly.

### A10-D — Real evidence
- Run selector unit tests and the package acceptance tests on GitHub CI, architecture/authoritative suite, production TypeScript/build, browser tactical/replay/operator-Lab acceptance.
- Retain A0 reachability evidence and declare static-analysis limits, continued legacy adapters, and hardware acceptance boundaries. Do not silently claim tests cover physical iPhone Safari or dedicated desktop GPUs.

### A10-E — Documentation and handoff
- Record which modules remain compositional, which subsystem owns authoritative simulation/world state, which interfaces are intentionally compatible, and what remains deferred.
- Make source/test changes auditable; leave manual full-suite and specialized workflows available.

### A10-F — Release checkpoint
- One feature branch and a reviewable PR. Before merge, verify all relevant Actions green, preceding main Pages run successful, no pending or queued Pages jobs, and public Pages serving the preceding main build.
- After merge, verify a successful Pages run for the exact merge SHA and confirm the public served stamp matches it. If any fails, fix the blocker before further merges. No cascading deployments.

## Intentional retained compatibility

- `breach-world-context.ts` Session geometry plus explicit `breach-presentation-world-ownership.ts` adapter; Map/Asset Labs and offline fixtures may use documented synchronous global helpers.
- Current mission/replay/debrief navigation and historical archive formats.
- Fixed 60 Hz phase order, RNG and event/impact parity, player information boundaries, and training-world independence.
- Historical test files, optional full test suite, specialist rendering/performance workflows, and old lab routes.

## Definition of done

1. Changed-test routing proved by tests with no dependence on branch name.
2. All A0–A9 closeout regression files available through one repeatable entrypoint.
3. CI, architecture, real WebGL browser flows and production build green.
4. No `src/` or deployable assets altered.
5. Exact previous and final GitHub Pages release stamps verified.
6. Completion recorded with evidence in this document and PR.

**Physical-device acceptance:** real iPhone Safari and dedicated desktop GPU remain a separate manual gate and must not be described as completed by Chrome/WebGL CI.
