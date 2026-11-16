# E5.4 — sustained replay memory and archive-replacement acceptance

## Baseline and goal
E5.0–2 reduced temporary capture clones and stopped post-cap journal writes. E5.3 added real Chromium post-GC heap, DOM and listener observations and found **no accumulating DOM/listeners across a six-cycle 12-second saved film**. Browser heap samples varied across CI runs; those deltas were never claimed to prove or rule out a memory leak.

E5.4 tests a more realistic **60-second**, **1,201 frame**, **800 battle-event** recording, with small in-place recorded actor motion, repeated seeks/filtering, and **six saved-film enter/exit cycles**. Before each entry, it overwrites the **same IndexedDB key** with an alternating A/B historical event version. Playback must use the just-saved version, not a stale prior recorder or index. The library must continue to expose only one saved entry. Two cycles warm the runtime, then four measured post-GC cycles check the same cleanup boundaries as E5.3. This specifically catches accidentally retained prior archive/event references.

## Work delivered
- **E5.4A** `scripts/verification/refactor-e5-sustained-contract.mjs` verifies workload size, A/B archive replacement identity, unchanged live clock, bounded post-GC DOM and listener counts, empty event feed after exit, one-library-entry invariant and complete replay panel dismissal. It deliberately has **no heap-bytes pass/fail threshold**.
- **E5.4B** `scripts/smoke-refactor-e5-4-sustained-memory.mjs` captures the film using the real `MissionRecorder`, saves through `captureReplayArchive`/`saveReplayArchive`, reloads the browser to release the capture fixture, and uses normal Replay Library Watch and Exit controls. Each cycle overwrites the same saved recording's recorded door/intel event labels and verifies the A/B revision is visible in the bounded 80-row Events panel. CDP `HeapProfiler.collectGarbage`, `Runtime.getHeapUsage`, `Memory.getDOMCounters` sample before/after exit. Results write `artifacts/refactor-e5-4/sustained-memory.json`.
- **E5.4C** `tests/refactor-e5-4-sustained-memory.test.mjs` runs 481-frame deterministic before/after capture allocation parity; injects stale-version, invalid workload, unauthorized live-clock changes, leaked Events buttons, runaway DOM nodes and listener growth, and verifies heap readings remain informational.
- **E5.4D** extends the existing E5 Chromium memory workflow with E5.4, preserving E5.3 as a faster independently relevant baseline. The workflow retains both reports as Actions artifacts.
- **E5.4E** includes the E5.4 deterministic acceptance tests in the actual architecture critical suite.

## Evidence and limits
The file is a **real Chrome/IndexedDB/WebGL lifecycle acceptance**, but its combat-like events are fixture-authored into the authoritative battle event journal; it does **not** simulate 60 seconds of active AI combat or physical door interactions. Do not use it to claim measured tactical FPS or GC pause durations.

Chrome is headless on Linux with a 390×844 emulated phone viewport and software WebGL. This is not iPhone Safari or device hardware. Post-GC JavaScript heap, per-cycle deltas and timing vary with JIT, V8 code cache and garbage collection. A brief heap rise alone is not evidence of retained objects. Concrete pass/fail contracts are historical revision parity, no former-recording display, one-library-entry metadata, no changes to the live mission clock and bounded DOM/listener counts.

If a repeatable leak is demonstrated, isolate its owning controller, write a regression that reproduces it, and repair that path only. Otherwise ship the measurement gate and move to device-profiled renderer/fog/pose work; do not invent a runtime optimization.

## Release checkpoint
Commit to `refactor/e5-4-sustained-archive-memory-20261116`. Require new Chrome acceptance, architecture critical, affected-domain integration and TypeScript build green. If another branch advances `main`, verify compatibility. Do not merge while Pages is queued/running. Verify the last Pages deployment serves the expected build before merging, then verify the new public SHA after deployment.
