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
