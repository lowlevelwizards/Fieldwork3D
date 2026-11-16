# E6.12 — Post-ready RAF gap attribution

## Evidence problem

E6.11 independently sampled 90 requestAnimationFrame intervals immediately
after Quick Play READY. Chromium ANGLE/SwiftShader saw p95 intervals of
317–417 ms and worst 2.0–2.35s. This is **not yet evidence that an active
tactical game frame took 300 ms**: the startup returns to planning/briefing,
and the separate RAF sampler has no link to runtime work, frame mode,
3D submissions, or callback CPU durations.

The runtime's coarse sampler already records UI, fixed-step simulation,
recording, 3D sync, canvas overlays and diagnostics. E6.12 wires one
additional **bounded opt-in reader** to those existing measurements instead
of inventing an extra render or simulation frame.

## Implementation

Only when the existing `?coldBench=1` is set:
- Capture **90 actual tactical runtime callbacks** after Quick Play READY,
  alongside E6.11's independent 90 RAF timestamps.
- Measure actual callback wall duration, simulation/recording, UI, 3D
  scene synchronization, canvas, post-processing and diagnostics; mark
  whether the runtime submitted a 3D frame.
- Distinguish **idle/planning**, live, replay and suspended modes.
  An idle scene behind the briefing must never be reported as combat FPS.
- Correlate a long RAF interval ending at callback N with **N-1's**
  JavaScript callback wall duration, not N's later work. Classify
  `prior-callback`, `between-callbacks` (cause not proven) or mixed.
- Keep only the eight worst intervals and aggregate mode counts/median/
  p95/worst; never an unbounded telemetry stream.
- A new Quick Play start invalidates an earlier capture. Hidden tabs
  produce `interrupted:true` rather than pretending normal cadence.
- Append `postReadyRuntime` to the existing local **SAVE COLD BENCH**
  JSON, preserving the E6.11 schema for compatibility. No cloud upload.

No change to update cadence, mission state, world rendering quality, fog,
animations, shaders, shadow quality or simulation. Ordinary `coldBench=0`
execution only evaluates the loop guard. No extra RAF request or WebGL
synchronization is introduced.

## Acceptance

- Focused unit tests enforce **previous callback attribution**, bounded
  memory, correct idle/live counts, hidden-tab handling and no additional
  render/tick.
- Typecheck and bundle.
- Four actual fresh Chromium/SwiftShader Quick Play runs (seeds 23/97,
  prepared prewarm on/off) must download full evidence including two
  independent 90-frame samples, with no page error.
- Preserve project architecture, tactical runtime and D3 regressions.
- GitHub Pages deploy only after prior Pages SHA is healthy and critical
  checks pass.

## Interpreting measured samples

The residual `gap - previousCallbackMs` includes scheduler cadence,
background browser tasks, compositor and potentially driver waits.
**It is not GPU execution time**, nor proof that the game is idle.
Also, `callbackMs` is wall time and includes any synchronous WebGL driver
blocking; it is not pure CPU utilization.

If most worst gaps are `prior-callback` with large `precedingSceneMs`,
investigate the scene and GL pipeline next. If they are large while prior
JS work is small, investigate browser/scheduling and the visibility of
the startup briefing; do not lower shadows or animations based on it.
Separate real iPhone Safari captures are needed before claiming an
iPhone hardware performance improvement or regression.
