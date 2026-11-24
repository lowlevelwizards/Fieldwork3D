# V8 — smoke and dust
Stacked on V7 ece411a. Render-only audition; no smoke gameplay volume exists in current session.

## Scope
- One shared fixed 64-slot, texture-free soft billboard batch. GPU view-facing vertices, bounded radial opacity, depth test, no depth writes/shadow passes. Per-instance size, tint, phase and opacity. No volumetric raymarching.
- Existing recorded shot dust/wood/stone and flash bursts only. No new clock, simulation, fog/LOS obstruction, smoke grenades or damage events. V5 dust chips replaced when V8 is enabled; wood/stone grit retained with a small visual dust component. Cap recent flash bursts at four. Current visible shot loop already caps at 20. Overflow cosmetic only.
- Deterministic event-id/age sample; source and per-puff sight gates, personal replay disabled. Reset clears count; no stale future evidence. Resource owned by scene, lazily created and reused; disposal hook provided.
- Test actual shader compilation, empty/reset, recorded seeks, camera angles, occlusion and visual overdraw. Compare original/V5/V8 with same synthetic and live workload, count draws and triangles and idle/active p95. No promise of GPU savings merely because billboards are cheap. Dense transparency and wall cutaway bleed require visual review. Gameplay smoke can be scoped later against an authoritative obscuration model.
- Initial integration opt-in ?vfxSmoke=1; tests authored, not yet run. No default change.
