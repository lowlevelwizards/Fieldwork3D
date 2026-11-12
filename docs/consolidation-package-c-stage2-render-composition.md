# Consolidation Package C — C2: Rendering and Scene Composition

**Baseline:** `d1760bd4550a2d84a588381da0edc02e9ca5fea4`, C1 merged and publicly served via Pages workflow `43231526667`.
**Branch:** `refactor/consolidation-c2-render-composition`.
**Owner boundaries:** C0 presentation ownership + C1 per-site release; F0/F1 approved graphic lighting profile, B8 rig-local pose and A8 authoritative Session geometry are immutable.

## Goal

Make 3D world rendering setup identical on initial scene creation and every site swap, and keep site-dependent fog geometry separate from its authoritative visibility/disclosure rules. Consolidate existing composition, **not** start a second renderer or change art direction.

## Audited C2 baseline

1. `TacticalScene3D.constructor` called `buildWorld()` then `applyWorldGraphicLighting()`, but never `finalizeStaticSiteBatches` for an active site on first paint. `applySite` called all three in that order, creating a cross-lifecycle composition difference.
2. `applySite` independently built the same site again through a new build port, then batched and graded. This duplicated responsibility and port construction; the renderer should have one defined assembly path.
3. `applySite` built both fog geometry footprints inline, mixed with visibility canvas size/texture refresh. These meshes are presentation-only: the polygons are supplied by the existing `breach-fog-domain.ts`. Moving their triangles cannot move authoritative fog or replay knowledge.
4. C1 already handles site geometry and instance-buffer release. C2 must preserve that cleanup order and material ownership, including generated-site shader hooks and instancing.
5. F1 introduced `configureGraphicRendererOutput` and shared style constants. Tactical world and Studio operator shaders must stay independently owned; no new lighting modes, grading parameters, materials, render targets or GPU passes.
6. The 2D Floor Plan is already extracted and owns its own rendering; C2 must not convert it to 3D or duplicate fog policy. Replay/Bodycam use the same tactical 3D scene and explicit historical disclosure.

## Complete change specification

### C2-A — Single site-render assembly

Add `src/rendering/breach-site-render-composition.ts` as a small stateless function:

- Build the world through the **existing** `SiteSceneBuildPort`.
- If the site is generated, run the **existing** static batch finalization after mesh creation and before shader application. Legacy fallback deliberately skips generated-room batching.
- Apply `applyWorldGraphicLighting` after batching when F1 graphic lighting is enabled, without replacing or cloning material resources.
- Return graphic-material count and whether generated batching was invoked; no stateful controller, DOM, renderer or gameplay input.

### C2-B — Geometry-only fog-mesh assembly

Add `src/rendering/breach-fog-mesh-composition.ts`:

- Retain the exact exterior-known footprint union rectangles, quad winding, UV coordinates, world-space Y=1.05 and normals.
- Retain the exact bounds-driven ground-plane size and placement, including sites with nonzero origin.
- On a site replacement, swap only two geometry buffers, disposing their prior buffers once; never dispose the mesh, shared material or CanvasTexture.
- Keep the original Canvas2D size, source-over compositing, memory cache, LOS, visible actors/props and historical replay disclosure unchanged.

### C2-C — TacticalScene3D integration

- Initial scene and `applySite` call one `composeSiteWorld(site)` method that constructs one build port and invokes the stateless assembly.
- Eliminate duplicated inline build/batch/grade assembly; keep first-paint camera zoom, scene layering and graphical palette unchanged.
- Delegate only the site-dependent fog mesh construction; keep canvas resizing, material ownership, fog texture invalidation, camera reset and site disposal in their existing owner.
- Preserve world first paint at the point it was previously built, before fog overlay mesh installation; no extra frame, renderer restart, or sim tick.

### C2-D — Real Three.js parity tests

- Construct real seeded generated-site geometry with a reproducible harness, comparing manual legacy assembly (`buildSiteWorld` → `finalizeStaticSiteBatches` → `applyWorldGraphicLighting`) with the new composition, including mesh/material types, visibility, shadow flags, room/door IDs, static batch stats and immutability of the input site.
- Assert non-generated fallback remains unbatched; F1 shader hook remains idempotent and respects lighting opt-out.
- Validate exterior-known positions, UV and winding vertex-by-vertex against current domain helpers.
- Swap site → legacy and verify old geometry disposed once, materials/mesh identity/render ordering preserved, and no display-grade changes.
- Assert C1 teardown, tactical fog/replay authority and F1 renderer output remain unchanged.

### C2-E — Focused CI and cross-mode verification

- Extend existing Package C workflow for C2 tests and inherited generated-site construction, F1 shader parity, and R7.18 visual material contracts. Keep C1 lifecycle and C0 ownership gates.
- Preserve the primary TypeScript/build, architecture critical, real WebGL tactical/replay/Bodycam/Lab smoke, and release-readiness checks.
- Manual real iPhone Safari/dedicated GPU heat/frame-time/screenshot approval cannot be inferred from Node or headless Chrome.

### C2-F — Release & C3 handoff

- Commit to feature branch, review focused tests, and merge only after previous main Pages deploy has succeeded **and is served**, no other active or queued Pages run is present, branch is current and required regressions green.
- Then verify new Pages job is successful **for exact merge SHA**, including public served-build stamp.
- C3 next: audit shared 2D/3D/replay presentation and knowledge/disclosure invariants without building a universal renderer.

## Scope exclusions and safety audit

**No new controller or frame scheduler; no alternate camera; no art/style changes; no new postprocess; no simulation change; no physics/motor AI change; no shader threshold or quality budget change; no live/disclosed sight changes; no producer-side mutation of Session, pose, weapons, saves or historical replay.** Site batching is reused, not rewritten. Fog geometry is not a new LOS source. If first-paint batching changes the draw-call count, that is alignment to existing replacement-site behavior, not a change to mesh silhouette.

## Acceptance ledger

- [x] C1 starting production build verified and source owners audited.
- [x] Single initial/swap render assembly added.
- [x] Fog display geometry extracted without disclosure logic.
- [x] TacticalScene3D composition integrated.
- [x] Real geometry parity tests and scoped CI authored.
- [ ] C2 PR gate green (including build and browser).
- [ ] Release checkpoint clear / exact pre-merge public build served.
- [ ] C2 merged and exact resulting Pages build publicly served.

Release evidence and any discovered exceptions are recorded in the PR conversation. No claim of actual physical-device screenshot approval from automated tests.
