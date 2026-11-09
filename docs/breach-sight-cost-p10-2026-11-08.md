# P10 — Opt-in sight workload measurements

P7/P8 optimized structural knowledge queries and candidate angles.
Before adding more visibility caches or changing fog presentation, collect
the volume of live sight work on a real phone at a fixed seed and quality.

## G1: Read-only counters
A small counter module tracks: `liveQueries` (calls to `liveVisibility`),
`liveOcclusionProbes` (calls to actual geometry `unobstructed` after FOV
gating), `liveHits` (sight successes), `fullViewQueries` (omnipotent/cheat
early returns), plus `personalQueries` and `personalOcclusionProbes`
from authoritative per-observer evidence capture. Counters are disabled
by default and only increment when explicitly enabled. They NEVER decide
sight or update simulation/recorded state. Full-view remains unrestricted.

## G2: An opt-in 750ms window
Existing `?perf=1` overlay now presents one interval of query/probe/hit
counts alongside SIM, SCENE SYNC, RAF gap, fog paints and draw calls.
Measurements are intentionally read/reset at the existing 750ms cadence,
not every frame. The overlay does not store, upload, or persist results.

## How to compare
At the SAME seed, viewport, graphics quality and operator positions:
1. Record a paused/planning ~750ms sample.
2. GO and rotate through new rooms; note query and probe counts.
3. Run an active firefight/replay and note differences.
4. Compare JS SIM, SCENE SYNC, and RAF gap P95 alongside counts.

These are CPU geometric evaluation counters, *not* WebGL/GPU rays. The
numbers don't directly imply iPhone FPS. The next change should target
the dominant observed phase rather than caching line of sight across
moving actors or doors, which would introduce stale corner discoveries.

## Acceptance
Focused tests show diagnostic off-by-default isolation, stable
full-view and individual-observer discovery, and no fog/door-seal
regressions. Compile and check the previously live Pages artifact before
release, and never stack a new deployment on an unfinished one.
