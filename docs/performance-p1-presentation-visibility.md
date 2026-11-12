# P1 — Presentation visibility and scene-update recovery

Baseline: main `9319da98423b527a1b0e7552c12f39831ecfc946`. Device evidence: roughly 18–22ms scene sync and thousands of optical queries per 750ms in a live Courtyard Rowhouse, but not all queries are from rendering. Keep measurements honest: GPU frame time is not covered by JS-only timers.

## Protected behavior
Authoritative `liveVisibility`, `observerPointVisible`, `inSight`, simulation, AI, combat, intel acquisition and fog painting remain unchanged. Replay personal/team/full disclosure remains fail-closed and uses its recorded knowledge. Geometry, actor identities and saved mission states are not altered. Disable presentation memo reuse during replay.

## Stages
- P1.0 Trace scene query classes: décor, doors, impacts/effects, actors, openings. Establish a baseline and add explicit presenter-only diagnostics.
- P1.1 Introduce a bounded, scene-owned presentation sight memo. Validate exact LOS-relevant geometry snapshots before reuse: friendly actor positions/facings/posture/health, door optical states, cover bounds/material/low status, site identity, world geometry revision, intel mode and object revision. No cached answer survives a changed input.
- P1.2 Route static render visibility calls through the memo, preserve no-live-LOS personal replay, and maintain dynamic impact/cutaway/camera-specific checks. Don't memoize authoritative sight.
- P1.3 Add opt-in counters to existing ?perf=1 overlay: presentation lookups/hits/misses/bypasses/invalidations, per-category expensive misses; bounded map size, no allocations per render query beyond the stable key.
- P1.4 Regression test same-state parity, per-input mutation invalidation, pauses, mission swap, replay scrub, empty/full knowledge, door glass and moving furniture; run production typecheck/build and critical browser smoke. Verify Pages and merge only at the release checkpoint.

## Performance acceptance
- Repeat static/active/replay same-seed mobile capture (A/B old v optimized). Compare RAF gap p50/p95, JS p50/p95, scene-sync, presentation sight misses and draw calls.
- A reduction of visibility queries is valid even if frame time remains limited by other bottlenecks; do not claim a device FPS gain without actual matched-device evidence.
- A cache hit may *never* reveal previously undisclosed actors or decorations.
- Do not reduce authoritative sight frequency or intentional fog/camera responsiveness to win benchmark numbers.

## Rollback
P1 changes are isolated to the new memo class, 3D presentation call sites, and opt-in diagnostics. A runtime query flag `presentationSight=legacy` bypasses caching for same-build A/B tests.
