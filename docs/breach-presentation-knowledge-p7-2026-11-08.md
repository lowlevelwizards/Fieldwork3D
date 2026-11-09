# P7 — scene knowledge gate instead of full LOS classification

## Observation
In 3D, the room roof loop, structural wall/cover loop, and door loop
requested `spatialSurfaceState(... ) !== 'unknown'` every render. That
function calculates point-based `liveVisibility` even though its result
*cannot change whether an object is known*. A known cover may cast up to
four rays and a known wall/room/door up to one, per object, per frame.

## Stage D1
Add `spatialSurfaceKnown` to the shared presentation policy and switch
only the three `!== 'unknown'` 3D geometry gates. Its truth conditions
match the full state exactly across briefing modes, world-missing cover,
and omniscient replay. True visibility/remembered classification remains
unchanged in all other callers. The predicate is read-only: no new map
intel, no auto room revealing, no change to enemy sight.

## Stage D2
The same door already computes `directlyObserved`; reuse that result for
the planning halo instead of casting the same door-center ray again.
Precompute static decorative fine/micro tile keys when a map is built;
rebuild them when the next map is built, never from render interpolation.

## Checks and follow-up
Run the parity tests over multiple procedural seeds and all fog modes,
focused closed-door, camera-disclosure and scene resource tests, plus
`npm run build`. `scripts/bench-presentation-knowledge.mjs` is an
optional host benchmark and is not a gameplay performance guarantee.
Evaluate iPhone `?perf=1` scene sync P95 and RAF gap with the same
map/quality after deploying. Do not reenable the shelved tilt-shift.
Future work: measure remaining LOS contributors before introducing
long-lived visibility caches; caching across simulation ticks would risk
stale moving enemies, doors and corner sightings.
