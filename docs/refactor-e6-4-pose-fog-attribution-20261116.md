# E6.4 — dynamic-pose and fog-upload attribution checkpoint

**Base:** deployed E6.2–E6.3 main `22767c938eb8873775ac91fb527b09faa84a9e21`
**Branch:** `refactor/e6-4-pose-fog-attribution-20261116`

## Source audit and decision

E6.2–E6.3 reduced pose preparation peer-distance math and eliminated transient arrays while retaining complete visibility/pose behavior. The scene already exposes `actorPhaseCosts.poseMs`, `posePrepMs`, `fogComposeMs` and fog CanvasTexture dirty requests. None of these values alone identify a dominant **real-device** hitch. In particular, the 750ms UI previously displayed **a single frame** of CPU costs, so an expensive repaint could disappear from the display before sampling; `needsUpdate=true` is a request, not proof of a later actual WebGL upload.

A per-visible-operator `updateOperatorAppearance` call also serializes a JSON snapshot each pose to detect **in-place** Studio and customization edits. Blind memoization by equipment/wardrobe identity would miss those edits; not safe to optimize that work yet.

## E6.4 scope completed on the feature branch

1. **Appearance attribution (E6.4a/b).** Opt-in pose profiling measures JSON fingerprint serialization independently from appearance/kit rebuild; counts actual fingerprint changes. Carry, wardrobe, magazine configuration, in-place edits, downed/surrender tint and replay ownership remain untouched. Pass the numbers through the same existing pose profiler, with no diagnostic report allocation or new timestamp in normal gameplay.
2. **Fog upload submissions (E6.4c).** Bind `CanvasTexture.onUpdate` once on the existing scene-owned fog texture to count **renderer-confirmed upload callbacks**, independently of dirty requests. Estimate RGBA bytes using the exact canvas dimensions at callback; this is not GPU VRAM, measured GPU time, completed DMA transfer, or proof of image pixels that changed. Keep the old dirty counter and texture; no new renderer, partial-update path, canvas, cadence, fog rules, or layer.
3. **Window aggregation (E6.4d).** Accumulate per-updated-3D-frame pose preparation, solver and fingerprint CPU, actual appearance changes, and Canvas2D fog CPU into the existing approx. 750ms PERF reporting interval. Compare cumulative upload submission counts with cumulative dirty request deltas. Reset interval aggregates on session changes and after each sample; do not bill skipped 3D frames for stale work. Preserve renderer-level frame timing and other profiler slices.
4. **Regression protection.** Focused real-appearance test verifies original JSON key byte parity, stable reuse, next-pose in-place customization invalidation, and no profile allocation in ordinary mode. Structural contracts cover one persistent CanvasTexture, renderer submission callback and interval accounting. Existing contact-prewarm, fog/depth/disclosure, animation quality, and replay critical tests remain authoritative.

## Exclusions, measurement labels and next decision

- **No pose throttling**: visible actors continue to animate every scheduled 3D update; first visible enemy still bypasses the E6.1 speculative prewarm quota.
- **No gameplay LOS/FOW change** or reduction in fog texture resolution. Full RGBA size is only an upper-bound estimate per callback (real driver paths vary). Texture `onUpdate` is invoked by Three.js after upload *submission*, not after the GPU finishes; no `EXT_disjoint_timer_query` claims are made.
- **No FPS gain claimed**. Node tests and CI cannot measure browser/WebGL GPU time or iPhone Safari thermal behavior. This stage is instrumentation and careful attribution, not an unmeasured animation rewrite.
- Profile the same seed and view on a real device after deployment. If steady `appearanceFingerprintMs` is material, consider an **explicit versioned appearance mutation contract with in-place-edit golden tests**, not reference-equality memoization. If fog submissions dominate, capture GPU/device traces before considering a partial-update texture or quality changes. If neither dominates, investigate main actor phase/replay/studio in their own owners.

## Integration/release gates

1. New E6.4 test plus previous E6.0–E6.3 and architecture-critical suite pass on **exact PR head**.
2. Production typecheck/build and existing animation/perf suite pass; CI timings not presented as FPS.
3. Previous Pages run success and publicly served SHA confirmed; no active production deployment before merge.
4. PR merged via GitHub; post-merge production Pages workflow and its exact-public-SHA check both finish green before calling deployment complete.
