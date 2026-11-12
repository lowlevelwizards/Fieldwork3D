# Consolidation Package C — C6: World-Generation Contracts

**Baseline:** `f0dc01f1c56ec62b3fd3c7b801dd16c104f84f17` — C5 plus subsequent P1 renderer/LOS performance work on main. Previous Pages `43267525513` succeeded and served the expected build.  
**Branch:** `refactor/consolidation-c6-world-contracts`.  
**Primary owners:** `breach-site.ts` and `worldgen/*` author sites; `breach-windows.ts` owns runtime pane state; `breach-core.ts` / Session world own movement/LOS; `rendering/breach-site-openings-builder.ts` and `breach-2d-world-renderer.ts` consume their architectural descriptions; `breach-presentation.ts` owns disclosure.

## Stage objective

Ensure procedural architecture expresses **one physical truth** for window apertures, structural glass/sills and their 2D/3D presentation, and make 2D maps display the actual world envelope and oriented entrances. This is a contract consolidation, **not** a procedural layout re-roll, new world renderer or additional per-frame visibility system.

The chosen C6 changes preserve seeded building programs, density, room layouts, cover, door swing/clearances, unit semantics, objective generation, encounter plans and current P1 performance gains.

## C6.0 — Audited findings

1. `buildArchetypeEnvironment` constructed window sill/glass obstacle dimensions twice. `synchronizeWindowBarriers` built the same physical collider again later. `windowPaneSegment` independently computed the bullet aperture, and `buildSiteWindows` computed a fourth matching segment for façade tagging. These all described the **same window** but had no shared geometry function, inviting subtle drift.
2. `breach-2d-world-renderer.architecture` returned before rendering window indicators for **every generated site**. The only window markers were two fixed coordinates for the older non-generated layout. Thus generated windows were physically real in Three.js/LOS and navigation but absent from the Floor Plan.
3. The Floor Plan responsive **fit** already used `site.bounds`, but its terrain rectangle, decorative grid, map-frame stroke and access-road graphic still assumed the legacy 640×740 south-entry world. Large/rotated/non-origin generated sites therefore displayed a board border smaller than their actual navigable envelope, with road art on the wrong side.
4. `auditSitePhysicalIntegrity` accepted any sill/glass collider with a nearby center, even when its footprint, height, classification, orientation or multiplicity did **not** match the authoritative opening. `architecture-feature-audit` checked only positive window width. Both are offline diagnostic hooks, not live simulation.

## C6-A — One physical aperture and collider contract

Add pure `worldgen/window-geometry-contract.ts`:
- `windowApertureSegment(window)` returns the physical pane endpoints using the actual orientation and width.
- `windowBarrierFootprint(window)` returns the existing 10u-thick, centered gameplay collider; preserve the original low/topHeight behavior for zero-sill glass, clerestories and normal windows.
- `windowBarrierMatches` compares exact structural classification, position, footprint and height within a small deterministic geometry tolerance.
- `auditWindowGeometryContract(site)` reports degenerate/duplicate windows, missing/duplicate/mismatched and orphan barriers **only when explicitly called**, never on every render or generation tick.
- No new class/controller, active-world mutation or cached DOM/GPU state.

### C6-B — Bind generation, shots and 3D to the same contract

- `buildArchetypeEnvironment` keeps its original pre-glazing physical barrier supply for interior-placement checks. After new interior windows, call the existing idempotent `synchronizeWindowBarriers` instead of rebuilding colliders in a separate loop.
- `synchronizeWindowBarriers` delegates to the shared footprint helper and remains deterministic, idempotent and nonmutating.
- The existing gameplay `windowPaneSegment` delegates to the shared aperture helper. It stays the exported gameplay API and its hit/collision ownership does not change.
- 3D façade/window builder uses that same physical aperture for public/exterior classification. Decorative frames, glass, wall caps, stateful shattering and material ownership stay unchanged.

## C6-C — Render generated windows in Floor Plan without fog leaks

- `breach-presentation.windowPresentationKnown` gates static window markers based on **already briefed/recorded** structural knowledge. Full View and Floor Plan intel intentionally show architecture; Exterior Known shows actual publicly accessible façade windows; True Blind shows only previously discovered window sills/glass barriers from `intel.cover`.
- A window marker is an architectural location indicator **not a live opening state, enemy position or personal replay observation**. Do not render its broken/open state or recompute historical LOS to reveal a pane.
- `breach-2d-world-renderer.architecture` draws real physical window line/caps from `site.windows` and `windowApertureSegment`, in the same layer previously reserved for legacy-only windows. Legacy static markers remain only when `state.site` is absent.
- The existing room/wall/door sight filter, fog placement, operator visibility and historical replay disclosure remain authoritative. C3 personal contact secrecy is preserved; shared architectural knowledge is still shared.

## C6-D — Real bounds and entry geometry on the 2D board

- Draw the board background, border and terrain/grid according to actual `site.bounds` with a legacy 640×740 fallback.
- Generated property's decorative access approach faces `site.entrySide` and real `site.entrance`, not a fixed south-edge road. It is never navigation geometry, collision or replay knowledge.
- Cap the area-dependent per-frame noise-dots by increasing decorative detail spacing for larger envelopes. Do not add per-frame allocations proportional to world area beyond the existing grid draw.
- Keep `fitBreach2DView`, `centerBreach2DView`, pan math, operator/world origin, CSS layout and 2D/3D render layer ordering unchanged.

## C6-E — Improve on-demand diagnostics

- Upgrade `auditArchitecturalFeatures` to include exact geometry-contract issues.
- Replace permissive proximity-only window validation in `auditSitePhysicalIntegrity` with exact matching; classify missing, duplicated, degenerate and orphan window barriers. Orphan decorative/barrier remnants remain advisory; true missing/duplicate/bad apertures are blocking in the **offline report**.
- No expensive route solver introduced into Quick Play/Map Lab iteration or any frame; these audits run only on demand.

## C6-F/G — Acceptance and release requirements

Add `tests/package-c6-world-geometry-contract.test.mjs`:
- Pure horizontal/vertical pane, full-height glass, sill and head height parity across the gameplay, physics and 3D consumers.
- Idempotent collider synchronization, deterministic seeded **real generation**, no mutation or orphan/duplicate window barrier.
- Invalid synthetic geometry reports useful findings instead of silently passing.
- Full View/briefed/Exterior Known/True Blind visibility, with hidden interior windows remaining hidden.
- Actual Floor Plan drawing of the generated pane endpoints.
- Non-origin/expanded site envelope used for frame and board, independent of camera fit.
- No new replay/LOS/gameplay authority or per-frame renderer controller.

Keep inherited window styles, physical/fog/route, rendering, façade and C0–C5 regressions. Run production TypeScript/build, architecture critical, real WebGL tactical/mobile, Replay/Bodycam and Operator Lab acceptance at the final feature head.

## Explicit exclusions / risk audit

- **Do not** change chosen seed, archetype, procedural room/door layout, furnishing preference, enemy/civilian population, scenario, campaign saves or map scale.
- No new tactical LOS source, out-of-band visibility, shooter-wall intersection, camera mode, render pass, texture style, lighting or 3D scene lifecycle.
- 2D markers do not imply pane state, collision removal or window opening. Existing replay/window observation history remains authoritative.
- No runtime site validation on each tick or visual frame. Keep mobile `P1` scene-local cache and debrief historical truths intact.
- Do not claim physical iPhone Safari thermal/screenshot approval from automated browser tests.

## Release checkpoint and C7 handoff

- Commit stage on feature branch; PR tests must verify the **final** head. If a parallel merge moves main, confirm compatibility and current served build.
- Merge only when prior Pages successfully serves expected SHA and no Pages job is queued or running.
- Verify the **exact** resulting merge SHA is successfully deployed and publicly served, not merely that Actions has finished.

**C7:** Mission and Faction Semantics: validate force definitions, scenario contracts, encounter/civilian truth and their persistence boundaries; do not duplicate map generation, visual representation or replay knowledge.

## Completion ledger

- [x] Current P1 main and previous Pages production verified.
- [x] Physical opening/collider/render owners audited.
- [x] Shared pure aperture, barrier and audit contract implemented.
- [x] Generator/gameplay/3D integrations and 2D map parity implemented.
- [x] Focused tests and Package C workflow authored.
- [ ] Final C6 CI/real WebGL checks green.
- [ ] Clean PR merge and release barrier verified.
- [ ] Exact new public Pages build-stamp verification successful.

Final evidence and discovered compatibility exceptions belong in the PR closeout.
