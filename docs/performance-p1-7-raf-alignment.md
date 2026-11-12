# P1.7 — RAF Interval Truth and Live-Execution Spike Attribution

## Evidence — iPhone, 2026-11-12
After user-approved B policy promotion, an opt-in 60s capture showed:
- Last 120 callbacks: RAF P50/P95 17ms, JS P50 8ms, JS P95 10ms, **zero simulation ticks**. This sample represents the paused tail, not sustained execution.
- 60s timeline: 43 quarter-second buckets with RAF peak >=67ms and 134 other buckets with peak >=33ms.
- Worst RAF peaks: 326ms, 282ms, 277ms, 249ms and 233ms, all marked as **live**.
- One 249ms callback had 104ms of *current* JS and 82ms of *current* simulation; this does not prove that this work caused the preceding 249ms callback interval.
- Fog and shadow refresh counts are event correlations, not measured GPU costs or proof of causes.

## Key correction
A requestAnimationFrame gap is measured from the **previous** RAF callback timestamp to the **current** callback. The previous callback's JS work occupies part of that interval; current callback's JS work occurs **after** it.

P1.5 displayed current RAF and current JS together, then classified their difference as un-attributed. Such a comparison can misdiagnose a long preceding JS callback as GPU/browser work.

P1.7 now tracks:
- Previous complete callback JS duration (including optional performance overlay work), previous simulation cost and previous runtime phase.
- Current callback JS/simulation costs, unchanged, separately labelled.
- Remaining callback wait = max(0, RAF interval - prior callback JS). This **does not** measure GPU execution or exclude work from browser tasks, compositor scheduling, other scripts or throttling.
- Live, idle and replay callback sample counts and >=33ms/>=67ms gap counts, independent of 250ms peak buckets. A first-frame gap or transition gap may straddle modes.
- P1.7 compact COPY summary and TXT CSV include previous/current distinction, mode breakdown and diagnostic context.

## Safety and constraints
- No changes to simulation tick budget, camera, fog, shadows, visibility semantics, or draw calls.
- All additional timing/counters remain opt-in under `?perf=1`.
- B (`presentationSight=planning`) remains live default, with A/C diagnostic overrides.
- The graph still stores worst sampled RAF per 250ms bucket. The phase counts measure *observed callback frames*, not inferred missing frames or precise mode-specific FPS.

## Next controlled capture
1. In the same mission seed, spend 20–30 seconds executing, then pause 20 seconds without changing camera.
2. Tap COPY; compare LIVE vs IDLE slow/severe callback counts. Inspect the five worst events' `prevJS`, `nowJS` and `wait`.
3. If prior JS dominates, pursue measured simulation/recording or scene CPU slices. If callback wait dominates, investigate browser scheduling, compositor and graphics workload only with further controlled evidence.
4. Export TXT for timestamped 250ms buckets and deeper breakdown if peaks remain unexplained.

Do not attribute a RAF wait to WebGL or GPU time without an independent GPU/browser measurement.
