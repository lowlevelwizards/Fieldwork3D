# E6.6 — real-encounter browser and portable device performance capture

**Base:** deployed main `5d7b80cdecfad7d1ce06521b20160ec4caeb588e`.
**Branch:** `refactor/e6-6-live-encounter-capture-20261116`.

## Audited limitation

The previous E6.4–E6.5 instrumentation records pose/key/ally and Canvas2D composition CPU, fog dirty requests and renderer-confirmed upload submissions. The existing 60-second timeline stores the **worst RAF callback in each 250 ms bucket** and retains prior-callback work separately. However, the download did not include E6 pose prep and fog upload fields, and there was no repeatable whole-scene Chromium evidence for planning and active execution. Prior E6.5 synthetic Node microbench has mixed CPU timing; do not infer mobile FPS.

## Implemented

- **In-game local JSON export:** Add one opt-in `JSON` button to the existing 60-second PERF HUD. The file includes metadata (seed/phase/view), 250ms peak buckets, per-mode callback counts, RAF+JS, prior-frame actor pose (prepare/solve, appearance fingerprint and rebuild count, ally context/visits), current Canvas2D fog composition and cumulative WebGL upload submissions. It is manually downloaded by the player, not sent to any server or persistent storage. Existing TXT/Copy and graph remain intact.
- **Exact attribution semantics:** Fields with absent BASIC/LIGHT instrumentation remain absent/empty, never misleading zeros. Prior-frame CPU stays bound to the RAF gap that follows it; current-callback fog/texture observations do not claim to be the cause of the **preceding** RAF. A texture `onUpdate` callback confirms only submission by Three.js, **not GPU completion or duration**.
- **Repeatable actual browser scene:** In the existing mobile WebGL workflow, run two seeded Quick Play worlds (23 and 97) at a 390×844 mobile-emulated viewport. Render the full real 3D WebGL scene in Chromium/ANGLE SwiftShader; observe both planning and actual executing modes after pressing GO. Download structured JSON for each stage, assert presence of scene and prior-pose attribution and at least two callbacks per mode. Preserve artifacts and a summary. **No scripted contact is guaranteed by merely pressing GO** and this is not iOS Safari GPU/thermal evidence.
- **Guarded evidence:** Unit tests verify bounded 60-second history; mode and sample ownership; truthful missing data; backwards-compatible append-only CSV; and no new simulation, LOS, fog, or animation pipeline. Browser tests gate rendering/export functionality, not CPU/frame-time thresholds.

## How to compare on an actual device

Open the same Quick Play seed, view, quality, operator kit and zoom on each build. Tap **PERF** or use `?perf=1`. Capture ~20 seconds of planning, press GO, then capture a comparable period of execution and first contact if one occurs. Use **JSON** in the PERF HUD to download the local 60-second rolling record. Compare `modeCounts`, RAF peak distribution, prior callback CPU (scene actor, pose prep/key/solver, ally), fog Canvas2D CPU and WebGL upload submission counts. For first contact, correlate with a separately observed encounter moment, **not inferred solely from a draw-count spike**. The capture contains 250ms peaks, so it cannot establish all-frame P95; normal browser GPU traces are required to attribute GPU time, and mobile Safari recordings are required for iPhone FPS/thermal outcomes.

## Release gates

E6.6 unit test; existing critical simulation, fog, animation, replay and D2 exact-world parity; production typecheck/build; real browser scene with no shader errors; success+public exact SHA for previous Pages run before merging; post-merge Pages exact-public-SHA verification. Do not merge or queue another Pages release while a prior run is unresolved.
