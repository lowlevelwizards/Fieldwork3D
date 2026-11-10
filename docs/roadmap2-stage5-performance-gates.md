# Roadmap 2 — Stage 5: performance baselines and release gates

Baseline: `main` after Stage 4 merge, `5db34f1a9424c923da7dd2d8bfcf1c5a6834ffae`.

## Ownership and limits

This is a verification and release-safety stage, not a performance optimization
or gameplay rewrite. `breach-game.ts` remains the 60 Hz simulation authority.
Stage 1's frozen SHA-256 scenario outcomes remain unchanged; Stage 2 physical
geometry, Stage 3 visibility/history, and Stage 4 replay/command presentation
are still tested by the curated architecture gate. No golden fingerprint may
be refreshed just to satisfy a performance regression.

The performance gate lives in:

- `scripts/verification/breach-stage5-performance-contract.mjs`:
  pure parser and stable evidence invariants, independent of CI hardware;
- `scripts/verification/breach-stage5-performance-gate.mjs`:
  orchestrates **existing** simulation and long-round benchmarks and writes
  `artifacts/performance/roadmap2-stage5-host.json`;
- `tests/breach-roadmap2-stage5-performance.test.mjs`:
  positive, missing-data, duplicate, malformed, truncated and timing-unit cases.

All diagnostics are out-of-band. The gate does not modify the tactical
scheduler, actor state, live recorder, FOW, replay history, weapon/movement
simulation or the actual rendering loop.

## Baseline workload matrix

| Evidence | Configuration | What is exercised |
| --- | --- | --- |
| Simulation | Seeds 3, 17, 61, standard site, with and without recording, 90 ticks each | Real authoritative simulation tick plus recorder overhead |
| Simulation | Seed 17 expanded site, live and recorded, 60 ticks each | Geometry scaling |
| Simulation | Seed 17 standard and expanded, civilians enabled, recorded, 90/60 ticks | Civilian actor cost |
| Geometry | 3 standard seeds and 17 expanded, eight repeated samples per case | Visibility 180-point scan, intel observation, vision polygon |
| Combat | 180 ticks, actual projectiles and contact | Active shooting/perception/effects workload |
| Recorder retention | Seed 17, 90 seconds at a 60 Hz **capture invocation** rate; 30/60/90-second reports | 20 Hz persisted outcome history, motion steps, shared fields, retained heap and capture latency |
| Authoritative regression | Stage 1 frozen baseline + Stage 2 physical contracts + Stage 3 knowledge + Stage 4 composition and replay contracts | Game correctness regardless of performance |

The simulation benchmark is an observational CPU workload, not a stand-in
for walking orders; Stage 1's actual authored WAIT/MOVE, doorway motor,
combat/AI, wound/reload, mission outcome and replay parity tests cover that
behavior. This separation avoids adding a second, possibly divergent
simulation harness.

## Blocking vs observational measurements

**Blocking:**
- All expected seed/size/recording/civilian combinations and geometry probes
  exist exactly once. Missing, duplicated, malformed or non-finite data fails.
- Real combat produces at least one shot; civilian workloads contain civilians.
- Timing samples are valid (finite, non-negative, ordered p50/p95/max), but
  **their magnitudes are not graded** on a shared GitHub Actions runner.
- Recorder remains complete, non-truncated and monotonic at every 30-second
  window, with final film duration/count matching the observed history.
- Persistent outcome frames stay near 20 Hz (generous **14–26 samples/sec**
  envelope), preventing accidental 60 Hz deep snapshots or dropped recordings.
  Motion events and frame counts remain separately reported.
- Critical architecture tests, dependency checks and production TypeScript /
  Vite build pass; prior Pages production build must be successful and actually
  served before this change is eligible to merge.

**Observational:** host CPU average/p50/p95/max, 30-second capture quantiles,
heap MB after optional GC, shared field count, WebGL draw calls and RAF
cadence (the latter two are device/browser diagnostics, not Node benchmarks).
The emitted JSON is a machine-readable baseline artifact of the *tested run*,
not a universal device performance budget. Do not turn variable-host
milliseconds or heap MB into an arbitrary blocking threshold.

## Running and release procedure

Focused contract unit tests:

```sh
node --experimental-strip-types --test tests/breach-roadmap2-stage5-performance.test.mjs
```

Collected baseline report (Node 22, no browser needed):

```sh
node scripts/verification/breach-stage5-performance-gate.mjs
```

CI on a `refactor/roadmap2-stage5-*` PR also runs:
- curated architecture authoritative scenarios and dependency boundaries;
- Stage 1 longer deterministic replay soak;
- targeted visibility, movement and recorder regression tests;
- Stage 4 replay / pointer / feedback composition suite;
- the performance evidence gate and artifact upload;
- `npm run build`;
- fail-closed `scripts/audit-pages-release-checkpoint.mjs`.

Merge only after these checks pass, the prior Pages deployment has no queued
or failed publish, and the served `fieldwork-build.json` matches `main`.
After merge, check that the new Pages run succeeded and the served build ID
matches the merge SHA. Don't queue a new merge during an in-progress release.

## Physical device baseline protocol (explicitly not CI)

For an iPhone Safari baseline, use the **same device, site seed, view,
squad size, FOW and quality profile** across comparisons. With `?perf=1`,
record idle paused, active four-person traversal, first fog reveal,
crowded doorway, sustained contact, and multi-minute replay seek. At 0:30,
2:00, 4:00 and 6:00 record JS p50/p95, RAF-gap p95, SIM+REC, REC, SCENE,
WebGL calls/triangles, frame count, visible stutters and memory pressure
where available. Also test `?perf=1&quality=performance` to isolate likely
GPU pressure. A Node timing improvement **cannot** establish phone FPS,
GPU milliseconds or the disappearance of long-round stutter.

An unattended GitHub Actions runner cannot validate physical iPhone
performance. Record device evidence separately; don't mark that gate as
satisfied without actually running it. Stage 5 is complete as an automated
baseline/release-safety implementation when the PR test matrix and production
release checkpoint are green; physical-device performance remains a
documented acceptance task for any future performance claim.

## Out of scope

No Stage 6 3D site-builder extraction; no changed simulation physics, bot AI,
pathfinding, weapon balance, recorder format, camera behavior, visual
fidelity, FOW algorithm, stored replay limits or golden rebaselines.
