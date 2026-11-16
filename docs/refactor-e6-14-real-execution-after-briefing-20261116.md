# E6.14 — First actual execution frames after briefing close

## Why E6.14

E6.12 proved all 90 sampled post-READY callbacks were **planning/idle** and
not active combat. E6.13 reduced the repeated, covered idle 3D submissions
from 90 to 2 per 90 callbacks, with the fully rendered scene restored when
the briefing closes. Those figures are not a live game frame rate.

We now need to check what the *actual executing* runtime does as the first
90 frames are submitted, and make it impossible to misinterpret planning
benchmarks as combat performance. E6.14 is instrumentation-only.

## New capture

When the existing `?coldBench=1` local opt-in is enabled:
- The E6.11 startup durations and independent 90 RAF sampler stay intact.
- E6.12 still samples 90 **planning/briefing** callbacks in
  `postReadyRuntime`.
- The **first real live** tactical RAF callback starts a separate bounded
  `liveExecutionRuntime` capture of up to 90 executing callbacks, even
  if the player spent a long time reading the briefing.
- A mission that ends or pauses before sample completion is marked
  interrupted; hidden-tab captures are also marked interrupted.
- New Quick Play attempts cancel prior collectors. No new RAF scheduling,
  loop, WebGL instrumentation, sync, background upload or persistent data.
- The local **SAVE COLD BENCH** JSON includes p95 callback, simulation,
  scene, UI and canvas wall durations, counts of frames that submitted 3D
  and executed simulation, live/idle modes and the eight worst **preceding**
  callback/RAF gaps.

Captures are diagnostic and strictly bounded. They measure JavaScript/
browser synchronous wall time, not GPU execution time, actual hardware FPS
or an iPhone Safari baseline.

## Browser regression

Fresh Chromium ANGLE/SwiftShader processes on mobile-emulated 390x844
viewports use seeds 23 and 97 with `briefingIdle=0` and
`briefingIdle=1`. The real Quick Play creator generates the site, the
briefing waits through 90 idle callbacks, is dismissed, then the real
`#play` control starts execution.

The acceptance test requires:
1. E6.13 ON still submits at most 4 covered 3D frames, OFF at least 85,
   all 90 samples staying idle with no simulation.
2. E6.14 obtains **90 actual live callbacks**, 85+ 3D submissions and
   meaningful simulation measurements in each variant, with no errors.
3. A real local JSON download includes both planning and executing
   summaries, preserving the older schema and all previous information.
4. Focused tests/production build/architecture/performance critical
   regressions are green. Prior Pages release exact SHA is healthy before
   merging; subsequent Pages deployment SHA is independently verified.

We do not gate success on a fixed software-renderer FPS, as CI machines
and ANGLE SwiftShader scheduling vary. The evidence determines whether
the **next optimization** should target live simulation, actors/poses,
fog/material submission, or browser stalls. No gameplay or visual quality
is changed in this stage.
