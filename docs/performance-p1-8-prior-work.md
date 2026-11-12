# P1.8 — Preceding CPU Work Attribution (B live baseline)

## User-supplied iPhone evidence (2026-11-12)
Following verified P1.7 release, a real-device 60-second capture with `presentationSight=planning` identified:

| Window | Observed RAF callbacks | Gaps >=33ms | Gaps >=67ms | Worst |
|---|---:|---:|---:|---:|
| Live execution | 798 | 73 | 6 | 100ms |
| Idle / paused | 1942 | 87 | 6 | 928ms |

The 928ms idle gap had **903ms of preceding measured JS**, **0ms preceding simulation**, and roughly **25ms between callbacks**. A 100ms live gap had **92ms preceding JS** and **1ms preceding simulation**. Other idle gaps had up to 136ms of between-callback wait, which is not a measured GPU interval.

The previous P1.7 report correctly separated previous JS from current JS, but lacked details of *which previous-frame CPU subsystem* occupied the time. The currently visible P1.5 scene phases describe the **current** callback, not the preceding callback that affected the RAF interval.

## P1.8 safe implementation
- Capture the preceding callback's opt-in CPU slices: pre-UI, UI/audio, scene update, canvas rendering, post-render work, profiler itself and all existing detailed 3D scene update phases.
- Deep-copy the scene phase snapshot before the next frame overwrites it.
- Associate RAF gap mode with the preceding runtime mode. A pause/resume transition is not proof that the new mode produced the gap.
- Report the dominant measured prior CPU slice in the graph inspection, concise COPY and complete TXT/CSV export.
- Leave simulation stepping, B caching, fog, shading, camera, and visual quality unchanged.
- All instrumentation is behind `?perf=1`, bounded to the 60-second ring; a reported prior slice is an observed CPU duration, *not* evidence of actual GPU execution time.

## Next controlled device capture
1. Record 20–30s of active execution and 20–30s paused using the same mission/camera.
2. Press COPY. Focus on whether the longest live and paused stalls show `3D gpuSubmit`, `3D actors`, `before UI`, `UI / audio`, `canvas render`, or `profiler` as dominant prior work.
3. If `3D gpuSubmit` dominates, test scene submission/resource work with another narrow instrumented experiment before dropping visual effects. A WebGL CPU submit timer includes browser/driver interactions and is not proof of GPU time.
4. If `profiler` dominates, optimize the opt-in report itself instead of the game.
5. If callback wait dominates, use external browser timing evidence; do not classify it as GPU scheduling without more data.

Keep distinct the number of 250ms spike buckets versus the number of observed slow RAF callbacks.
