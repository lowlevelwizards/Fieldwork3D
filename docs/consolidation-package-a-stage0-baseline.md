# Package A — Stage A0: baseline, candidate census and release protection

**Baseline:** main at 01b683fe7ae812e3b71aa4845ef1de172cfcd779 (2026-11-10).
**Scope:** instrumentation, audit, acceptance evidence and CI eligibility ONLY.
**No gameplay, save format, generated-site, animation, fog or replay behavior changes.**

## Scope review and corrections

The original plan's phrase "dead-code inventory" was too strong. Static reachability
is not proof of safe deletion: direct HTML entries, CSS imports, workers, standalone
Labs, test-only historical APIs, script consumers, reflection, and dynamic entry
selection all matter. **A0 produces review candidates, not a deletion list.**
A0 must not remove compatibility code or reset frozen outcomes.

The original browser gate was conditional on the old
refactor/closeout-stage6- branch prefix. Consolidation work must activate
that same real-WebGL phone/desktop + Bodycam/Lab coverage, not silently skip it.
A0 extends the branch condition and relevant path filters.
The existing architecture-critical workflow already includes refactor/ branches;
A0 adds a focused inventory check and uploads the generated evidence.

## Verified source-level baseline (GitHub tree)

- Repository blobs: **2,531**.
- TypeScript/TSX under src/: **903**.
- Node test files named *.test.mjs under tests/: **1,297**.
- GitHub Actions workflow files: **46**.
- HTML entrypoints observed: **18** in the complete repository tree; Vite
  production inputs are defined separately in vite.config.ts.
- Largest integration files: breach-main.ts **2,774** lines, breach-game.ts
  **2,218** lines, breach-3d.ts **2,313** lines; animation controller
  **1,183** lines.

These are source-tree measurements, **not** generated-graph results. The
repeatable report produced by consolidation-inventory.mjs uses its own explicit
file-type and root definitions and may report different totals.

## Reproducible A0 inventory results (first successful CI run)

The inventory scanner has now been executed on the complete repository in CI,
using its documented root definition. It recorded:

- **920** source files analyzed; **877** runtime reachable.
- **35** test-only source files and **6** type-referenced-only modules.
- **2** apparently unreferenced source files:
  src/worldgen/architectural-wings.ts and src/worldgen/expanded-property.ts.
- **2** strongly connected runtime dependency groups: the multi-module
  architectural/world-generation group (12 modules), and the
  campaign-progression.ts / campaign-state.ts pair.
- **4** unresolved relative URL references, including three directory-style
  or historical test asset references; they are **not** automatically evidence
  of missing production imports.
- **17** root HTML pages, **1,298** test entries, and **46** workflows.

These are different denominators from the GitHub tree counts above:
the scanner includes eligible CSS/JS/JSON source files and its newly added
test, and identifies only root-level HTML entrypoints. The report gives
all 35 test-only candidates and the complete cycle membership.

**Audit interpretation:** Neither unreferenced module may be removed before
verifying external/deep-link, generated-import, test/tool and asset usage.
Test-only modules may contain valuable regression instrumentation.
Type-referenced modules are explicitly retained. The 12-module worldgen
cycle is a later structural migration risk, not a Stage A0 bug to fix.

The generated JSON and Markdown evidence are uploaded as the
consolidation-a0-inventory GitHub Actions artifact. The independent
inventory fixture tests pass after correcting the query-parameter
member-call matching rule.

The previous release's production Pages deployment succeeded at
01b683f. Closeout Stage 6's final PR checks included successful architecture,
main CI, and browser workflows, but its hardware acceptance document explicitly
leaves real iPhone Safari and desktop GPU approval pending. That pending
manual work remains pending and is not reclassified by this stage.

## A0 deliverables and operation

1. Run: node --test tests/consolidation-inventory.test.mjs
2. Run: node scripts/verification/consolidation-inventory.mjs --check --json artifacts/consolidation/inventory.json --markdown artifacts/consolidation/inventory.md
3. Run: node scripts/verification/breach-critical-suite.mjs
4. Run: node scripts/verification/breach-architecture-boundaries.mjs
5. Run: npm run build
6. On the PR, verify Closeout Stage 6 browser jobs **execute**, rather than
   simply appearing as skipped, and review their artifact evidence.
7. Before merging, confirm the preceding main Pages deployment is successful.
   After merging, confirm Pages serves the expected new stamped build.

The inventory traverses repository HTML roots, explicit source imports and
exports, CSS imports, literal dynamic imports, and relative new-URL assets
including worker modules. It separately traces tests and scripts, preserves
type-only reference evidence, computes direct dependency counts and reachable
runtime cycles, and records approximate export counts, query flags, literal
storage keys, unresolved references, and repeated workflow test references.

The full candidate sets are written to JSON; the Markdown report is an
annotated summary. Neither file is used to delete production files. Generated
reports are CI artifacts rather than committed changing baseline snapshots.

### Known static limitations

- Nonliteral dynamic import paths, Vite globs, runtime reflection and generated
  module URLs may be incompletely resolved.
- HTML navigation and deep links may reach pages without conventional imports.
- Type-only and test-only usage are not runtime reachability but still block
  unreviewed deletion.
- External user bookmarks, archived replay/mission formats, localStorage data,
  and production feature flags are not represented by module imports.
- Source export count is descriptive, not per-symbol liveness proof.
- The graph detects static cycles, not their runtime effect or safety.
- Workflow test-name repetitions are not redundant by definition.
- Baseline performance evidence requires established benchmark jobs; this
  inventory makes no FPS claims or device claims.

## Stage A1 removal review register

| Candidate | Evidence | A1 disposition |
|---|---|---|
| Original breach-core.ts tactical step, queueWaypoint, clearPath, setLook, sees, and helper combat loop | Build 052 legacy test suite exercises it; modern gameplay uses breach-game.ts / stepSession | **Investigate for partial retirement**. Keep geometry exports and newTacticalState() while consumed. Replace historical-only assertions with current-domain coverage before removal. |
| fogLegacy branch in breach-3d.ts | Alternate fog path behind an explicit query flag | **Candidate**, but preserve as diagnostic baseline if needed for fog-parity verification. Require side-by-side evidence before retirement. |
| Historical lighting=legacy presentation | Graphics A/B path exists | **Candidate**, defer if still necessary for inspection or renderer validation. |
| Pose V3/V4 and legacy rig fit paths | Still referenced by live animation, Lab and tests | **Retain for Package B**. Output ownership is unified but internal solver migration is not complete. |
| fixedSite / legacy training startup | Used by startup and named test/QA scripts | **Retain** until training and external deep-link usage is validated. |
| Civilian rollback flag | Explicit production/mobile troubleshooting control | **Retain** until reliability and normal encounters have been accepted on device. |
| fieldwork3d.operator-roster.v1 migration | Current application reads and upgrades older user storage | **Retain** unless a deliberate, safe migration sunset policy is approved. |
| Process-global WALLS / COVER and presentation-active world | Session geometry now authoritative, but presentation and tools retain compatibility | **Retain in A0/A1**; scope remaining consumers in Stage A8. |
| Miniature focus experimental pipeline | Shelved by default but still exposed in settings and tests | **Retain pending Package C review**. |
| Historical CI branch-specific gates | Older branch-prefix conditions coexist with curated critical suite | **Track for Stage A9**, not deletion in A0. |

Each candidate requires: complete consumer search; impact on Vite entrypoints,
workers, Labs and external compatibility; preservation of unique tests;
simulation/replay/knowledge invariants; source-size and dependency deltas; and
a reversible commit with a focused regression plan.

### Objective acceptance

- Source inventory runs deterministically from repository state with Node 22
  and repository devDependencies.
- Fixture tests prove reachability does not confuse runtime, type-only,
  test-only, tool-only, and unreferenced source.
- The actual Breach entrypoint is recognized.
- An artifact lists known dynamic/import-resolution blind spots.
- Consolidation PRs trigger both the critical architecture check and Stage 6
  real-WebGL browser jobs.
- Production build, frozen architecture suite and source boundaries pass.
- Zero gameplay changes; production release verified when merged.

**Next stage (not started here):** A1 — verified subtraction and legacy-path
retirement, one evidenced candidate at a time.
