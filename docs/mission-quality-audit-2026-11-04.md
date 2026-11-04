# Mission Quality Audit — 2026-11-04

## Purpose and methodology
Review the established architecture/encounter systems instead of replacing them.
The generated `Site`, physically cut apertures, scene colliders, operator
routing and per-observer fog remain authoritative. This document is an audit of
real geometry and a release log, **not a claim of live gameplay quality before
hands-on playtests**.

Audited: `architectural-compiler.ts`, `breach-site.ts`,
`room-relationships.ts`, `circulation-grammar.ts`, entrance/window
generation and traversal rules, furnishing, encounter placement, operation
runtime, existing debrief and deterministic site-audit matrix.

### Existing strengths retained
- Eleven building archetypes, size/subtype variants, void/wing footprint
  synthesis, five circulation grammars and role-based room relationships.
- Real FRONT/SERVICE/COURT doors, some shutters and paired doors, variable
  exterior windows, and timed physically validated window climbing.
- Essential room contracts, circulation reservation, physical clearance and
  post-furnishing doorway-clutter repair.
- Seeded encounter premises, personality/readiness, physically safe enemy
  placement, spread/clustered/active profiles, and actual muzzle/cover rules.
- Five differentiated mission types with extraction and event-based replay.

### Verified weaknesses and changes
1. **Objective repetition:** initial objective was the topmost non-public
   room in every compiler output. New mission-aware, seed-stable room ranking
   chooses a valid **existing** room before furnishing; explicit contract
   overrides remain consistent across alternate layout attempts.
2. **Entry choice quality:** exterior doors and potential window entries were
   not counted together in the per-site tactical audit. Now separately report
   real exterior doors, alternative doors, candidate open/break-first windows
   and external facade spread, without equating those with guaranteed routes.
3. **Room tactical utility:** space-quality audits tracked overcrowding, not
   furnished rooms with approach thresholds. New room profiles report actual
   doors, windows, cover pieces and solid occupancy. Defender placement gains
   a **small** profile-aware preference for a defensible existing room, but
   cannot bypass A*, spawn safety, max occupancy or physical collision.
4. **Façade monotony:** window generation prioritized frontage after daylight
   roles. Keep one opening per functional room, but prefer different facades
   when eligible, retaining true cut wall and sill collider geometry.
5. **Intel extraction loophole:** previously any surviving operator at exit
   could win after someone else had secured the cache. Intel now belongs to
   the collecting operator; incapacitation drops it at their position for
   deliberate re-collection. No global teleported inventory.
6. **Rescue extraction loophole:** exit-radius overlap alone could count with
   no surviving person escort. Require a living escort and the rescue target
   at extraction.
7. **Mission target identity:** capture assignment now follows the actual
   encounter's designated target role, with a legacy fallback.
8. **Pacing readability:** the replay log already recorded important combat
   events, but debrief lacked a compact timing summary. Added real
   first-confirmed-contact, first-shot, objective and extraction milestones,
   including elapsed contact-to-objective and objective-to-exit times.

### Initial small-map audit (one seed per archetype)
These are **illustrative, not statistical means**. Distance is game-world units;
windows are potential actionable apertures, not proven exterior routes.

| Building | Secondary doors | Candidate windows | Objective distance | Nearest hostile | Furnished threshold rooms |
|---|---:|---:|---:|---:|---:|
| Apartment | 0 | 1 | 282 | 185 | 6 |
| Clinic | 1 | 3 | 248 | 143 | 7 |
| Garage | 2 | 1 | 275 | 137 | 8 |
| House | 1 | 3 | 413 | 323 | 6 |
| Motel | 3 | 0 | 289 | 253 | 6 |
| Office | 0 | 2 | 169 | 142 | 4 |
| Restaurant | 1 | 4 | 295 | 337 | 6 |
| Retail | 1 | 2 | 320 | 146 | 4 |
| Townhouse | 1 | 3 | 366 | 146 | 6 |
| Utility | 2 | 0 | 292 | 160 | 6 |
| Warehouse | 2 | 1 | 241 | 153 | 5 |

All 11 sampled sites passed existing gameplay-validation checks. Real
room/entry metrics now appear in Map Lab and per-archetype quality summaries.

### Constraints and future human review
- No route bypass or automatically selected squad tactics.
- Do not treat potential exterior windows as guaranteed climbable entries.
- No new whole-map A* searches in the production hot path.
- Maps remain seed-deterministic; physics and fog stay authoritative.
- Player should inspect multiple seeds/scales in Map Lab and run full missions.
- The rescued person's follow pose still warrants a future dedicated **physical
  escort-navigation audit**, separate from this stage's extraction correctness.
- New objective candidates remain room-centre points; a later, bounded
  furniture-aware interior placement review could assess contextual
  location within a room if needed.
