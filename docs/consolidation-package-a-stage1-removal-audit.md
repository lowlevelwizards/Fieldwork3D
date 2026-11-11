# Package A — Stage A1: Verified subtraction and compatibility retirement

**Status:** Implementation scope and release contract. **Baseline:** A0 merge `34c88c97dd65644bd3f78ece18ad2fa520d30e36`.

## Scope audit

The A0 inventory classifies files as review candidates, **not** as definitely dead.
This stage only removes code with a verified absence of runtime consumers and no distinct supported user capability.
The original proposal was ambiguous about "legacy fog", "legacy lighting", and "old simulation".
These refer to different architectural boundaries and must **not** be deleted together.

### A1.1 — Retire the Build 052 *second simulation*, not the legacy training geometry

- Remove the obsolete `breach-core.ts` exports `own`, `hostiles`, `queueWaypoint`,
  `clearPath`, `setLook`, `toggleExecution`, `sees` and `step`, together with
  their private target, random, alert and event helpers.
- Preserve `newTacticalState`, `Operator`, `TacticalState`, `Side`, static map
  fixtures, collision/LOS/route APIs, active-site compatibility and door geometry.
  **Reason:** `breach-game.ts` still derives modern Sessions from that factory,
  while Labs, tests and presentation depend on those geometry contracts.
- Update `breach-game.ts`'s history comment to state the precise modern authority.
- Retain physical fixture/route/door assertions from `breach-052.test.mjs`.
  Replace tests for removed fake simulation with authentic `newSession`, plan
  authoring, `toggling`, `stepSession`, and geometric sight tests. The original
  two-defender static training setup remains deliberately supported.
- Update the historic tactical HTML assertion to reflect the actual canonical
  `index.html` entry and redirecting `breach.html`, rather than requiring stale
  markup in the redirect.

**Risk:** Legacy tests may encode prototype-only behavior and should not be
transferred as gameplay balancing requirements. Modern gameplay is authoritative.
No new GO/PAUSE, combat, firing, door, plan, fog or event logic is introduced.

### A1.2 — Remove truly orphaned worldgen alternatives

- Remove `src/worldgen/architectural-wings.ts` and
  `src/worldgen/expanded-property.ts` after confirming there are no imports,
  export consumers, dynamic loaders, HTML links, scripts, or test references.
- Preserve the current active architectural compiler, footprint synthesis,
  procedural site generator, and all existing L/T/U/wings/annex geometry.
- Verify existing multi-seed geometry, worldgen diversity and physical-integrity
  contracts. The active generator must not change a single seed outcome.

**Risk:** The files contain historical approaches to the *desired* wing
variation, but are not connected to the active pipeline; their removal must
never be confused with eliminating building wing generation.

### A1.3 — Retire only the 3D fog rollback toggle

- Remove the `fogLegacy` URL switch and the unused alternate **3D** repaint branch.
- Keep the production 3D split memory + live-visibility fog logic, memory
  fingerprinting, texture cadence, and all counters intact.
- Do **not** remove `paintFogMask` from `breach-fog-mask.ts`: the 2D renderer
  and existing regression tools still consume the shared implementation.
- Keep quality, fog diagnostic palette, and all knowledge/disclosure modes.

**Risk:** Hidden information may leak if fog work is accidentally moved or
visibility is recomputed in a different order. This stage must only delete the
unselected 3D branch, without modifying paint scheduling or intel.

## Explicitly retained after the audit

- `?lighting=legacy` and graphic lighting baseline: referenced by an existing
  rendering smoke check, A/B test, and published QA notes.
- Animation V3/V4 and compatibility solver paths: reserved for Package B.
- `?fixedSite`, civilian rollback, and developer diagnostics: active or needed
  for verification.
- Miniature-focus test pipeline and storage compatibility.
- LocalStorage migrations, saved campaign, replay, and equipment schemas.
- Session world geometry plus global `WALLS/COVER` presentation adapter.
- Historical audit modules used by tests; Stage A9 reviews broader test/CI
  deduplication separately.

## Required acceptance gates

1. Authored deletion-guard tests: core still exports and executes authoritative
   geometry primitives and `newTacticalState`, but has no historical step API;
   removed worldgen modules have no references; 3D uses memory+visibility without
   `fogLegacy`, while 2D still uses its shared painter.
2. Updated Build 052 fixture tests exercise authentic tactical Sessions, with
   realistic GO/PAUSE and plan-edit semantics, rather than a second fake loop.
3. Focused scenario regression tests: routes, physical doors, planning and
   existing vision/fog disclosure tests.
4. Curated architecture-critical suite, existing architecture boundary checks,
   production typecheck/build.
5. Real WebGL tactical + replay + Operator Lab browser jobs **execute and pass**
   for this consolidation PR (not merely show skipped).
6. Before merge, verify previous Pages release is successful and public build
   matches main. Merge only an entirely green stage; after merge, verify the
   new Pages deployment and served build stamp match the merged commit.

## Definition of complete

The three supported deletion groups are fully removed with matching tests,
no remaining code imports deleted functions/modules, no current behavior changes,
the approved retention list is documented, all required CI gates are green,
and the public release is verified. **Do not begin Stage A2 before A1 closes.**
