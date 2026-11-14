# D2.1 — Combat hotpath parity, instrumentation and release gates

**Baseline:** main `990c0b35c19ed2850a76d2827c98d5bc596342cc` (D1 production).  
**Scope:** D2.1 from D2.0 read-only audit. No movement, AI, damage, gun handling, recognition, reaction, collision or scene output feature changes; no new simulation controller, per-frame state cache or clock.
**Release mode:** staged commits on `feature/d2-1-combat-hotpaths-20261113`. Do not merge/deploy until explicitly asked.

## D2.1a — Stable target-selection and order-threat hotpaths

- `breach-order-executor.ts`: replace `filter().filter().sort()[0]` with one pass over the same original roster. Preserve health/side filters, `port.inSight` call order for live candidates, Euclidean distance comparison, stable original-array precedence for ties and the same `undefined` fallback. Preserve the existing early returns for active traversal and fire-clearance corrective steps.
- `breach-target-selection.ts`: 0/1 targets bypass allocation/sort, and multi-target acquisition retains the original sorted stable `hypot` / ID tie-break. Replace `valid=near.filter(clearLane)` and subsequent `find` scans with local first-safe and current-safe references **while still evaluating `clearLane` exactly once for every multi-target candidate in the same sorted order**. The callback can produce a known-civilian warning; do not short circuit just because the current target is clear. Preserve current-target preference when safe, fallback when every lane blocked, and lone blocked target tracking.
- Unit parity corpus: same picked target and callback order for 0, 1, 2, 8 or 16 targets; equal distance, ID locale tie, repeated current target, all blocked, penetrable cover classification and deterministic WARNING side effects. Include static source invariant forbidding `.filter().filter().sort()` in order selection.

## D2.1b — Skip irrelevant work in quiet/no-target ticks

- `breach-firing-pipeline.ts`: only build the friendly volume roster for `fire` when there are confirmed visible contacts. No-target passive aiming and `.48s` clear-look still run precisely as before, without extra roster work. No movement or recoil timing changes.
- `breach-shot-resolution.ts`: do **not** share safety roster/certified fire solution with preflight in D2.1: the post-spread safety proof must be evaluated at ignition. Any changes to final-shot work are reserved for D2.2.
- Preserve A3.3 busy-plan cancellations immediately, even when paused or an authored plan changes. A per-plan cache is **out of scope** without proven invalidation keys.
- No-target, HOLD, RETURN, SUPPRESS, and just-confirmed-contact traces must retain exact progression, ammo, RNG, goal, stance, event and replay fingerprints.

## D2.1c — Opt-in combat cost evidence, zero behavioral effect

- Add `breach-combat-cost-counters.ts` as a tiny observational module: one boolean switch, small integral counters and a `drain` snapshot/reset, mirroring `breach-sight-cost-counters.ts`. No Session mutation, persisted cache, timer, RNG, object ownership or fresh per-tick objects.
- Count individual `weaponClearance` calls, the actual `assessFireLane` probes made by its bounded search, `selectFireableContact` multi-target candidate checks, and physical corrective-step searches; count both visible 3D and fixed-step clearance, **not** fake FPS/GPUs. A single opt-in PERF panel displays interval aggregates; the existing detailed PERF toggle owns activation, independently from the sight cache. No invisible shader/material or animation cost added.
- When disabled, an inexpensive boolean check is the only overhead in the clearance/target path. All counts are diagnostic only; replay same-timestamp and game trace unaffected. Test enabled/disabled/reset and no effect on selected target or game state.
- Metrics must identify work **not** claim that every probe is a raycast: `clearanceProbes` counts calls to the existing material/height-aware lane check from `weaponClearance`.

## D2.1d — Deterministic integration and release evidence

- Targeted unit contract plus existing A3.2, A3.3, A3.10, A3.11; `breach-roadmap2-stage10-combat.test.mjs`; `gameplay-g3-target-stability.test.mjs`; `tactical-integration-17-firefight-b1.test.mjs`; sight-cache and replay; D1 four-person/70-case matrix for any unexpected contact regression.
- Run D0 CPU workload audit on unchanged fixture and compare gameplay fingerprints against saved D0 reference; **do not use runtime ms as correctness equality**. If D1 intentionally rebaselined golden since D0, verify new baseline by before/after same-D1 SHA check in CI, not by changing gameplay to satisfy obsolete trace.
- `npm run build` + relevant R7 firefight and representative generated layout tests; PR checks must be green at the exact final head. No unverified deployment. Record the direction of CPU work counts and elapsed performance with hardware/JIT/GC caveats.
- After this stage, D2.2 is still responsible for consolidating repeated *same-snapshot* geometric preflight with the untouched final probabilistic shot validator.

## Non-negotiable invariants

1. Identical number/order of visible-contact evaluations and multi-target candidate callback side effects. No hidden-contact targeting.
2. No early reuse of a clearance result to approve a final bullet. Final random yaw and full friendly/civilian trajectory veto stay intact.
3. No change to player-authored WATCH/WAIT, plan, movement, stance, timing or AI doctrine.
4. No new persistent per-actor state and no per-RAF simulation counter updates unless opted-in.
5. No claiming a browser FPS/thermal gain from GitHub-hosted Node CPU tests.
