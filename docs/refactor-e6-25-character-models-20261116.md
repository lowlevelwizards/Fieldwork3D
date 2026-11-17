# E6.25 — immutable character-style environmental model reuse

**Draft, strictly stacked on E6.24/E6.23/E6.22. No production changes.**

The existing common renderer `renderFixtureVisual` first dispatches to
`renderCharacterFixture` for distinctive Fieldwork furniture, appliances,
shelving, industrial fixtures and small static structures. Its shapes are
valuable but expensive to author every time. This stage compiles their
immutable geometry once per versioned (type, width, depth, art-index modulo
three) recipe, while resolving finish colors and surface palette at each
instance site and retaining owner-specific fog/cover/damage/wear.

## Included
44 stable character-like assets:
- Beds, chairs, sofas and tables; desks, workbenches, counters, carts.
- Wardrobes, cabinets, drawers, locker/filing and shelving families.
- Fridges, coolers, ovens, sinks, microwave and laundry models.
- Industrial static tanks, barrels, lifts, generators and control cabinets.
- Sheds, dumpsters, grills, containers, picnic tables and lamps.

These models include cylindrical, toroidal and prism parts that are authored
*directly* as meshes alongside box parts. E6.25 tracks every authored buffer
before consolidating and drops only buffers no longer reachable by final
compiled meshes; this prevents orphaned CPU/GPU resource retention.

## Excluded / safeguards
Moving vehicles and rigs, planters/foliage with alpha cards, any custom art
variant/condition/surface, articulated doors, special draw passes and animated
part owners remain on the original renderer. Source catalog collision bounds
and gameplay semantics remain authoritative.

Separate default-OFF flag: `?e625Character=1` enables the preceding E6.23 and
E6.24 caches plus this stage. `?e624Service=1` still enables only its original
set; no settings or default visuals change for current players.

## Acceptance before release
- 44 recognized families each exercised at three art indices; legacy vs
  template bounds, shadow groups, mesh/material group count, owned-buffer
  equality, exact-source immutable transforms.
- Independent materials and owner visibility on two same-recipe instances.
- Last-lease retirement, early cover detachment, repeated instancing, and
  E6.22–E6.24 regression.
- Production type-check and bundle plus 200-instance (24-recipe) Node
  reuse benchmark; timings are CPU authoring proxies, **not FPS**.
- Two real static-character-heavy seeded game cases: feature flag OFF/ON,
  main/shadow pass submissions, screenshots, alpha/visibility parity, mobile
  and mission teardown and actual repeated cache-hit evidence. Not fulfilled
  by only this Node workflow.
- Verify main's Pages release and reconcile all concurrent main commits
  before considering a grouped merge. Do not queue a new production release
  while an older one runs.

This stage prioritizes safe repeatability, not increasing the number of
deployments.
