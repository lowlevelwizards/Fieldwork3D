# Fieldwork Breach — G4d Mission Diversity and Gameplay Integrity Audit
**Date:** 2026-11-04  
**Scope:** Headless generated-site validation and real fixed-step motor/replay trials, not a user playtest or mobile framerate measurement.

## Change summary
1. Replay audit no longer treats legitimate pre-contact stealth objective completion as a chronology fault.
2. Objective security roles are assigned after physically validated spawn rehoming. The capture target remains unique; no guard is spawned, teleported or given undiscovered knowledge.
3. A reproducible cross-seed mission / topology audit now reports real map contracts and encounter patterns, separating hard failures from design warnings.
4. Real-operator-order trials capture recorded visibility, first contact, shot events, travel, motor obstruction and replay integrity. True Blind short entry-only moves are no longer falsely called stalled.
5. A rejected physical movement step may no longer report its blocker as 'clear'. The authoritative opponent/closed-door check and existing physical diagnostics now feed the bounded motor-recovery policy.

## Reproducible quality checkpoints
Commands:
```sh
npm run audit:g4-diversity -- --smoke
npm run audit:g4-diversity -- --matrix
npm run audit:g4-diversity -- --topology
npm run audit:g4-flow -- --matrix
```
A broader `npm run audit:g4-diversity -- --full` remains **on demand**. It covers 330 sites (11 archetypes × 5 mission types × 3 sizes × 2 seeds per archetype), but is intentionally NOT in every PR release gate because of its host CPU cost.

### Structural and mission results (G4d release-candidate matrix)
| Measure | Result | Interpretation |
|---|---:|---|
| Representative sites | 55 | Eleven archetypes under five mission contracts, small scale |
| Hard map/encounter validity failures | 0 | Includes route validity and known physical spawn constraints |
| Only primary verified insertion | 10 / 55 | Soft tactical variety limitation; some layouts genuinely have a single entry |
| No physical nearby objective security | 12 / 55 | Informational, not a spawn failure; cannot force a guard into an illegal place |
| Matched-seed mission topology signatures | 12 | Same seed intentionally retains much of its floor plan across missions |
| Paired-seed topology samples | 22 | Two different seeds per archetype with the same mission and scale |
| Distinct paired-seed signatures | 22 / 22 | 0% repeated within these paired comparisons; not a guarantee about all seeds |
| Paired-seed hard failures | 0 | All 22 passed structural invariants |

Mission profile diversity in 55 samples: Clear uses 5 scattered, 2 active, 2 clustered, 1 prepared and 1 quiet; Intel includes 5 scattered and 2 quiet; Rescue is 5 active and 2 clustered; Hold is 6 prepared; Capture is 6 clustered. These are **sample counts**, not balanced distribution targets.

### Gameplay-flow findings
The 20 fixed-step trials cover ten small-site seeds in Floor Plan and True Blind, across the five missions, using only legal briefing information for authored orders.
- **0** invalid actor states, replay errors, simulation exceptions, or completely rejected-order trials.
- **11 / 20** had no confirmed visual contact in the 12-second window. This includes short True Blind entrance-only approaches; no contact is not automatically an AI or visibility failure.
- Before the final blocker-classification fix, four Floor Plan samples (seeds 11, 16, 19, 20) accumulated **1,095 blocked actor-frames** while the blocker was misleadingly reported as `clear`. G4d now classifies physically rejected steps into meaningful actor, door, route or geometry reasons. **This fixes diagnostic truthfulness and recovery inputs, not a proven elimination of the underlying jams.** Review these seeds again after publishing.
- The True Blind “movement-stalled” label for short entry-only routes was an **audit mistake**, not evidence that operators cannot walk.

## What remains deliberately unfixed
- Do not force mission contact by placing enemies near insertion or moving them toward hidden operators.
- Do not fabricate alternate entrances when the architectural contract has only one verified usable route.
- Do not create security bodies out of thin air when the final physical site has no eligible guard.
- Revisit persistent blockage samples (11, 16, 19, 20) with full execution-event context and actual rendered play before asserting the route-finding is solved.
- Investigate obstruction warnings in the paired-seed structural sample (including blocked door flow) separately from safe per-site structural validity.
- Inspect more seeds/sizes and perform representative actual iPhone 2D/isometric/Floor Plan sessions in G5; host CPU wall time is not mobile FPS and automated replay validity is not subjective engagement.

## Release gating
- Focused G4d replay, objective security, blocker classification and matrix tests.
- Real 11-site smoke, representative 55-site mission matrix, 22-site paired-topology matrix and 20 scripted encounter-flow trials.
- Production TypeScript / Vite build.
- Merge as one batch only when the latest prior GitHub Pages release is verified and no production deployment is pending.
