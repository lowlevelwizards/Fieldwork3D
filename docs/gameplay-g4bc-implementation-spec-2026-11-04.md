# G4b / G4c — Encounter Personality & Mission Situations
## Objective
Make encounters visibly different before first contact and by mission, without inventing hostiles, giving omniscient orders, rebuilding a second AI, or bypassing the existing physically safe placement, seeded layouts, ballistic gates, and mission contracts.

## G4b.1 — Role-specific pre-contact observation
- **Sentry:** nearby real doorway facing, not a remote doorway in another wing.
- **Lookout:** exterior window when nearby and associated with the actor's room, then a local door as fallback.
- **Investigator:** suspicious/attentive watch posture; local ingress watching, but no knowledge of player location before observations.
- **Reserve/leader:** prepared watch posture within defensive/guarded encounters; never an artificial chase before sound or sight.
- **Occupant:** maintains the existing furniture-specific working, resting, seated, or inspecting state.
- Preserve seeded role assignments and the actual reaction-delay / sound-belief pipeline.

## G4b.2 — Patrol observation posts
- With no new runtime pathfinder, choose a bounded, physically swept stop just inside a nearby *real doorway* when available, rather than using only random local offsets.
- Retreat to preexisting G4a local offsets if no door post passes wall, cover, room, or door clearance.
- Runtime motor still validates each route and interrupts it on genuine visual or audio contact.
- Test determinism, room containment, avoidance of physical barriers, and readable role distinctions.

## G4c.1 — Mission-based situation weights
- CLEAR: variety, room-to-room scattered contacts and active site life.
- INTEL: more quiet approach / scattered opponents; avoid mandatory firefight.
- RESCUE: somewhat more concentrated occupied zones and active disturbances.
- CAPTURE: modest increased clustered/prepared security.
- HOLD: prepared local defenders and credible static watch rather than gratuitous pursuit.
- All weights are additive to actual premise/building factors and seeded rolls; never force a guaranteed profile.

## G4c.2 — Objective / target local protection
- Without moving or spawning a single enemy, mark the closest eligible *existing* actor to the objective as a ready guard (or hold reserve) when the actor is physically nearby.
- CAPTURE target remains exactly one and is never replaced; its closest physically present non-target may guard it.
- Require actual nearby positions; don't fabricate a guard when none exists.
- Site encounter groups and cap/reachability remain untouched; do not change live objective rules.
- Test no new actors, unchanged positions, deterministic assignments, unique target, no outside-proximity guard.

## Release gate
- Focused G4a/G4b/G4c tests and encounter physics/insertion regressions, TypeScript and Vite production build.
- Preserve separately merged operator visuals / camera features.
- Only merge after all checks are green and latest main Pages deployment is complete and its public build verified. Never stack releases.
