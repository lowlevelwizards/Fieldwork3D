# P1.5 — Execution-Aware Visibility and Performance Timeline
Status: implementation branch `feature/p1-5-execution-timeline-profiler`; baseline `f0dc01f1c56ec62b3fd3c7b801dd16c104f84f17`.

## Evidence
iPhone P1 ON: stationary JS 10ms / RAF P95 18ms / sync 9.6ms; active JS 21-30ms, RAF P95 112-166ms; P1 OFF active JS 28-32ms, RAF P95 92-121ms. These are unsynchronized frames and cannot support causality. P1 shows 80k+ cumulative lookups: report **recent deltas** instead.

## Stage A: cache policies (iPhone review, 2026-11-12)
- `?presentationSight=planning` (B, **shipped default** without an override): reuse during paused/planning, bypass during active execution.
- `?presentationSight=always` (A, explicit comparison/rollback): memo in execution and planning.
- `?presentationSight=legacy` (C, explicit baseline): no memo anywhere.
- All three bypass historical replay and preserve identical authoritative source sight and disclosure. User-approved B promotion followed observed steady-state iPhone P50/P95 improvements; the captures were not workload matched, so no claim that stutters are solved.

## Stage B: calibrated time attribution
- Measure frame gap, JS, simulation, recording, 3D scene update (including WebGL submit), HUD/interactions, and overlay.
- Inside 3D scene update, separate environment/window refresh, camera updates, disclosure, operator pose, effects/decal, fog painting, shadow policy and WebGL submission. These are CPU wall-time slices; **not GPU execution time**.
- Capture actual changes (fog paints, shadow refreshes, cache invalidations / misses) as context associated with a spike, not as an unverified cause.

## Stage C: bounded, persistent diagnostics window
- `?perf=1` maintains a 60s rolling history with 250ms buckets, storing worst RAF gap in each bucket to avoid losing short spikes. Also retain top spikes with phase/context for diagnosis.
- Draw an actionable graph for RAF frame cadence and CPU scene update, color-mark >33ms and >66ms, allow tapping the graph to inspect historical spikes.
- Keep the graph available after the spike; compact/collapsible UI avoids obscuring phone controls. Add Copy Report action with metrics, spike timing, attributed components, and P1 hit/miss intervals; no server upload, no persistence in normal gameplay.
- All allocations, canvas redraw, additional timing probes and copy actions are only active behind `?perf=1`. Sample aggregation is bounded, redraw <=4 Hz. Avoid sorting per RAF.

## Stage D: critical release and device validation
- Unit tests for modes, ring-buffer history boundaries, spike capture, real component breakdown, copying/report formatting, and session reset.
- Browser smoke on mobile viewport for 3 cache modes, quick planning/execution, no shader errors and chart/report UI. Do not conflate browser SwiftShader with physical iPhone FPS.
- One feature branch, commits per completed stage. Safe merge after critical checks and Pages queue clear; verify expected deployment.
- Real iPhone decisions should use same seed/camera, 20–30s planning + active, and at least one repeat per policy. Keep safe default unless evidence shows a better choice.
