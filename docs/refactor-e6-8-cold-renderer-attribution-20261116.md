# E6.8 — cold renderer creation, shader/program compilation and first draw attribution

**Base:** merged E6.7 main `243efa70c03473f9e8b43f88b2bc6cd2cccefd69`.
**Branch:** `refactor/e6-8-cold-renderer-program-attribution-20261116`.
**Nature:** diagnostic attribution and repeatable evidence, **not** an unmeasured renderer optimization.

## Measured motivation
E6.6 Chromium/ANGLE SwiftShader seed 23 and 97 captures show scene renderer submission of 3262.8ms and 2826.7ms on the cold callback, considerably larger than 986.3ms and 900.9ms total actor phases respectively. E6.7 only removes a redundant, discarded rig geometry allocation. These captures do **not** isolate shader compilation, GPU execution or Safari device costs.

## Exact instrumentation
- Independent `performance.now()` wall time around the actual `new THREE.WebGLRenderer` constructor (before the hooks can exist).
- Only with `?gpuTrace=1`, wrap ordinary existing WebGL API calls to count *CPU wall time while the call is executing* and counts for shader/program creation/source/compile/link/status checks/use, buffer data uploads, texture alloc/upload/mipmap, framebuffer creation, and draw submissions. Existing return values, arguments and `this` receiver are preserved. Failed/unavailable hooks are disclosed; no extra GL state interrogation, `finish`, `readPixels` or shader-source recording.
- Measure the **already existing** `compileAsync(scene,camera)` stage separately (enabled unless `?gpuWarmup=0`) and the existing first Quick Play render. Report asynchronous warmup total wall time separately from the sum of synchronous WebGL API call wall times; no claim that they measure the same thing.
- Three.js renderer program, geometry and texture counts before/after each captured phase. Counts are not memory-bytes or per-program GPU times.
- After first-frame capture, restore every overridden WebGL function. One cold scene only; repeated Quick Play reloads need a fresh page for fair A/B. Normal gameplay uses **zero GL wrappers** and keeps existing shaders, shadows, exposure, fog, operator visual quality, silhouette, first-contact and replay policies.
- Local console object `[E6.8 cold renderer]` and in-memory `window.__fieldworkE68` only under `gpuTrace=1`; no telemetry upload or persistent storage.

## Reproducibility and limits
The new script `scripts/verification/e6-8-cold-renderer-browser.mjs` runs four distinct fresh-page 390×844 Chromium/ANGLE SwiftShader Quick Play scenes: seeds 23/97, GPU warmup on/off. Save exact per-run JSON and an A/B summary as workflow artifacts. Do not gate arbitrary timing thresholds: software rasterization, browser cache and machine scheduling are confounders. Verify no shader errors, warmup-on/off phase presence, GL hook coverage, and complete render capture. The old E6.6 PERF encounter and R7 warmup fallback remain protected by critical regression tests.

## Decision gate before optimization
Look at `compileShader`, `linkProgram`, `getProgramParameter` and Three.js `programs` changes. Compare those with first-draw `bufferData`, `texImage2D` and draw counts, plus unaccounted renderer-submit wall time. If compile/link dominates, audit actual program variants and compile targets without altering approved lighting; if buffer/texture work dominates, review cold upload resources and shadow atlas; if neither dominates, investigate Three.js object traversal and SwiftShader behavior with a browser performance trace. Re-test on mobile Safari before asserting iPhone improvement.

**Release:** commit on feature branch; CI and browser evidence before PR-ready. No merge/deploy during an unresolved previous Pages release.
