# Movement Reliability R1 — rolling staged implementation and release gate
Date: 2026-11-20. Integration branch: `feature/movement-reliability-r1-20261120`.

## Invariants
One authoritative fixed-tick motor and final frame arbiter; no generated displacement without full-body physical sweep, no unlocking or walking through closed leaves, no world-intel leakage, no authorship edits in route repair, no unbounded A*, no false physical arrival, and preserve deterministic replay and undo.

## R1.01 — trustworthy acceptance
- Historical 11-map physical baseline uses `scripts/verify-d3-30-mainline.mjs`, with actual per-operator locked-door evidence. Former D3.18 thresholds 80/88 and 18/22 required physically illegal locked-door arrivals.
- Historical evidence baseline (2026-11-18): 75/88 physical arrivals, 16/22 complete four-person squads, 13 documented locked-door terminal non-arrivals, zero loops. This is the **nonregression floor**, not a game-quality target.
- The independent 22-map holdout must retain full physical integrity and truthful reasons. Real-world successes are measured separately from cancellation counts.
- The obsolete D3.18 duplicate historical/fresh full-corpus jobs are dispatch-only; PRs retain its focused unit job. The main D3 release checkpoint already gates the 11-site 45-second corpus once per release.
- Do not weaken authority, edit frozen seeds, count cancellations as successes, or remove the older workflows; compare non-arrival witnesses explicitly.
- GitHub Pages release must not start while a prior deployment is queued/running. Confirm previous run success and publicly served exact SHA before merging release batches.

## R1.02 — generated ENTRY wait
- A random healthy blue roster member is **not** sufficient evidence that a specific generated doorway leader crossed. Only an actor with an independently witnessed generated same-door ENTRY may release a conservative follower WAIT based on actual far-side geometry. Ordinary doorClear stays authoritative otherwise.
- Never release on stale teammate cancellation, unrelated passage, missing/locked/jammed door, wrong approach, or guessed hidden information; final motor still sweeps every footstep.

## R1.03 — committed movement accounting
- The final physical authority pass may reject a previously motor-accepted movement after body arbitration. That rejection must be retained as actual blocked time, not erased by another *provisional* motor acceptance next tick. A genuinely committed footstep resets the commit-block streak.
- Do not count unchanged position, route assignment, wait or visual interpolation as progress; no new locomotion authority.

## Planned next stages
- R1.04 route provenance / first-motor-stride certification and retry ownership.
- R1.05 door/threshold owner lifecycle and forced-open invalidation.
- R1.06 repeated crossing and four-person formation coordination.
- R1.07 feedback and presentation parity.
- R1.08 exact-seed holdout, desktop/mobile browser acceptance and verified release.

## Focused checks and release batching
Run TypeScript, deployable build, changed-domain node tests, a few exact seeded physical witnesses. Reserve expensive 88/176-actor corpus for logical merge checkpoints. Group compatible stages and keep all unverified work on draft feature PRs. Never merge a batch on a green unit test alone.
