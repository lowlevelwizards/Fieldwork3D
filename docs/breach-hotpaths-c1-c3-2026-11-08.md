# Runtime hotpaths C1–C3 — focused release batch
_2026-11-08, branch `perf/sim-replay-hotpaths-c1-20261108`_

## C1 — authoritative visibility without temporary squads
`liveVisibility` iterates the full actor roster without allocating
`team(s)` each time. Same strict range, facing, wall occlusion, alive,
and full-view gates. `nearestDoor` selects the same nearest closed door
and keeps the original first-match tie break without sorting.

## C2 — door bodies are sampled per fixed tick, not per door
The door phase captures all living operator/civilian points once, then
refreshes ONLY if the real initial-opening yield moved an operator
before that door advances. Physical actors and hinges remain solid.
No cached occupancy crosses simulation ticks or depends on render time.

## C3 — replay history indexing without changed editorial semantics
Plan capture continues detecting in-place authored mutations every
simulation tick. Completely empty plans avoid repeated serialization.
`at` now uses per-actor chronological indices and binary search;
same-tick revisions retain their global capture order. First authored
plan lookup is indexed, and direct `revisions.push(...)` performed by
archive restore is detected and incorporated lazily. Unordered legacy
archives retain the previous scan behavior.

## Critical release gate
Targeted visibility/fog, four-person doorway, door physics, original
R2 replay and R3 archived-film tests, then `npm run build` and live
Pages preflight. No broad CI test matrix for this branch. Existing
production queue blocks merging even if code tests are successful.

## Acceptance and next scope
Monitor opt-in `?perf=1` JS and RAF percentiles on identical phone,
seed and active gameplay. Host regressions prove behavior, not phone FPS.
Next scoped work: instrument expensive visual LOS calls before adding
visibility caches; authoring revision counters require first auditing
ALL plan mutation paths. Avoid a speculative simulation or AI rewrite.
