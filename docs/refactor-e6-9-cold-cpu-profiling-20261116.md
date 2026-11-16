# E6.9 — Cold first-frame JS CPU profiling

## Goal
E6.8 observed ~832–921 ms first-frame wall time with WebGL warmup on,
but direct shader compile/link/status GL calls (~7–8 ms) and resource uploads
(~10–12 ms) explained little of this measured time. E6.9 attributes
**sampled first-frame JavaScript stacks** rather than assuming that shader
or texture uploads dominate.

## Instrumentation
- **Explicit opt-in only:** `?cpuTrace=1`.
- The actual modern Quick Play first 3D frame is wrapped in
  `console.profile('fieldwork-e6.9-first-frame')` / `profileEnd`,
  with the end in `finally`; it surrounds the existing unchanged
  `config.renderFirstFrame()`, whether `?gpuTrace=1` is on or off.
- No CDP, CPU profiler, extra canvas, GPU sync, timer query or render change
  in production gameplay. A small `window.__fieldworkE69` summary exists
  only for opt-in traces, and is not sent anywhere.
- Browser evidence is gathered by the separate Node/Playwright script using
  `Profiler.consoleProfileFinished`. The script creates a **fresh Chromium
  process** for each seed 23 / seed 97, `gpuWarmup=1` / `gpuWarmup=0`
  scenario and enters the **actual Quick Play creator**.
- Each raw `.cpuprofile` is attached to CI artifacts for inspecting the
  CPU flame graph. `e6-9-cold-cpu-analysis.mjs` groups stack samples into
  the Three.js project traversal, material/program setup, geometry/texture,
  draw dispatch, shadow, other Three.js, game, native and idle buckets.
- Counters are approximate sample intervals, not true per-function CPU wall
  durations. Sampling has overhead and native work is not sampled fully.

## Acceptance
- Node profile parser and code boundary tests pass.
- Existing E6.8 cold WebGL hook / fallback tests and Quick Play startup pass.
- `npm run build` passes.
- Real Chromium CDP captures return nonempty bounded CPU profiles and no
  application page errors, for all four cold Quick Play combinations.
- After results, choose the next small optimization from a confirmed
  bottleneck; do not change shadow, fog, lighting, geometry or animation
  quality based on guesses.

## Caveats
Chrome on GitHub runners uses software SwiftShader, not iOS Safari or a
physical mobile GPU. OS cache and scheduling noise remain even with fresh
processes. These four runs are exploratory, not a statistically robust A/B
or FPS benchmark. Separate the diagnostic-only E6.9 commit from any eventual
renderer optimization and compare evidence again before claiming a win.

## Measured CDP first-frame results (CI, first capture)

| Variant | seed 23 | seed 97 |
| --- | ---: | ---: |
| Warmup on: sampled getProgramInfoLog interval | ~623ms | ~561ms |
| Warmup off: sampled getProgramInfoLog interval | ~1213ms | ~1175ms |
| Warmup on: sampled frame wall (with profiler overhead) | ~1504ms | ~1477ms |
| Warmup off: sampled frame wall (with profiler overhead) | ~1975ms | ~1981ms |

The `getProgramInfoLog` top leaf dominates all four sampled frames. This
is a Chromium software WebGL information-log read on the program-preparation
stack, **not** a mere scene graph traversal. The historical E6.8 GL hook
list missed `getProgramInfoLog` and `getShaderInfoLog`; E6.9 adds those
methods (plus `getExtension`) to opt-in GL call timing and reports their
wall time independently. This second A/B should confirm the cost without
running a JS CPU profiler simultaneously.

Potential next focused optimization: compile programs ahead of the first draw
with the actual material/light/shadow variant configuration, reducing
first-frame late program links/info-log syncs while preserving shader error
checks. Do not stub or skip `getProgramInfoLog` as a performance shortcut.
