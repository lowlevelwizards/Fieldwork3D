# Breach runtime lifecycle — release batch A/B
_2026-11-08 · Branch: `perf/runtime-lifecycle-20261108`_

## Scope and ownership
- A: `PhysicalActionRings` owns its DOM elements outside the RAF tick.
  Only operators actively picking or treating allocate rings. No stale per-frame
  DOM nodes remain; the controller clears during menu/loading transitions.
- B1: `SiteMaterialLifetime` owns new curb and door-glass materials for one
  generated site. Shared materials and pixel caches remain persistent.
  `TacticalScene3D.applySite` disposes site-specific materials before replacing
  architecture.
- B2: The door-swing static neighborhood is cached per live door with weak
  ownership. WALLS/COVER structural revision and edited door hinge endpoints
  invalidate it. Door collision against live actors and actual swept leaves is
  evaluated each tick exactly as before.
- B3: `?perf=1` now displays approximate total DOM element count, tracked
  action rings, and site material count. The expensive DOM count query is
  limited to the opt-in, ~750 ms diagnostics update.

## Required critical gates
`npm run build`, the three focused A/B tests, existing physical door
interaction and right-of-way tests, and the recorded replay check.
`scripts/audit-pages-release-checkpoint.mjs` must pass before merging.
Do not claim iPhone FPS gains based only on Node tests.

## Manual long-round acceptance (same seed/conditions)
1. Load `breach.html?perf=1` on the target phone and execute a five-minute
   tactical session with repeated movement, door interactions and gunfire.
2. Watch DOM and ACTION RINGS across minute 0, minute 2, minute 5:
   rings should never exceed the count of currently participating friendlies,
   and DOM count should not grow monotonically from action-ring allocations.
3. Restart/generate several sites; SITE MATS should remain stable within
   the same geometry family rather than rising by two every reset.
4. Verify ordinary swing, body pushing, kicks and crowded doorway traversal
   are unchanged, including after a movable cover changes geometry.
5. Compare RAF gap and JS P95 slopes with the same device/seed on the
   previous production build; also inspect rendering GPU behavior separately.

## Next releases intentionally not included
Broad `breach-main` extraction, decision arbitration rework, replay plan
mutation revisions, and full visibility invalidation require their own
contracts and tests. Preserve fog disclosure, replay fidelity, authored
orders and deterministic physical authority.
