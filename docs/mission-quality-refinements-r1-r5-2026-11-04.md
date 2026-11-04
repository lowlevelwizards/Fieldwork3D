# Map / Mission Refinements R1–R5 · 2026-11-04

## Release A: physical rescue & entry access

**R1** — A rescued person follows an actual escort trail, with finite-speed
collision-checked movement. Blocked doors and walls halt movement. Separations
require a living operator to regain contact. Objectives cannot be claimed
through a partition. Extraction requires the actual escort and rescued person.

**R2** — Optional deployment points require a physically navigable exterior
route and four standing positions. Doors and open/break-first windows remain
distinct interactions; no window becomes an instant door. The briefing selector
works only before planning and resets the fog/intel starting view. Map Lab
distinguishes aperture candidates from verified approaches.

## Release B: room quality, variety, QA

**R3** — Audits actual room threshold sightlines, exposed/concealed sampled
positions, crossfire and longer lanes. Optional furnishings retain useful
sightlines. Prepared defenders respond modestly to existing tactical room
qualities, without bypassing occupancy or path safety.

**R4** — Records physical portal graph diversity, including branches,
dead ends and loops. One alternative is considered for a sparse seeded subset,
but never preferred when its physical completeness/clearance score is worse.

**R5** — Adds frame-chronology and mission pacing checks against actual
recorder snapshots. A bounded offline survey samples up to 48 seeds, default
11 to cover each building archetype once, and cycles through all five mission
types. A passive 2-second simulation is an integrity probe, *not* a measure
of the quality of a human-directed firefight.

Focused checks (critical only):

```sh
npm run check
node --experimental-strip-types --test tests/mission-escort-physicality.test.mjs tests/mission-deployment-r2.test.mjs tests/mission-room-sightlines-r3.test.mjs tests/mission-topology-r4.test.mjs tests/mission-quality-r5.test.mjs
npm run audit:mission-quality -- 11
```

Integration must be held until CI is green. Merge R1–R2 at its release
checkpoint, verify its deployment and GitHub Pages serving the matching
commit, then merge R3–R5 at the next checkpoint. Human review remains
necessary for escort feel, tight doorway maneuvers, exterior usability
and tactical combat pacing.
