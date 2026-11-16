# E5.3 — browser replay heap and lifecycle acceptance

## Goal and audited baseline
E5.0–2 reduced clone pressure and stopped post-cap journals. Remaining unknowns:
- Does opening/closing a saved replay repeatedly retain its former event feed, renderer DOM or historical controller state?
- Does post-GC JavaScript heap trend upward across equivalent warmed replay cycles?
- Does the legacy 12,000-frame cap leave the live session and archive truthful?

Existing owner audit found cleanup on replay exit: `ReplayCameraController.reset()` releases Director storyboard and plan index, `ReplayKnowledgeController.reset()` clears personal sight and ground caches, the movement-history ref is nulled, and `ReplayAnalysisController.reset()` clears its event-filter and 80-item button viewport. No confirmed leak was found from source inspection alone.

## Implementation: first measure, then change
- `scripts/smoke-refactor-e5-3-replay-memory.mjs` launches a real Chromium browser with software WebGL in the project's 390×844 mobile viewport; it is **not** physical iOS Safari.
- Generates a legitimate 241-frame, approximately 12-second recorder via the production `MissionRecorder`, saves it through the existing versioned replay/IndexedDB archive path, then reloads the page so the fixture itself cannot contaminate the measurement.
- Opens the saved replay through the existing library UI, seeks between five times and switches event filters, asserts a nonempty bounded 80-item Events viewport, then exits to the library. Repeats six cycles (two warmup, four measured).
- `HeapProfiler.collectGarbage`, `Runtime.getHeapUsage`, and `Memory.getDOMCounters` capture heap used, DOM node and JavaScript event-listener counts on a fully exited, post-GC page and during replay. Detached-node counts are not exposed by this Chrome CDP command and are not claimed.
- Release invariants: replay panel closed, replay event buttons removed, live clock unchanged, Events viewport no more than 80, no runtime page exceptions, DOM growth no more than 140 nodes and listener growth no more than 120 across four equivalent post-warmup exits.
- Deliberately **no hard JS heap byte/GC timing limit**: one CDP heap sample cannot prove leakage, and V8 code caching/JIT, GC and software-WebGL driver behavior vary by runner. Report raw heap and DOM series, warmup, GC method, firmware/browser context and caveats; a reliable performance claim requires repeated same-device, same-seed experiments.

## CI
`.github/workflows/refactor-e5-browser-memory.yml` runs a distinct browser gate for E5 refactor PRs, alongside authoritative architecture and production build. `tests/refactor-e5-3-browser-memory-contract.test.mjs` explicitly proves that stable post-GC DOM passes, retained feed/visible panel fails, and monotonic live-node/listener accumulation is caught. Results upload as `artifacts/refactor-e5-3/replay-memory.json`.

## Release discipline and interpretation
This stage is instrumentation and verification **unless a measured failure justifies a scoped runtime fix**. Do not delete evidence, change replay frames, or introduce a second memory owner just to create a performance commit. If Chrome shows a leak, identify owner and add a failing reproducer before fixing. Verify main's previous Pages SHA and all required tests before merging, then verify the new served SHA. The next E5 step uses the report to choose a specific high-allocation replay or tactical scene hot path, with explicit same-device confirmation before claiming mobile gains.
