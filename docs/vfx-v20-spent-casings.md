# V20 — spent casing overhaul

Baseline: two independent muzzle-offset emission paths, 96 scene-lit six-facet cylinders, a sequential-ID linear hash, exponential horizontal travel, damped sine bounce and constant tilt. No receiver pose or environment contact.

## Scope and ownership
- A: single emission function called after authorized shot commitment, including secondary and suppression. Receiver-local family art landmarks, transformed by the accepted shot-time weapon pose. Legacy/generic and G36 receiver fallback is intentionally representational. No new ballistic or RNG authority.
- B: four-facet tapered cylinder, one scene-lit instance batch with per-instance dimensions and finish, no shadows. Approximately 30% shorter than the previous art, more slender; shotgun hull tint, no modeled brass rim or primer. Art remains tunable in lab.
- C: mixed independent ID channels, immutable sampled ballistic legs, bounded contact deflection, one bounce, friction slide and final resting orientation.
- D: height-aware wall/door/window/cover sweeps at emission only, local broadphase; bounded landing occupancy grid and nearby alternative landing candidates. Floor is the existing flat tactical world plus casing radius; support on contacted furniture where meaningful. Decorative exterior heights below the playable floor do not change collision. No rigid-body or casing-casing physics.
- E: 96 cap, one draw batch, settled writes stop immediately, replay retains immutable flight record and legacy records keep old trajectory. No simulation random calls.
- F: Effects Lab production path, family/pistol, scale, count, interval, seed, floor friction, obstacle, debug projected sockets/trajectories/landing points; reuse pause and playback speed. 
- Pump action audit: no authoritative cycling/ejection event currently found. Preserve shot-time emission rather than inventing a delay or weapon-cycle authority. 
- Gate: V20 focused tests, TypeScript/build, real mobile/desktop Effects Lab browser screenshots, affected integration checks and exact production build verification. No merge while material failures remain.
