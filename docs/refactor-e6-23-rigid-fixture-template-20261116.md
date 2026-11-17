# E6.23 — rigid fixture template pilot (stacked over E6.22)

**Release:** feature-only, OFF by default (`?e623Fixture=1`).
This branch starts from E6.22; do not merge it independently into main.
The E6.22 architectural template flag remains separate.

## What is implemented

- 21 deliberately selected, rigid **box-authored** prop families reuse cached
  local-space GPU geometry across instances and subsequent maps.
- Recipe keys include exact fixture kind, local width/depth, an art-recipe
  version and the 3-way authored index variant. Rigid native scene boxes keep
  the same UV scaling, cast/receive-shadow flags and transforms as legacy.
- The source `renderFixtureVisual` remains the single art-authoring path for
  these fixtures. Build-time rigid fixture batching runs once per cache miss.
- The clone remaps symbolic palette slots onto each current room's wood, metal,
  fabric and finish materials. Materials are site-owned, NEVER cached by the
  library, so weathering and distinct room palettes stay independent.
- Each cover still owns its visible/intact/debris groups, object wear, fixture
  index, fog disclosure and movement. The cached model supplies only the
  immutable intact mesh geometry. Destruction debris is site-owned.
- Instance children are attached directly to the existing intact visibility
  group, so per-cover repeated-fixture instancing can still find and update
  them; the cache lease is retained through renderer scene teardown.
- RepeatedFixtureBatches.flush receives the union of site-shared and
  template-shared geometry, and must not dispose a cached buffer.

## Fail-closed exclusions

Any `artCondition`, `artSurface` or `artVariant` is built on the legacy path.
Non-box-only families (vehicles, characters, foliage alpha cards, moving
parts, procedural cylinders and specialized machines) are NOT admitted.
The original art/physics/disclosure code remains unchanged by default.

## Acceptance criteria before enabling by default

1. Node critical tests: bounds, shadows, palette ownership, key disjointness,
   site swaps and refcounted geometry cleanup; template cache previous tests.
2. Production TypeScript check and Vite bundle.
3. Two fixed seeds at 90 live execution frames, recording actual template hits,
   main/shadow draws, CPU construction time and screenshot pixel parity. Treat
   Node cold/warm authoring times as diagnostic, not browser/GPU claims.
4. Mobile device render and teardown without any material/geometry leaks.
5. Reconcile the stacked branch against newer main changes; only merge at a
   release checkpoint after pending main Pages deployment is verified.

No FPS, memory, draw or startup improvement is claimed until measured.
