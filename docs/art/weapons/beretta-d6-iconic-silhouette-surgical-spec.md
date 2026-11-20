# Beretta D6 — iconic miniature, subtractive geometry, universal side view

**Date:** 2026-11-20  
**Scope:** M9/92FS and M9A3 *appearance-only* Arsenal art and shared sidearm preview orientation.  
**Authority:** [Universal Weapon Art & Production Standard](weapon-production-standard.md) and prior [D5 measured baseline](beretta-d5-surgical-spec.md).

## Art lock

The miniature, not a mechanical replica, is the deliverable: **chunky, stubby, abstracted, representational and iconic**. Exaggerate the open-top slide, generous grip sweep, exposed hammer and enclosed front muzzle. Spend topology only where it earns an identifiable silhouette or truthful open void at actual game scale.

Keep the physical open-top Beretta channel and empty trigger-guard aperture; there is **no trigger** (explicit user constraint). Retain the long swept beavertail, authoritative `M9_ART` IDs/endpoints, Glock secondary equipment, save data and ballistics boundary. Don't create a new renderer, preview-specific duplicate art builder or perpetual render loop.

## Surgical stages and source anchors

| Stage | Code anchor | Implemented intent / release check |
|---|---|---|
| A1 | `hammer:Outline` | Reshape narrow 7-point hooked crown (lower maximum height from D5 blade, reduce Z bulk); retain long frame tang |
| A2 | `m9UnifiedFrontShell(nose)` | Replace stepped `wrapGeometry`, `wrapCrown` and `frontSight` with one hand-built faceted U, inward-sloping exterior shoulders, short connected nose bridge, low-facet integrated sight; no extra overlapping boxes |
| A3 | `sideRail:Outline` | Shorten open side rails to meet front shell with minimal overlap, avoiding unseen repeated geometry without deleting real open-top identity |
| B1 | `gripPanel:Outline` | Refit per-variant classic swept and M9A3 Vertec-like profiles; two planar sides in one indexed GPU batch, rather than independently extruded slabs; panels remain aligned to both grip/frame heels |
| B2 | `marksGeometry` | Three strong forward-slanted grooves per side rather than four; include both decocker/safety paddle silhouettes in **same** indexed dark detail batch |
| B3 | `SAFETY_RED` dots | Two flat red diamonds, two triangles each; no six-spoke micro-facet circles |
| B4 | `m9FrameControlBatch` | Delete low-value takedown/slide-stop/pin marks whose shapes vanish at game scale |
| B5 | `m9RailSlots` | Delete three small dark ticks per side; keep the **M9A3-only real protruding frame rail** that matters in silhouette |
| B6 | `m9MuzzleCrown` | Replace additional capped miniature tube with six-triangle dark planar muzzle face at the unchanged real barrel endpoint |
| C1 | `GlockGallerySnapshots.render` | Gallery factory/saved cards **and main hero** from true side profile, same production geometry and existing cached WebGL renderer |
| C2 | `GlockViewport` | Initialize shared Glock/Beretta workbench camera yaw=0, pitch=0; reset returns to side (manual orbit/top/quarter remains available) |
| C3 | `openM9Inspector` | Set SIDE aria-pressed and call `viewport.side()` on initial open; clay changes retain selected manual orbit |

## Comparative geometry budget

**D5 baseline, actually emitted:** M9 **20 meshes / 452 triangles**; M9A3 **22 meshes / 476 triangles**. These were measured by the production geometry gate, not extrapolated from polygon source counts. D6 must reduce both; use the actual `index.count / 3` or nonindexed position count / 3 for *every* production mesh. The new front shell combines U, nose cap and sight into one draw mesh, while retaining more helpful structural facets.

Budget optimization is valid only if 64px / 128px same-scale clay/card screenshots still identify the Beretta and the M9A3's rail/straighter grip. Any extra geometry must have an explicit identifiable cost/benefit. Do not chase a lower number by filling the open barrel channel, hiding necessary hammer/guard silhouettes, or flattening the model to a wafer.

## Visual acceptance

1. Compare identical scale and shared lighting for classic M9, M9A3, Glock G19 Gen3. Normal gameplay scale, **64px and 128px**, is the primary approval gate; side, opposite, quarter, top and front capture required to identify hidden floaters.
2. From side, grip panels follow frame rake and read as intentional, not vertical black trapezoids. Rear hammer is a clean compact hook and doesn't become an antenna in side or slab in quarter.
3. From front/quarter, the U front shell has chamfered shoulders, a real central open channel and an integrated front sight; no two independent vertical posts or floating front crown.
4. Exposed barrel continues through and beyond the front shell; separate barrel is chunky with six facets. Both variants retain the actual open guard (no added trigger).
5. Only high-value side detail survives: bold short serrations, safety paddles and red dots. M9A3 has a visibly protruding accessory rail and longer barrel, no microscopic slots.
6. Main sidearm Gallery hero, every card and both inspector/workbench first camera frames start as SIDE. The primary Arsenal thumbnailer already does so; do not fork the primary preview renderer.
7. Critical tests: geometry/triangle count, M9 vs Glock and variant scale, contact/socket/cleanup, TypeScript production build, actual mobile/desktop browser captures, and focused integration. Avoid unrelated CI mass fan-out.

## Release procedure

Work on feature branch. Commit compatible stages in sequence; create a draft PR to validate exact branch head. Audit emitted triangles/meshes on the live production model. Reconcile any acceptance-test contracts that only describe superseded D4/D5 geometry, preserving their behavioral invariants. Inspect real browser output, not numeric tests alone.

**Merge only** after exact-head critical checks are green, the previous GitHub Pages workflow succeeded with public build stamp equal to `main`, and no active Pages deploy exists. Squash merge at the release checkpoint; verify the new live Pages build stamp. If artifact metadata lags, investigate and retry the failed workflow instead of queuing extra code merges.
