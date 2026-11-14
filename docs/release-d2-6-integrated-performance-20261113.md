# D2.6 — Integrated Simulation, Visibility, Movement and Performance Closeout

**Stacked base:** exact green D2.5 PR #1383 commit `0cb749d1ef2482efc4b9e9167c996d3c77ed7a73`, atop deployed D2.4 `09bc3f21993a8bf8e944194941df4c13266521e6` (Pages run 43541630614 publicly verified). Branch `feature/d2-6-integrated-performance-20261113`; **do not independently merge while D2.5 is unmerged**.

## Codebase audit: owner boundaries, costs and no-go changes

1. **Simulation:** `breach-simulation-phases.ts` is the one 60 Hz authority; actors, motion, contacts, reports, visual acquisition, fire, replay and mission are separate phases in fixed order. `breach-runtime-loop.ts` owns RAF but not gameplay. Avoid independent timers, async AI and speculative frame skipping.
2. **Detection:** `breach-game::geometricallyVisible` has exact facing/door/cover LOS with actor-pair Session cache. `breach-visual-acquisition` owns personally recorded visual progress. D2.5 uses its existing scalar to separate silhouette and ID. `actorLightingLevels(s)` currently computes an 8 Hz full-scene illumination field even if no cross-team pair is physically visible; skip this expensive calculation only when *no* visible subject needs gain.
3. **Actor loop / Q1 idle yield:** `breach-simulation-actor-phase.ts` scans the live roster for moving friendlies, allocates `nearby`, builds `nearby.map(id)` **twice**, plus `peers.map` per actor. Use a streaming empty fast path and one ID roster once per eligible real yield request. Maintain full exact Euclidean distance, actor order, idle-yield ledger and *single* swept motor collision. Never move authored WAIT/WATCH/STACK, and never reduce physical blocking.
4. **Civilian/transport:** `breach-simulation-motion-phase.ts` initializes a carried-body Map every tick even when no carrier exists. Real carrier checks create filter/map/spread temporary arrays for people. Allocate only when real coupled transport exists, collect people in existing operator-before-civilian order and use same coordinate references. Keep rollback, hard collision, movement proposal order and actor/civilian identity exact.
5. **Hard-body motion:** `breach-movement-authority.ts` already has conservative AABB broadphase and deterministic sorted opposite-body pairs. Every near pair needlessly clones both proposal objects just to read the currently accepted endpoints in `crosses`. Pass those endpoints directly with identical math/ordering. Never skip true collision checks, prioritize a different loser, or change the physical envelope.
6. **Contact/fire/pose:** D2.1–D2.4 eliminated some redundant target scans and clearance, consolidated physical pose state and hand guards; D2.5 adds bounded ID/reaction cost. Do not stack further range accuracy multipliers, bypass post-random-yaw muzzle/civilian/friendly checks, cache a shot across ticks, or add extra rig/LOS scans. Profile before touching heavily integrated geometry/pose solvers.
7. **Diagnostics and replay:** D0 host workload fingerprints, D2 opt-in counters, frame-meter ring buffer and 20 Hz replay/60 Hz motion journal exist. No default performance sampler. Node timing / heap are advisory, not device GPU/FPS/thermal.

## Staged implementation

**D2.6.0 — Source audit & acceptance matrix.** Document every owner, expensive avoidable operation, truth guarantees and baseline D2.5 SHA. Freeze outcomes for staged same-seed workload comparison.

**D2.6.1 — Idle traffic hotpath.** Lazy nearby list, one nearby-ID allocation for actually eligible yield, same order and one optional swept real step. Eliminate no-mover per-actor array allocations.

**D2.6.2 — Perception/light lazy work.** Compute one shared 8 Hz lighting snapshot only upon first physically visible subject inside the already-authoritative visual pair scan. Preserve all range/ID/obstruction, light, silhouette, replay, ready-state contracts. Neither light nor render can infer contact.

**D2.6.3 — Civilian and collision work.** Lazy carried-body Map on transports, one ordered live-body roster for coupled checks without chained arrays. Pass accepted collision endpoints directly, while keeping conservative AABB and every exact swept crossing.

**D2.6.4 — Far-ground memory broadphase (profile-guided).** The D2.5/D2.6 ten-workload CPU baseline identified `observe-intel` as a dominant simulation phase. V1 long sight already schedules only 1/16 distant 20-unit cells per observation; it unnecessarily checked each other cell's radius/FOV and constructed position objects before discarding them. Move the **exact same** `((col+row*3)&15)===bucket` filter ahead of FOV and point construction in the existing pure candidate walker; the LOS, seen-ground, per-operator replay journal, deterministic row-major visit order and 10/20-unit near sampling are identical. Add a 256-view/bucket old-vs-new candidate-order corpus and run ten-workload gameplay fingerprints again. Never skip a scheduled LOS ray or introduce a stale sight cache.

**D2.6.4b — Prove exact gameplay parity.** CI checks run D0's unchanged 10 real workload scenarios twice: checked out D2.5 SHA and exact D2.6 PR head, same Node version / runner, reporting complete snapshots and SHA-256 fingerprints. Differences in authored orders, objective, positions, health, shots, RNG, event order, replay samples/steps fail. CPU p50/p95/p99/mean and heap use remain informational, not a flaky pass threshold. No setTimeout or extra visual frame loop.

**D2.6.5 — Integrated critical test gate.** Existing D1 crossing/yield and D2.1–D2.5 targeting, physical corrections, contact, range identification, B8 pose/replay, R7 firefight, true-neutral safety, V0–V3 fog/perception and deterministic 4/8/16 operator workloads. Production TypeScript/Vite build, one stable merged release checkpoint. Relevant browser / mobile physicality smoke only where CI runners can actually execute; note lack of iOS thermal proof.

## Release and acceptance

- Keep D2.5 as its separate PR. Target stacked D2.6 PR at D2.5 branch, not the deployed main, to prevent accidental merging of unverified work.
- Each stage committed independently to D2.6. Run only essential tests during stages. At final checkpoint run combined exact-head CI and frozen same-seed fingerprint comparison.
- Before a production release verify no Pages deployment queued/running, latest main Pages succeeded and publicly serves exact main SHA. Merge D2.5 then D2.6 *only as a controlled compatible release batch* after latest-head gates pass, with no overlapping Pages releases; do not merge D2.6 into main while a D2.5 production run is pending. Verify each required served-build checkpoint.
- Do not claim phone FPS, battery, thermal or GPU change from Node timings. User-device acceptance: equal seed/layout, four-man outward door stack and threshold, cover/squeeze, active 4v4 firefight, populated civilians, replay seek, fog on generated map. Capture 60s same-device 33/67ms RAF spike rates, CPU slices, and heap after warmup with low-power mode off.

**Invariants:** one fixed tick, one actor/door/civilian motor, one shot authority, one authoritative sight, one replay journal, one hand-owner policy, one 30-slot pose output. No added recurring checking, new stale caches, or altered user orders.

## Corrective CI integration finding

The original `.github/workflows/release-d0-performance.yml` compares all PRs against historical D0 `6b3715a`, which predates D1, D2.1–D2.5 intentional gameplay changes. It fails on `mission-hold` even when the D2.6 source is **bit-for-bit parity with D2.5** on all ten workloads. This is a stale golden, not a newly introduced behavior discrepancy. D2.6 corrects the legacy workflow to fetch `github.event.pull_request.base.sha` as its reference on PRs while retaining frozen D0 when manually dispatched. The separate dedicated D2.6 workflow continues to compare against pinned D2.5 `0cb749d`; **both gates must pass**. No regression has been ignored, expected fingerprints silently rewritten, or minimum sampling thresholds reduced.
