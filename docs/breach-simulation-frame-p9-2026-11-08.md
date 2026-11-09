# P9 — fixed-tick simulation hot path (F1–F3)

## Scope and principles
The recent P7/P8 work improved visual simulation and camera presentation.
P9 is limited to redundant allocations and responsibilities in authoritative
60 Hz simulation: no changes to trajectory decisions, collision priorities,
NPC decision heuristics, injury, enemy spawn, or authored player orders.

## F1: proposal preparation
`breach-motion-frame-input.ts` captures each pre-motor body point into a
Map, then creates the identical ordered `MotionProposal[]` for shared
right-of-way. It omits the old combined operator+civilian array, map-array
pairs and spread allocations. Operators still precede civilians; carried
incapacitated patients remain included. All actual collision resolution and
commit decisions stay in `resolveMovementFrame`.

## F2: enemy group resolve
Local peer morale support scans the authoritative roster directly instead
of calling `enemies(s).filter(...).length`. The scan is only requested
when the original suppression/low-morale guard passes. Only living, same-group
RED peers closer than 130 world units count. No additional knowledge is
passed to enemy AI and the response thresholds remain unchanged.

## F3: silent effects
Quiet scenes previously rebuilt five empty arrays per 60Hz tick:
sparks, shots, noise, impact marks, flash bursts. Now filters execute only
when their lists are nonempty; nonempty effect age increments and strict
expiration thresholds remain identical. This does not truncate effects or
reduce their recorded or rendered lifetime.

## Release acceptance
One focused gate covers motion input parity, real four-operator doorway
traversal, civilian movement, morale behavior, effect expiry and recorded
replay, followed by `npm run build` and the prior live Pages checkpoint.
A supplemental Node benchmark at
`scripts/bench-sim-frame-input.mjs` compares proposal preparation with the
old code; it is not a phone framerate or GPU measurement. On-device
`?perf=1` SIM / RAF percentiles on identical seed and quality remain the
next validation. A stalled or unverified production release blocks merging.
