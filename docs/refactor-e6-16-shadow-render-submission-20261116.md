# E6.16 — Real live shadow-map submission versus other 3D rendering

E6.15's four genuine 90-frame Chromium SwiftShader samples measured
scene gpuSubmit p95 28.8–44.1ms. The previous "shadows" scene CPU
phase merely decides refresh flags; it does NOT measure shadow raster
or WebGL submission. Running-session shadow refresh every rendered frame
is intentional: slowing updates would create stale moving-actor shadows.

## Diagnostic change
Only explicit `?coldBench=1` installs an observation-only wrapper on
the existing tactical renderer WebGLShadowMap.render method. It preserves
receiver, arguments, return values, errors, and the original draw count.
The normal production and `?perf=1` paths install no wrapper.

Each *actual* 3D submission (including the prepared first-frame path)
is split into synchronous shadow-map render wall time and other render
wall time. Counts are obtained by the existing renderer.info draw
counter, including reliability checks against counter resets.
No extra frames, shaders, readPixels, GPU fences, queries, or
additional render submissions. No visual, fog, operator, simulation,
lighting, shadow resolution (512px live), camera or material changes.

The original bounded 90 real live frames retain E6.15 phase data,
with new `sceneAttribution.renderSubmission` shadow/other p95/worst,
per-pass draw p95, shadow-map method calls, shadow-draw frame count,
and reliability count. The worst RAF gaps annotate the *preceding*
callback's shadow/other wall time.

**Interpretation:** All wall times include JavaScript and possible
synchronous browser/driver stalls; they are NOT GPU timestamp duration.
Other time can include the main scene and opt-in postprocessing. Draw
calls are submitted draws, not GPU completion. If Three internals hide
the hook, report missing evidence rather than false zeros.

## Evidence and release
Focused Node regression and production typecheck/Vite build plus
four fresh real Chromium/SwiftShader Quick Play samples, seed 23/97
with E6.13 briefing hold ON/OFF, 90 live actual callbacks each.
No arbitrary software-renderer timing threshold. Separate same-device
iPhone/Safari comparison required before a mobile FPS claim.

If shadow dominates, evaluate shadow-caster geometry/draw budget
without disabling live refresh. If nonshadow dominates, investigate
main-pass material and draw submission overhead next. Keep on feature
branch until critical tests pass, prior Pages deployed SHA is verified,
and release queue is clear; after merge verify deployed new SHA.
