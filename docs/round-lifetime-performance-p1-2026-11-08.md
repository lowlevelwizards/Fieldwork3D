# Fieldwork Breach — long-round performance P1 (2026-11-08)

## Symptom and limits of evidence

Player reports marked degradation **with elapsed mission duration**, rather
than just instantaneous combat/geometry spikes. Previous P1–P7 sweeps
optimized many per-tick costs but did not demonstrate stable 5–10 minute
resident memory or iOS/WebKit frame cadence. Source inspection identifies
substantial live in-memory replay history growth; this is a credible mechanism
for GC stalls, **not yet a measured root cause on the user's device**.

Never confuse Node timing / Chrome heap with actual iPhone FPS, and do not
attribute the regression to a feature from correlation alone.

## Source audit

- **Recorder:** Live `MissionRecorder.capture` is called every 60Hz tick;
  full outcome frames are retained near 20Hz up to 12,000 samples, with
  motion, ballistics, plan, personal FOW and observation journals retained as
  evidence. History is intentionally persistent and must not be discarded to
  improve FPS.
- **Heap retention:** Each moving actor's full replay frame previously
  duplicated stable deep state (medical, equipment config, spare mags,
  skills, authored plan) even though whole-actor sharing could not trigger
  when pose changed. P1 now shares equal immutable subtrees between frames
  with complete independent keyframes every 40 samples.
- **Live presentation:** The tactical renderer asked for
  `ReplayMotionRecorder.presentation` on every RAF, which also sought across
  every historic door-change stream. Live 3D only consumes feet, travel yaw,
  pelvis yaw and acceleration; door histories remain available for actual
  replay.
- **Diagnostics blind spot:** `?perf=1` labeled the entire pre-render
  interval `SIM`; the recorder cost was not separately identified. P1 now
  shows `SIM+REC`, measured `REC`, film frames and step events.
- **Existing bounds:** Live casings, decals, dropped magazines, transient
  combat sounds and execution buffers have caps; do not arbitrarily shrink
  forensic replay, discovered history or pose fidelity.

## P1 code changes

1. Bypass historical door seeking **only** for live render-motion sampling,
   keeping replay `presentation` behavior unchanged by default.
2. Share identical immutable actor subfields in 20Hz replay samples even
   when a moving actor requires a distinct pose frame; preserve every
   40th frame as a fully independent keyframe and compare values, never
   assume the live actor's object identity implies unchanged state.
3. Separate recorder timing in opt-in diagnostics (recording is a subset
   of `SIM+REC`, not an extra phase to sum), with current history size.
4. Add `npm run bench:round-lifetime -- --seconds=180` as a **manual**
   60Hz long-session capture/retained-heap probe. Optional
   `node --expose-gc --experimental-strip-types
   scripts/bench-breach-round-lifetime.mjs --seconds=180` uses GC
   outside timed capture windows. This measures recorder scaling, not AI
   simulation or graphics. Existing `bench-breach-performance.mjs`
   covers short CPU simulation and combat.

## Focused regression gates

- TypeScript check and production bundle, replay frame sharing, film
  interpolation / motion, replay restoration, pause-state motion,
  and FrameMeter diagnostics.
- Full actor pose values and historical door interpolation stay identical
  whether or not live sampling omits door records.
- Authored orders changed in-place and equipment states must never rewrite
  prior frame data. No leaking future visibility, hit information, AI
  changes, footstep events or door states through sharing.

## Same-device before/after acceptance — required before release

Use the same map seed, team, controls, camera, fidelity and device. Record
metrics at 0:30, 2:00, 4:00 and 6:00 (or round end), both paused and while
moving with repeated door opens and combat. Compare `?perf=1` and
`?perf=1&quality=performance`.

Capture: JS P50/P95/MAX, RAF gap P95, REC and SIM+REC, SCENE,
WebGL draw calls/triangles, frame count, and observed stutters. In Safari's
developer tools, compare JS heap/GC and GPU memory if available; the opt-in
overlay cannot directly measure GPU wall time. If REC climbs but the
render/scene timing stays flat, investigate replay memory retention. If
SCENE/RAF climbs independently, profile render resources and postprocessing.
If SIM+REC climbs with stable REC, profile AI navigation and visibility
throughout an extended active round.

## Pending

No physical iPhone soak or comparable before/after device measurements
are available in this agent session. Do not call the regression solved
or claim an FPS improvement solely because the code/CI passes.
Do not merge into a queued/failed Pages deployment; check required CI
and the active release queue first. The separate replay R3 archival
work remains draft and is **not** a license to raise the production cap.
