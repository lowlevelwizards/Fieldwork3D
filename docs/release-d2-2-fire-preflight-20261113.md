# D2.2 — Same-snapshot shot preflight and deterministic clearance consolidation

**Starting point:** the unmerged, green D2.1 branch `feature/d2-1-combat-hotpaths-20261113` at `278e793f`. D2.0 roadmap: PR #1374. D2.1: PR #1375. This is a **stacked implementation**; do not merge or deploy either branch here without a separate release checkpoint.

## Scope and audited behavior

The authoritative 60Hz `fire()` path chooses a *visible/confirmed* target and evaluates physical target-heading muzzle clearance. A bounded 0.16s shoulder-offset search can test the same unchanged centered geometry twice. Friendly footstep preflight tests the actual target-height muzzle, and the later ready-mode preflight tests a settled weapon orientation before dispatching to `commitShot()`. Prior to D2.2, `commitShot()` reconstructed identical friendly safety bodies and, for ordinary zero cover-drop posture, repeated the exact same bounded weapon-clearance solve. Material lane checks also re-scanned the same near-target friendly volumes after an explicit near-target veto.

These are **distinct** from the final randomized projectile: the actual shot is allowed to deviate with spread and must recompute post-spread muzzle geometry, observed-civilian safety, near-point teammate/cover and long far-tracer teammate safety. No part of the shot can skip those checks, and RNG must remain in the same place.

### D2.2a — Pure preflight handoff (implemented)

- `breach-fire-preflight.ts` owns a tiny typed `ShotSightPreflight` containing the actual input, result, doors/cover/walls and immutable-in-this-call friendly snapshots. No session-scoped or per-render cache or stored fire-permitted flag.
- `prepareShotSight` evaluates the same settled yaw once. `matchingShotSight` performs exact scalar/identity comparison for pose, angle, weapon, configuration, equipment, shoulder, offset, posture, speed, recoil, range and environment. Undefined and zero cover drop are equivalent in muzzle calculations.
- `fire()` passes the sample directly to the *synchronous* `commitShot()`. The resolver reuses it only if identical. If anything differs, it recomputes clearance; it reuses the same fixed-tick friendly bodies because no actor movement or posture updates occur between the handoff and call.
- Previously the ready-mode call omitted `coverStanceDrop`, while the shot resolver included it. **Preserve** the old ready-mode decision and force a fresh settled solve for nonzero drop; do not silently change cover-height gameplay through this optimization.

### D2.2b — Shared safe near-target policy (implemented)

- Shared `nearShotLane` tests allied physical safety **before** walls, doors and penetrable cover; this preserves the existing separate friend veto (so cover never hides a teammate) while unifying candidate-acquisition and shot-preflight code.
- After the explicit same-coordinate, same-height ally check succeeds, static material geometry is checked without repeating that identical friend-body roster scan.
- Do not alter or collapse the *different* far-shot guard, randomized-muzzle validation, and true civilian impact checks. Cover penetration still uses the existing ballistic `strikeSurface` / `fireLaneReachable`, not a new hit predictor.

### D2.2c — Bounded candidate cleanup (implemented)

- A deterministic zero shoulder-offset check may be revisited by the unchanged `chooseMicroAimOffset` candidate order. Reuse its boolean locally only for an exact second zero-offset request within the same function invocation; all other candidate tests and the nearest safe accommodation order stay unchanged.
- When that centered offset was fully proven safe in the same fixed tick **and the physical shoulder is actually centered**, skip the redundant friendly-sidestep preflight. Otherwise it still runs, including on intermediate shoulder motion or when shoulder search did not run.
- The bounded swept foot correction retains all teammate/personal separation predicates and real motor ownership, but uses a straightforward fail-fast loop instead of allocating a fresh `Array.every` callback on each tested candidate. No extra searching, new physics objects, teleport or relaxed collision tolerance.

### D2.2d — Acceptance and rollout

- Dedicated `release-d2-2-fire-preflight.test.mjs`: exact snapshot hit/miss, zero cover-drop semantics, independently changed world/roster/weapon/yaw/posture/velocity, known 2.5D friendly safety precedence, identical original two-stage near-lane result and unchanged shot/side-effect source authority.
- Existing D2.1 reference target-order and diagnostics tests, A3.2/A3.3/A3.10/A3.11 close-stack firing, physical correction/reaction, two-sided fire, B1 actual firefights, plus R7 four-person firefights, `npm run build`.
- Existing D2.1 CI also runs the D1 before/current **ten same-seed gameplay fingerprints**; this is the regression gate for unintentional changes to movement, ammo, events, RNG and replay.
- Compare D2.1 vs D2.2 clearance calls/probes and CPU workload profiles on matched seeds if CI artifacts are available. Do not claim iPhone FPS, heat, battery or GPU gains from Node tests. Any mobile claims require a matched device capture.

## Non-goals and explicit guards

No new reactive controller, physical footstep rules, broader detection, altered weapon accuracy, more polling, stale persistent geometry cache, renderer shot authority, changed plan priority, or altered suppression mechanics. `commitShot` still authorizes fire only after a real exact muzzle/cover/friendly/civilian trajectory and the seeded stochastic yaw. All shot safety vetoes after dispersion remain fully authoritative.

Future D2.3 continues the formal interruption hierarchy and committed recovery; D2.4 covers contact/stance/pose efficiency; D2.5 perception/accuracy tuning and D2.6 integrated release validation. D2.2 stays a focused efficiency/consolidation release until passing its exact-head CI.
