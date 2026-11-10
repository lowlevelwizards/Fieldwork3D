# Roadmap 2 — Stage 3: visibility, discovery and fog-of-war contracts

## Authority and boundaries
1. Geometric optics (breach-optical-occlusion.ts, breach-core.ts): physical line-of-sight and occluders, independent of presentation and memory.
2. Live perception (breach-game.ts): individual current point sight, timed hostile acquisition, and squad visibility. Full View is an override only, not personal sight.
3. Ground discovery (breach-ground-discovery.ts): bounded 20- and 10-unit directional samples; only successful authoritative occlusion tests enter monotonic seenGround and the personal recording journal. Roof cutaways, cameras, windows and outside walls do not discover ground.
4. Knowledge interpretation (breach-ground-knowledge.ts): one read-only classifier for live, precise remembered, briefing-only and unknown terrain. The legacy 40-unit tactical key is not precise visual evidence.
5. Presentation (breach-presentation.ts, breach-fog-mask.ts, 2D/3D renderers): use actual discovered architecture and fixtures. Both renderers share fog source and fingerprint. Smoothed contours remain clipped to original observed cells.
6. Historical replay (breach-replay-visibility.ts and personal ground): recorded at each frame, never recovered using live simulation. Missing personal evidence fails closed; prior sight cannot reveal later moved corpses or props.

## Staged implementation and acceptance
- A. Pure knowledge semantics and tests: briefing vs observed vs personal sight, true blind vs exterior known vs floor plan vs full view.
- B. Extract simulation's 20/10 candidate iteration unchanged, retain 240-unit +/-1.15 radian radius, cadence, LOS, ordering, and personal recorder data.
- C. Unify 2D/3D fog invalidation including actor/door pose, mode, revisions and session identity, never revealing from cutaways.
- D. Harden historical disclosure: personal evidence stays precise; legacy archives fail closed; rewinds cannot carry later discoveries; no live playback LOS.
- E. Cross-mode seeded visual/geometry/replay tests, critical suite, architecture boundary check, production build, previous Pages preflight, and confirmed live deployment.

## Exclusions
No change to authoritative 60 Hz simulation, timed acquisition, orders, AI combat, movement, actor rigs, fog visual style, pause behavior, or permanent per-tick LOS caches.
