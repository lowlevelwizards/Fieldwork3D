# E6.10 — Prepared first-frame WebGL shader prewarm

## E6.9 result and hypothesis

E6.9's four real Chromium/SwiftShader cold profiles identified WebGL
`getProgramInfoLog` (program completion/info-log sync) as the dominant first
render stall: approximately 599–799 ms with `gpuWarmup=1`, versus
1163–1202 ms with warmup disabled in the follow-up direct GL A/B.

The old `renderer.compileAsync(stage.scene,stage.camera)` ran before the
first stage update. Its scene still lacked the active initial roster
presentation, visibility/fog and full lighting/shadow state. Precompilation
therefore could not guarantee it had encountered the eventual variants.

## New startup sequence

With `gpuWarmup=1` (existing default) and `coldPrewarm=1` (new default):
1. Generate the site, start the session, prepare rigs one at a time and fit UI.
2. Apply the **exact initial tactical 3D presentation state**, including
   operator pose, fog-disclosure visuals, camera, lighting and shadow refresh,
   with the renderer draw explicitly deferred.
3. Await the existing `compileAsync` against that now-prepared scene.
4. Draw the *same prepared state* exactly once. The first-frame callback
   **does not run `stage.update` again**, so fog/pose/contact pipelines
   and render authorization do not advance twice.

The first visible frame remains behind the existing Quick Play loading mask.
No reduced shadow map, lower fog resolution, material simplification, shader
diagnostic bypass, simulation ticks, or saved game changes.

The `?coldPrewarm=0` flag restores the E6.9 setup for true same-seed A/B.
The separate `?gpuWarmup=0` disables the whole warmup (and preflight)
and still leaves the single unprepared first draw as before.
The flags are parsed in canonical immutable A2 boot config; no alternate
URL parser.

## Guardrails and evidence

- A new site clears any prepared camera state.
- A prepared scene only defers the draw for the normal tactical camera with
  no bodycam owner mesh mask; all other views keep their existing draw path.
- The scene stores a camera and session time solely until the first draw,
  then clears it, restoring the normal render-frame serial and bodycam QA
  readout once on the actual draw.
- The opt-in `?gpuTrace=1` E6.8 tracer now has a separate `preflight` phase
  so CPU wall timings of preparation, `compileAsync`, and first draw can be
  compared without leaking shader calls into the wrong bucket.
- The E6.10 browser harness runs seed 23/97 at 390x844 with preflight ON/OFF,
  fresh Chromium processes per scenario, and emits raw GL JSON and first
  render canvas screenshots. Verify both timing **and** visual parity.
- All timings are WebGL software-renderer CPU wall time, not iPhone GPU time.
  Both startup total and first-frame duration must be reported; lowering
  first-frame cost while increasing overall load duration is not necessarily
  a user-perceived improvement.
- If this prewarm fails to cut cold driver stalls or produces visual change,
  keep the feature branch, narrow/disable the strategy, and investigate
  shadow-depth program variants instead of claiming a successful optimization.
