# P2.2 — Controlled paused-3D WebGL submission A/B (opt-in only)

## Evidence (user's iPhone P2.1 follow-up, 2026-11-12)

Latest 60-second COPY: live 491 RAF callbacks (9 intervals >=67ms,
max 122ms); paused/idle 1478 callbacks (50 intervals >=67ms,
max 1068ms). Worst interval: prior JavaScript 63ms, simulation 0ms,
between-callback interval 1005ms, prior 3D gpuSubmit **CPU** 48ms,
scene sync 60ms. Further paused intervals of 217, 213, 206, 182ms
likewise have 39–50ms preceding JS and 143–171ms between callbacks.
A different screenshot/window shows an 181ms RAF gap,
preceding JS 28ms, 17ms WebGL submit **CPU**.

This is NOT proof of actual GPU execution time. The interval can also
include Safari/compositor scheduling, OS/browser tasks, thermal throttling,
or app/UI interruptions. Do not infer a measured GPU duration from
`RAF - previous JS`. Shadow map width reports 512px, as intended.
P2.1's cold 664ms four-actor posing spike is not observed among the latest
top-5 intervals; absence is not proof of elimination.

## Experiment: `?idle3d=30` vs baseline `?idle3d=60`

Default production behavior remains the current every-RAF 3D update and
WebGL submit. Only explicit `?idle3d=30` installs a 30Hz *paused 3D* gate:

- The authoritative 60Hz fixed-step simulation, mission time, recording,
  replay seeking/playback, and live view are **never capped**.
- The browser RAF keeps running; HUD/status, authoring feedback, 2D route
  overlay and sound updates continue on every callback.
- If 3D is available, the paused/planning scene skips intermediate 3D
  updates/renderer submissions until 30Hz, with full-rate immediately
  after pointer, touch, wheel or keyboard activity and for 800ms afterward.
  The initial frame and mission/mode transitions always draw immediately.
- Presentation-only time deltas accumulate across skipped frames, preserving
  idle breathing/glances and camera smoothing speed.
- Skipped scene phases and draw-call counts report zero instead of the
  last rendered frame's stale statistics.
- No WebGL extension queries, device blocking calls, extra shadow passes,
  graphics-setting changes or expensive per-RAF analysis are added.
- The opt-in overlay displays `IDLE3D 30 · SKIPS N`; COPY/TXT view is
  labeled `iso idle3d30` (or `top idle3d30`) to avoid mixing A/B reports.
- This is a controlled *test*, not a permanent 30fps game mode or
  an assertion that Safari delays are GPU-bound.

## Proposed same-device acceptance test

Open same mission, seed, camera, reveal and quality in two fresh runs:

**A (default)** `breach.html?quick=1&perf=1&idle3d=60&seed=<seed>`

**B (experimental)** `breach.html?quick=1&perf=1&idle3d=30&seed=<seed>`

Perform 20–30 sec live execution, then 30–40 sec paused with no camera
interaction (the reduction starts 800ms after last input). COPY both.
Compare *per-mode* >=67ms callback intervals, RAF P95, preceding JS,
between-callback waits, frame draw counts, visual smoothness, battery/heat
impressions, and camera responsiveness on tap/orbit. If the 30fps test
does not clearly improve paused pacing or the view feels worse, leave it
off and investigate browser-side timing with external tooling.

## Regression gates

Unit tests cover pure opt-in mode predicates, immediate render on
session/mode change, RAF/2D overlay and audio continuation, exact scene
elapsed dt, and immediate pointer bypass. Existing runtime, disclosure,
mobile history, animation and production build tests remain critical.
