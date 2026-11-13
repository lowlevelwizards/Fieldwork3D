# A3.1 — Height-aware physical safety and shared firing geometry

**Stage:** A3.1 of A3 Contact & Physicality. **Depends on:** A3.0 real-session lab merged into main. **Release:** feature branch; no merge or deployment until A3 release checkpoint.

## Objective
Recognize a genuinely clear projectile and rigid weapon path **over a crouched teammate** or beside a standing teammate, without ever allowing a ray to intersect another friendly's body. Replace the legacy 2D friendly disk only when live actor posture is known. Do not change awareness, aim speed, auto-crouch, micro-lean/micro-step, opponent damage or weapon mechanics.

## Implementation specification
### 1. Single deterministic, allocation-light body model
- Define optional posture-aware `FriendlyBody` with X/Y planar location and authoritative stand/crouch posture. A legacy `Pt` remains valid and is treated as the *existing conservative 10.5-unit planar blocking disk* regardless of elevation; unknown or invalid posture cannot grant clearance.
- Fixed, stylized body regions: torso/shoulders and head/helmet represented by overlapping vertical cylinders of conservative radius and height, with stable numerical tolerances. These regions do not require per-mesh collision or raycast.
- For each region, intersect the ray segment against the XY disk **including segment start/end overlap**; test the z/height range on the actual intersection interval, not merely at the body center or the closest XY point. A grazing/running ray is blocked conservatively. Crouch changes the top, not the protected floor.
- Weapon-occupancy probes use the same actor volumes but are independent from shot permission; the rigid rifle segment can only be considered clear when its complete path is clear. Other weapon hard blockers and the existing 18-unit solid-wall muzzle-clearance floor remain intact.
- Return existing `FireLane` blocker semantics and stable blocker point; no new fire authority, no bypass of walls, cover, doors or civilians.

### 2. Authoritative consumers
- `breach-firing-pipeline.ts`: target acquisition preview, observed friendly-lane recovery, recovery candidate validation, suppression ignition must sample same height-aware friend geometry.
- `breach-shot-resolution.ts`: initial sighted muzzle check and actual dispersion-adjusted *outgoing muzzle ray* both use the same posture-aware side-matching friend list, before ammo decrement.
- `breach-3d.ts`: use the same model for nearby friendly weapon contact during pose/clearance decisions. Visual hold can't be more permissive than the authoritative physical weapon geometry.
- Enemy decision/defense use posture-aware volumes wherever real actors are available; legacy `Defender` integrations remain conservative.
- Existing civilians retain their *independent* known-civilian and impact protections; no reduced radius or permission change for civilians.
- No new fire trajectories from eye location; existing cases known to use eye/actor center must be upgraded to actual computed muzzle for acquisition/recovery when this controls whether a teammate is clear.

### 3. Test matrix
- Standing versus standing must remain blocked in the same XY column; crouched under standing-height *shot* can clear if the line stays **above head margin**.
- Crouched shooter to standing/crouched colleague remains blocked when line enters either head/torso. Sloped trajectory that intersects any part of body must remain blocked even when endpoints are above; no center-only logic.
- Shoulder near-misses, head near-misses, grazing tangency, start/end overlap and body behind the target.
- Multiple teammates, opposing sides and civilians; shooter excluded, target never excluded from unsafe friendly case.
- Legacy Pt and invalid/unknown posture conservative parity.
- Rifle length and standing/crouched weapon occupancy in an actual seeded Breach `newSession` test; WATCH and existing dynamic sidestep regression remain intact.
- Actual shot-time ignition and visual muzzle use identical geometry; suppression/shot-spread veto; deterministic 60 Hz replay/seek.
- A3.0 Lab comparative lane readout, upright/crouched depiction and reproducible baseline deltas. Node tests, `npm run build`, and mobile/desktop browser smoke.

### 4. Acceptance and performance
- No false-safe path to an actual teammate; legacy flat blockers unchanged for old callers; actual posture-aware crouch clearance works only when entire trajectory is above head.
- No change to action/motor/foot/aim behavior (A3.2–A3.4 later).
- Fixed two body volumes per known teammate, O(N) in *already relevant nearby actor list*, no new per-frame scene traversal or memory allocations beyond previous lists. Do not perform work when there are no friendlies.
- All targeted critical tests and A3.0 browser tests green; baseline measurements recorded and compared against A3.0.
- Feature-branch commits; no production merge until explicit release checkpoint.
