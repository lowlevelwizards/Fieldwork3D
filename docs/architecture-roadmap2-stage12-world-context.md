# Roadmap 2 Stage 12 — session-scoped world geometry and simulation context

## Intent
Finish the original Roadmap 2 architecture: authoritative collision, routefinding,
visibility, AI, combat, and interactive cover must use their owning mission rather
than whichever level the renderer or an offline audit most recently activated.

## Eight-stage implementation and acceptance
1. **Session-owned data**: immutable per-mission wall snapshot, mutable
   per-mission cover, explicit playable bounds, locally indexed queries and a
   mission-specific geometry revision. Never share a mutated cover object.
2. **Geometry interface**: physically exact passable, wall/cover broadphase,
   ray/door occlusion and route queries receive the session-world context.
   The index must invalidate on cover mutation and never on another session's
   changes, but cannot return stale physical truth.
3. **Authoritative motor**: route caches, normal/squeeze decisions, swept-body
   clearance, doorway/cover recovery, vault landing and frame arbitration use
   current Session geometry without a global site switch.
4. **Perception/AI**: visual sight, acoustic evidence, observation, search,
   defense, communication and fire-lane planning use session-specific walls,
   cover and windows. Fog remains individual observation, not omniscience.
5. **Combat/materials**: muzzle clearance, ballistic ray impacts, cover damage,
   glass, suppression, civilian harm, near misses and falling/corpse geometry
   refer to the owning session's cover and walls. Mutation updates its epoch.
6. **Transitions and compatibility**: session creation, restart, replay,
   Quick Play and simultaneous editor/audit do not mutate other session
   geometry. Keep legacy `activateSite` and direct arrays temporarily for
   scene presentation, old 052 training tools, and external compatibility.
7. **Regression evidence**: two divergent generated sessions interleave
   creation, planning, physical ticks and replay, plus independent cover
   movement/damage, scopes and exception restoration. Frozen Stage 1 combat,
   civilian, WAIT, door and replay fingerprints remain unchanged.
8. **Release**: architecture, typecheck, deterministic critical integration,
   simulation performance, legacy map/motor/visibility tests and GitHub Pages
   release verification. Never queue overlapping deployments.

## Authority and migration rule
The fixed 60 Hz `stepSession(s,h)` remains the **only** simulation clock.
A `SessionWorldGeometry` lives in `breach-world-context.ts` in a WeakMap
keyed by Session. Its bounds and walls are private to the mission; its cover
references `s.coverState`, whose physical mutation increments
`s.objectRevision`. Route and broadphase caches observe a session-local
revision. Collision and ballistic queries are exact after broadphase pruning.

Other site activation can no longer invalidate authoritative session caches.
The global `breach-core.ts` arrays remain a deliberate **presentation and
legacy compatibility adapter**, not a new world-truth authority. Audits may
still synchronously borrow that adapter with try/finally; they must never
switch the authoritative geometry of an existing Session.

## Non-goals
No changes to movement speed, collision radii, cover destructibility,
AI knowledge, shot penetration, civilian policy, deterministic RNG, fog-of-war,
render visual style, replay format, or weapon/magazine logic. No automatic
fingerprint rebaselining.

## Completed ownership map and implementation detail

| Concern | Owner / explicit transport |
| --- | --- |
| Mission walls and bounds | `SessionWorldGeometry` WeakMap, structural snapshot and live `s.site` metadata |
| Breakable/relocatable cover | Exact `s.coverState` array, local revision-based spatial index, forced invalidation on replay seek |
| Routefinding | World-aware A* passability, normal / squeeze paths, motor route cache and physical repair |
| Body, door and furniture | Scoped swept body and profile, hinge sweep cache, door pressure, step recovery, clutter shove |
| Mission intel | Non-serialized weak binding from `IntelState` to owning world; observed cover/walls and fog remain independent |
| Enemy response | Scoped defense, search, communication acoustics, tactical fire lane and muzzle clearance |
| Combat | Scoped wall and cover penetration, ballistic interception, fire safety, environmental effects and harm attribution |
| Authoring | Session-aware deployment selection, PIE, movement / medical / door / flashbang instructions |
| Replay and session switch | Keep replay cover array identity, invalidate broadphase when seeking, restore active live presentation mirror |
| Graphics | Session surface disclosure and light-blocking consult the same owning wall and cover snapshots |
| Legacy compatibility | Direct `WALLS` / `COVER` and site activation remain for isolated preview / offline utilities; **only the matching active presentation Session may publish cover** |

### Mutation and cache contracts
- All authoritative cover mutation remains on `s.coverState`, bumping
  `s.objectRevision` for motion and material damage.
- Unlike the simulation revision, a replay seek may set that revision
  backward or to an equal value; `invalidateSessionWorldGeometry(s)`
  rebuilds the private broadphase after restoring the *same* cover array.
- Hinge sweep caching keys by both world identity and that world's own
  revision, plus mutable hinge endpoints and orientation. Other sessions
  cannot invalidate a mission's hinge geometry by activating a map.
- `publishSessionCoverToActiveSite` is explicitly a presentation
  compatibility adapter, guarded by both the active Session identity
  and site identity. It is never used to decide collisions or shots.
- Session intel is bound through a WeakMap, not serialized or stored as a
  direct geometry field in replay archives. Restoring intel explicitly
  rebinds it to the Session's world.

### Verification evidence
The Stage 12 critical CI gate performs frozen Stage 1 combat, civilian,
WAIT, medical and door-outcome regression sweeps alongside:
- Interleaved active missions with independent deterministic 60 Hz results
- Site switches / synchronous temporary geometry audits
- Independent cover movement and per-session revision invalidation
- Confirmed ballistics and hinge broadphase stability after another map activation
- Replay seek with intact cover-array identity, separate public cover mirror and
  refreshed intel lookup
- Two sessions sharing the **same Site object** with separate physical
  cover state; background mutations cannot publish to the active view

Existing architecture, motor, animation, mission lifecycle, passage,
performance and production gates must also pass without rebaselining goldens.

## Future cleanup
A subsequent isolated compatibility-removal project can migrate the
remaining old map previews and editor-only helpers off the global adapter.
It must **not** change the now-established Session simulation interface or
silently alter legacy tools before their dependencies are audited.
