# A3.2 — safe micro-aiming and shoulder clearance

**Complete scope**
- A bounded, deterministic physical shoulder offset (center, 1.5, 3.0, 4.0 units left/right), using the exact rendered and shot-time weapon fit. Firing hand, support hand, stock and muzzle translate *together* in a reach-limited offset; no visual-only aim permission.
- A single pure best-candidate selector evaluates the actual rigid gun through weapon clearance and full projectile ray through known friendly volumes, civilians and solid world; no side-switch unless the current solution is invalid.
- Fixed-step actor state `aimSideOffset` and `aimSideTarget`, smoothly approached and cleared on priority changes, replayable without render history. Selection only on an obstructed existing aim at stable WATCH/LOOK/ENGAGE; never fabricate new targets or affect HOLD/reload/run, movement plans or fire policies. No arbitrary hip translation.
- Apply offset consistently to resolved physical muzzle, rigid weapon fit, 3D hand/grip solution and all shot-time spread tests. Unsafe intermediate blends must block shooting. Favor tiny shoulder change over sidestep, otherwise return to existing physical motor.
- Preserve wall, door, civilian, friendly fire, ammunition ordering and shot policy; deterministic success/failure, gaze stable under movement.
**Acceptance**: exact muzzle/hand fit agreement; small offset opens a legitimately safe lane; impossible lane stays vetoed; deterministic when interrupted, no oscillation or self-enabling fire; A3.0 lab tests and full critical subset.
