# B0 — Historical helmet silhouette baseline (2026-11-14)

## Source / design authority
- Source imagery: four current in-game examples from the project conversation, showing block-stacked crowns and broad square rims. A PASGT example has the most coherent strap silhouette.
- Reference families to compare: M1, SSh-40, DDR M56 and PASGT. ACH/MICH serve as **quality** comparators, not geometry donors.
- Source code: `src/operator-headwear-silhouettes.ts` renders M1 as greedy unions of one rectangular roof, four vertical wall blocks and four 0.76-thick rim boxes; `src/operator-helmet-cover-visuals.ts` has independently positioned cuboid covers, bands, roof grid and scrim.
- No claim of fresh reference photography or reviewed WebGL captures is made in this document. `scripts/helmet-b0-m1-capture.mjs` generates the controlled comparison frames for review.

## Locked shape language
**M1:** one tapering, broad-sided steel bowl; one thin continuous projecting roll; no horizontal wedding-cake steps. Deliberately faceted — not smoothly subdivided. Lower brow/ear unobstructed. Modestly longer front projection; wide, open underside.
**SSh-40:** deeper bell with subtly flared lower skirt and a simpler front edge. Not a scaled M1.
**DDR M56:** expansive swept side/rear apron and flatter upper mass; unique lower-edge path.
**PASGT:** strong deep ear coverage and nape; older, heavier than MICH without borrowing modern cut geometry.
**ACH/MICH:** protected; no changes.

## M1 geometry contract
- New dedicated authoring source `operator-m1-helmet-profile.ts` owns one contiguous faceted shell and the surface profile for covers, band and retention anchors. All constituent geometry created at rig construction; no per-frame meshes.
- Keep approximate head-local top (8.75), width (about 11–12), and open underside height; values are audition parameters until screenshot approval.
- Preserve `position`, `uv`, `uv1`, `color`, correctly outward normals, baked AO, draw-count and material-family parity. `headwearCuboidVolumes('m1-steel')` can expose only coarse fit proxy envelopes — never an alternate legacy rendered model.
- Cloth `fitted` and `loose` should follow the shell's profile; their hems must stop above the steel rolled edge. Bands and netting should follow the same surface and may sit on bare steel. Scrim requires a visible support (net or band). Preferences persist when unsupported.
- Two-piece webbing with side anchors, natural off-centre closure and released hanging sides. No chin cup or four-point harness. Heavy facewear needs conservative conflict handling.

## Baseline and acceptance
- Headwear: M1, PASGT, SSh-40, DDR M56, ACH, MICH-2002.
- All captures use one neutral operator, neutral pose, same Studio camera controls, lighting, viewport; 4 standard directions (front, side, back, fit). The FIT preset is a perspective approximation, not a strict 45-degree orthographic camera.
- Additional M1 bare/fitted/loose set yields 36 total camera frames. Compare silhouettes again at normal gameplay zoom.
- Reject: square layered roof, rim as thick second tier, a smooth generic dome, wide open fabric gaps, hard overlapping geometry, floating net/scrim, compromised head clearance, or a new helmet identity only legible close up.
- Baseline must be documented; art acceptance requires actual screenshots, not simply successful unit tests.
- Preserve equipment protection and gameplay behavior, existing saves and currently approved modern helmet family.
- Performance: record before/after triangles, material count, visible draw calls and memory ownership rather than asserting unmeasured gains.

## Rollout
B0 documentation and capture -> B1-A1 profile/one shell -> B1-A2 conforming fabric/field equipment -> B1-B1 retention -> B1-B2 wardrobe and Studio -> focused tests + mobile review -> explicit release checkpoint. Commits remain on feature branch until visual acceptance and Pages readiness.
