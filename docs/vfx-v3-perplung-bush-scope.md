# V3 — Perplung Bush Study 04
Source: Perplung 8ffb7a0b870cf7158b63a6796a916bac3c8f89b4. Isolated prototype from current main; no merge ahead of V0/V1 or V2 reconciliation.

## Scope and acceptance
- Port three rounded clump variants in a padded 512×128 atlas, five horizontal drooping shelves, bottom-to-top tints .82/.92/1.02/1.12/1.22, crossed rooted stems. Preserve source silhouette while adapting to authored Fieldwork dimensions.
- Compare 2×2 and original 4×4 shelf subdivision in identical views; 44 vs 164 triangles per bush including stems. Original Fieldwork shrub has four cards (8 triangles); this trades geometry/alpha coverage for fewer submissions, not a guaranteed speedup. Prefer coarse grid if visual parity is acceptable.
- One shared atlas and material; GPU rim wind, stationary centers/stems, padded culling bounds. No per-leaf CPU changes. One mesh per shrub fixture initially.
- Preserve physical cover, fog/intel and intact/debris groups, moved/toppled/destroyed state, replay owner and template lifetimes. Only eligible exterior shrub-round, shrub-tall and bush; leave tree, hedge, planters and interior plant art alone. Never spawn new physical cover.
- Audit repeated fixture batching and shader/material ownership. Only batch multiple shrubs if independent disclosure, move and destruction remain correct and measurable performance improves; avoid unbounded geometry or cross-owner culling regressions. Explicitly manage material/texture/geometry lifetime.
- Run deterministic tests, actual WebGL shader acceptance, fog/damage/site-swap/replay checks and same-seed A/B screenshots from iso/top/low camera. Measure draw calls, triangles, alpha overdraw and CPU/GPU frame-time on representative sites; physical-device data separate from software WebGL. No default switch or merge until gates are satisfied.
- Initial atom committed with atlas, normalized mesh, wind shader and regression tests. Not integrated or tested yet.

Prototype checkpoint: shared resource owner and per-fixture shader phase from world position. Tagged meshes deliberately avoid generic rigid fixture merging until owner-aware replacement is validated. Explicitly remove mesh nodes before shared resource disposal. Tests written, awaiting CI.

Integration checkpoint: ?vfxBush=1 replaces only exterior shrub-round/shrub-tall/bush intact visuals, before template selection. No new colliders; existing owner transform, fog visibility, topple/destroy and debris logic unchanged. Shared resources are lazy-created per site and disposed before generic site teardown. Preview remains default-off. Initial three atom tests and production verify passed on ee41456; integration not yet verified.

Integration verify passed at 7cca7f0. C8–C11 historical world parity failed (four mission outcomes differ vs its older baseline); no world generation source changed. Exact current-base mission parity still needs verification. Added paired real tactical WebGL shrub probe (shader, owner destruction/restoration, shared disposal and draw/triangle/texture counts); default remains off.
