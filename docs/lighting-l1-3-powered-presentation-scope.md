# L1.3 — Powered fixture presentation parity
Fieldwork Breach · 2026-11-16 · implementation and release contract

## Scope and audit
The electrical authority remains `SitePowerState` (L1.1); operators still act through physically validated L1.2 orders. `planSiteLighting` and `illuminationAt` retain gameplay source and blocker semantics. Neither renderer determines contacts, fog, enemy knowledge, camera access, or power state.

**L1.3A — shared source:** `equipment-lighting-visuals.ts` derives all potential fixtures from the pre-existing 32-fixture stable topology, matching the active emission list to the session's current power/mode. Each dark unit is marked off or failed. Active rays are clipped by the same opaque wall/door/tall-cover segments as weapon and perception lighting. Cache by session identity, immutable power-state identity/revision, fixed 8-Hz bucket, world revision, and door aperture signature. No second lighting simulation.

**L1.3B — ISO:** `breach-site-light-presenter.ts` uses exactly one dynamic vertex-colored, non-shadow-casting floor geometry and a single instanced physical light-head mesh. Backing geometry and materials are created once and reused across sessions; changing breaker state rewrites bounded buffers. Three gradient sectors use physical occlusion radii and quadratic attenuation approximated with center, mid and edge color. Emissives are chunky white/amber work lights, muted backup, unlit gray, or visibly failed brown. The ground-aligned fog remains later in depth/render order. Historical personal cameras use recorded ground evidence, not new sight queries.

**L1.3C — 2D:** `breach-2d-world-renderer.ts` draws the same powered fixtures as soft radial gradients clipped to the same blocker polygon, with tiny readable luminaire markers. Placement is after global mood and before architecture/fog; no unknown room gets a visible fixture or glow. Limited personal replay evidence is respected. Room/fixture disclosure is presentation-only and cannot change fog.

**L1.3D — lifecycle/performance:** no dynamic light objects, shadow maps, material recompilation, or per-frame scene mesh allocations. Bounded source and ray counts; one pooled ISO draw for ground cues and one instance batch for heads. Site swaps clear cached visual ownership; session snapshots are weakly held. Shadow map remains unchanged.

## Acceptance / gates
1. All five legacy ambient modes still produce the same authoritative on/off fixture set.
2. Mains A, B, local switch, and emergency circuit visibly respond within the same simulation/illumination bucket; non-target circuits are unaffected.
3. Closed opaque door, walls, and tall cover stop the rendered pool at the same physical obstruction as gameplay lighting. Glazed door transmits as in existing occlusion.
4. A failed or unpowered luminaire is still physically visible only when observed and never emits a pool.
5. ISO and 2D consume precisely the same authoritative visual snapshot; both defer visibility to fog, historical disclosure, and existing world geometry.
6. No new SpotLight, per-fixture shadow, all-room intelligence, gameplay mutation, added electrical network, movement change, or updated legacy K1 trial key.
7. Typecheck/production build and focused L1.0/1.1/1.2/1.3 contract tests pass; deployment/served-build SHA verified before claiming live.

## Known bounds
Light cues are low-cost graphic approximations, **not** physically based indirect bounce or per-surface shading. Ground/cap visibility must be inspected in actual ISO and 2D on mobile after CI; CPU-only tests cannot prove GPU frame timings, iPhone readability, or show exact material tonality. Weapon light and NVG upgrades are L1.4/L1.5, not silently added here.
