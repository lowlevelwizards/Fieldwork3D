# P8 — Actor projection cache for live sight candidates

The terrain observer already uses `groundViewCandidate`, which keeps the
original 240-unit, ±1.15-radian cone and deliberately preserves exact-center
behavior. Runtime `liveVisibility` and personal `observerPointVisible`
continued to recalculate `Math.hypot` and `Math.atan2` for every candidate,
including outside the observer's viewing direction.

## E1
Share the existing field-of-view candidate predicate across all three
paths. A WeakMap keyed to each actor retains only their world position,
heading and the corresponding sine/cosine projection. Any heading or
position mutation, even within a single simulation tick or replay frame,
recomputes the projection immediately. Static geometry, door open state,
body position and optical cover are **never cached**; after passing the
candidate cone, `unobstructed` still decides every query independently.

## E2
Tests compare thousands of candidate points against the reference trig
policy, including the 240-unit cutoff, rear hemisphere, center point,
rapid in-place turns and moves. Focused fog, door seal, replay personal
visibility, and optical/material tests defend information boundaries.

`node --experimental-strip-types scripts/bench-live-visibility-candidate.mjs`
provides an optional CPU-only comparison. It is not a phone FPS measurement.
No automatic pause, omniscient fog reveal, altered enemy target acquisition
or gameplay balance changes are part of this batch.

Before merging, verify prior production Pages matches the current main,
check the Pages queue, and merge only one release. Compare on-device
`?perf=1` after deployment with the same seed and quality mode.
