# Performance P3 — codebase optimization audit (2026-11-19)

**Scope:** Fieldwork3D Breach, Quick Play, Campaign Outfitter, Operator Studio and both Arsenal categories. Source review of current main `0bbc7d1` and retained P1/P2/E5/E6/R7 evidence. This document distinguishes source-level suspects from measured cost; it is not a new device benchmark.

## Existing evidence and guardrails

- [P1.7](performance-p1-7-raf-alignment.md): actual iPhone live-session RAF peaks of 326/282/277/249/233 ms in the 60-second diagnostic; an idle tail was 17 ms RAF p50/p95 with **no fixed simulation ticks**. The preceding callback's JS, not the current callback's JS, must be compared to a RAF gap. This evidence does **not** prove a GPU root cause.
- [E6.8](refactor-e6-8-cold-renderer-attribution-20261116.md): separate Chromium/ANGLE SwiftShader cold scene renderer submissions of 3262.8/2826.7 ms, larger than the same samples' actor phases. Software rendering is **not** Safari hardware data and the submit wall time is **not** isolated GPU execution.
- [E6.12](refactor-e6-12-post-ready-attribution-20261116.md): bounded real-runtime READY measurements distinguish live, idle, replay and suspended; a standalone RAF sampler behind a briefing is not game FPS.
- Existing optimizations should remain: `breach-runtime-loop.ts` fixed-step authority and idle 3D gating, lazy hidden hostile rig prewarm, procedural asset reuse, 512 shadow budget, partial shadow/fog reuse, operator appearance async readback, one weapon gallery renderer, separate UI/scene and simulation profiling.
- Preserve authored plan orders, movement arbitration, combat/AI/LOS, replay, headgear/weapon silhouettes, exact inventory/state, lighting and accessibility. Do not optimize by changing gameplay semantics or dropping visual features.

## Ranked work, highest expected impact first

| Priority | Area | Source-level opportunity and evidence | Approach and verification |
| --- | --- | --- | --- |
| **P0** | First Quick Play 3D entry | `src/breach-3d.ts` renderer and first render, `rendering/breach-site-scene-builder.ts`, rig creation, first shader/texture upload. Prior E6 SwiftShader evidence makes this a measurable cold-stage target, not a proven iOS cause. | Compare E6.8/9/12/14/17 traces, first-draw program count, GL upload counts, actual actor phase and main-pass wall time. Only consolidate program variants, geometry uploads or reveal budgets when measured and parity-screened. |
| **P0** | Live frame spikes in crowded scenes | `breach-runtime-loop.ts`, `breach-simulation-motion-phase.ts`, motor/civilian response, scene present and sight/fog updates. Existing P2 fast paths eliminate some scans already. | Use per-mode P1.7 timeline and simulation-phase samples for the same seed, camera and scripted actions; identify **preceding** long callbacks. Profile active contacts, 4-man door crossings and civilians. Never infer GPU cost solely from RAF gaps. |
| **P1** | Loadout/Outfitter initial hitch | `equipment-preview.ts` generates real 3D item pictures by changing full rig pose, rendering to a GPU target, synchronously reading pixels and PNG encoding. `campaign-outfitter-gallery.ts` limits work to intersecting tiles and one per frame but individual tiles can still block a frame. | **Stage P3.A:** pool target/readback canvas, skip invisible hotspot scans. Next test asynchronous WebGL readback where supported, bounded image encoding/deferred idle work, cache invalidation by equipment signature and one rig pose update per operator switch. Preserve true 3D thumbnails and the real white selection dot. |
| **P1** | Arsenal gallery response | `arsenal/gallery-main.ts` queues one synchronous procedural card per RAF; detached filter cards and rapid hero selection can leave obsolete work pending. `arsenal/thumbnailer.ts` rebuilds actual mesh geometry on cache misses. | **Stage P3.A:** cancel orphaned/superseded work and prioritize hero. Next compare existing E6.26 geometry pool/part batch flags with measured actual production draw calls and geometry lifetime before promotion. |
| **P1** | Secondary Arsenal orbit | `arsenal/glock-viewport.ts` previously rendered and called `renderer.setSize` on every pointermove, even unchanged canvas sizes. | **Stage P3.A:** RAF coalescing and dimension guards; confirm mouse/touch and first render after navigation. |
| **P2** | Operator Studio navigation | `operator-studio.ts`, `operator-appearance-grid.ts`. Shared thumbnail target, asynchronous readback and card reuse already exist; still potential costly large catalog reconciliation, wardrobe rebuilds and idle pose sync. | Measure open/category/change/exit with 4 operators; instrument mesh rebuild counts, card churn, cache hit rate and contexts. Reuse exact sources of authority, avoid speculative changes to wardrobe. |
| **P2** | Long-session memory/teardown | Scene, outfitter, workbench and after-action WebGL resources are opened/closed repeatedly. Read E5 memory contracts and R7 resource lifecycle tests. | 30-cycle Quick Play/loadout/arsenal/replay soak, sample geometries, textures, programs, detached canvases, event listeners and heap. Compare baseline after GC and avoid forcing context loss while a shared renderer is still owned. |
| **P2** | Bundle/startup dependencies | Multiple entrypoints and very large editor/geometry modules, yet Vite split chunks and lazy dependencies may already be adequate. | Analyze actual Vite bundle sizes and unused chunks; defer editor-only imports and CSS if browser import waterfall shows a win. Do not confuse source line count with runtime cost. |

## Completed in branch P3.A (unmeasured until benchmark)

1. `equipment-preview.ts`: compact preview skips full-body and wardrobe hotspot bounds on each idle/pointer frame because compact layout intentionally hides those buttons; still raycasts the real selected dot.
2. `equipment-preview.ts`: reuse one offscreen GPU render target, one pixel byte buffer and one 2D encoding canvas across gear captures; resize when necessary, restore prior live target in `finally`, release with owning preview. Maintain original real mesh capture and pixel conversion.
3. `arsenal/gallery-main.ts`: deduplicate same-host queued jobs, guard against superseded hero selections, remove detached filter-card work, prioritize hero model.
4. `arsenal/glock-viewport.ts`: combine dense pointer/resize requests into one RAF and resize underlying WebGL buffer only on actual dimension changes; cancel work on dispose.

These changes reduce redundant work or resource churn by construction, but **no latency, FPS or memory improvement is claimed without a measured comparison**.

## P3.B instrumentation + acceptance

- **Three flows / both viewport classes:** 390×844 phone (real iPhone Safari when possible) and desktop; cold/warm Quick Play Loadout, switch each of 4 operators, step through primary/rig/head/utility then return. Repeat Arsenal primary/secondary, rapid category filters and drag orbit.
- **Measure:** click-to-visible initial GL image p50/p95/worst, operator switch p50/p95, thumbnail capture CPU duration/queued count, total full rig reposes, RAF >=33/67ms, hidden/detached job counts, GPU resource counts and memory after 10/30 opens. Keep readback vs rendering vs PNG time separate.
- **Live mission:** seeds 23 and 97, 4 operators, 20–30s live execution then idle with same camera/quality, plus 4-person door and civilian crowd scenes; compare previous-callback JS vs RAF wait, 3D sync/render submissions, simulation fixed ticks and phase costs. No arbitrary FPS claim from paused frames.
- **Pass:** unchanged deterministic session/replay, kit and serialized loadout, 3D thumbnails visually equivalent, no missing first model frame, zero runtime exceptions, pointer orbit and mobile dot functional, no retained stale DOM WebGL contexts. Branch critical tests + TypeScript and Vite build must pass. Before any release, confirm prior Pages job complete; compare public build stamp after deployment.

## Subsequent release batches

- **P3.B — evidence first:** browser capture for loadout/arsenal + existing E6 and P1.7 test probes, then optimize dominant verified slice (likely image readback/pose or cold shader/scene).
- **P3.C — live runtime:** target measured spikes in simulation/rendering rather than generic slowdown or quality reductions; maintain physical scenario integrity tests.
- **P3.D — sustained resources:** 30-cycle memory/canvas/asset soak and cache lifecycle fixes; recheck replay/after-action and iOS Safari WebGL pressure.
- **P3.E — release/compare:** critical deterministic and visual screens; compare baseline and branch with identical scenario, bundle sizes and device settings. Merge one compatible batch at a checked release checkpoint.
