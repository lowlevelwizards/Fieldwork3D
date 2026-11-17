# E6.15 — Real executing scene CPU phase attribution

## Why this stage

E6.14 profiled the first 90 **actual executing** Quick Play callbacks in
fresh Chromium/ANGLE SwiftShader processes. In its 2-seed briefingIdle
ON/OFF experiment, the callback p95 was 93–120ms, simulation p95
19–29ms, scene p95 54–69ms. Worst RAF gaps were explained by the
**preceding callback**; 3D scenes dominated large synchronous stalls.
These are **not** hardware GPU time or iPhone Safari FPS claims.

E6.15 does not yet optimize the scene. It resolves which *existing*
scene phase causes the synchronous CPU/driver wall time before we
risk changing animation, fog, shadows, or render quality.

## Measured phases and instrumentation

The TacticalScene3D renderer already exposes a high-resolution opt-in
P1.5 CPU phase profiler and per-operator animation timing. E6.15 turns
that **existing profiler** on for the canonical `?coldBench=1` local
diagnostic, never for normal production play. It reads and shallow-copies
the measurements from the real tactical frame (not a separate render).

Within E6.14's first 90 actual executing RAF callbacks, new
`liveExecutionRuntime.sceneAttribution` includes:
- P95 and worst of the nine stages: environment, camera, disclosure,
  actors, effects, fog, shadows, postCamera and gpuSubmit.
- Actor pose, pose preparation, wardrobe/appearance and ally-neighbor
  context p95; actual pose counters already exist in the renderer.
- Fog canvas composition p95 and cumulative texture-upload deltas.
- Shadow refresh-count deltas within the 90-frame window, plus renderer
  draw-call p95.
- For worst RAF intervals, the largest scene phase from the **preceding**
  callback, maintaining the previous-frame-causality contract.

**Interpretation rules:** scene phases are CPU/driver wall time,
not true GPU execution time. The `shadows` phase calculates whether a
shadow update is needed; actual shadow-map rendering may occur during
`gpuSubmit`. Browser `getProgramInfoLog`, uniforms, textures, materials,
GL submission and driver synchronization can contribute to
`gpuSubmit`. Fog CPU composition is distinct from its GPU texture
submission. Actor pose stage may include rig/appearance rebuilds.

## Guards

- E6.15 changes no game, AI, simulation, camera, visual materials,
  operator anatomy, fog masks, 512px live shadow resolution, shader
  behavior, or WebGL draw order.
- Default performance path stays uninstru-mented unless `?perf=1` or
  `?coldBench=1` is explicitly provided.
- The existing bounded 90-frame capture retains at most eight worst
  RAF gaps and phase summaries; no automatic telemetry upload.
- No GPU `finish()`, `readPixels()`, explicit sync, network calls,
  additional RAF loop or extra 3D submission is introduced.
- Local JSON output preserves E6.11–E6.14 previous evidence fields.

## Test and release checkpoint

A dedicated real Chromium/SwiftShader browser workflow generates
seeds 23 and 97 with briefingIdle ON/OFF in four fresh browser
processes. The browser uses actual Quick Play creation, dismisses
the briefing, clicks Play, and captures 90 genuine live 3D
submissions and simulation callbacks. It asserts nine phase fields
and the preceding-frame spike attribution exist. No fixed
software-renderer speed target is imposed, as machine/driver jitter
can vary.

Complete the focused Node tests, `npm run build`, existing critical
regressions and full required D3 physical recovery. Do not merge
before the prior production Pages deployment has succeeded and
is serving the expected exact SHA. After release, verify the new
public Pages SHA before declaring production complete.

## Next decision

Prioritize whichever subphase dominates **repeatable** live
CPU wall samples. Possible E6.16 work:
- `actors`: inspect pose dirty state, appearance rebuilds, and
  ally-neighbor context without changing the silhouettes.
- `fog`: investigate redundant CPU composition and uploads
  without changing limited operator-cone visibility.
- `gpuSubmit`: inspect GL program/texture/shadow submission
  and shader variants while protecting existing 3-band light
  materials and all current shadowing.
- `simulation`: investigate only if live simulation
  dominates matched samples; no tick skipping or authority drift.

Actual iPhone Safari measurements require running the local opt-in
capture on that device and reviewing its exported JSON separately.
