# G36 R3 — final factory silhouette corrections

**Input:** 18 November 2026 user's R2 mobile Arsenal screenshots and actual long G36 photograph. Explicit choices: genuine SEF only if historically available; selector rear/down regardless; rear of magazine housing vertical, bottom and front angled; flash hider must resemble G36 reference, not a square cap; keep geometry minimal. R2 geometry baseline: **452 triangles / 23 meshes** (production census).

**Reference authenticity:** Heckler & Koch G36 armorer manual lists `Pistol grip, complete, w/SEF markings` alongside alternative pictogram versions (manual p.62); HK 2013 catalog includes G36 SEF/S-E-F alongside pictogram groups. Letter markings are therefore supported, not mandatory for all variants. This game uses the original-style SEF art while leaving existing modeled ambidextrous controls intact, because this is an **art-only** revision, not a new mechanical firing mode.

## Stage R3A — genuine SEF, original selector ergonomics
- Actual live factory source `g36-silhouettes.ts` uses existing shared `hk-selector` texture **instead of** `hk-selector-picto`. Same pooled 24×20 RGBA texture, white S / muted red E and F; one existing two-sided four-triangle batch; no extra mesh/draw/atlas allocation.
- Move both existing six-sided selector hubs/paddles from `(-3.95, -1.14)` **back and down** to `(-5.20, -1.96)`, exactly the earlier approved placement beside the top rear of grip.
- Reposition one shared two-sided marking plane to `(-5.75, -.77, 1.278)` with size `2.30×1.72`, taking into account that real glyph pixels are at x≈17–19 of 24 in its sprite, and keeping visible S/E/F above the pivot.
- G36-only geometry and textures; do not change G3/HK33/MP5 selector systems, saved parts, behavior, poses or weapon stats.

## Stage R3B — 90° rear magwell with a sloped belly and front
- Preserve **one eight-point extruded lower receiver**, thickness 2.28, open trigger void and original polymer magazine.
- Existing top/front receiver landmark `(4.05,-1.28)` slopes diagonally to the forward lower tip `(2.72,-3.13)`.
- **Underside** slopes down toward rear to `(-1.70,-3.49)`.
- **Rear wall** rises **vertically** (same x **-1.70**) from `(-1.70,-3.49)` to `(-1.70,-2.18)`; keep the trigger cutout before the grip.
- Existing 5.56 magazine mouth has x-center .45, width3.32, upper edges approximately[-1.21,2.11]; well bottom span ~4.42 allows >=.49 model units side clearance. No 7.62-sized replacement, no extra collar, hollow shell or interior triangles.
- Keep existing 30-round magazine, reload contact and visual-factory part IDs.

## Stage R3C — authentic silhouette flash hider without mini-details
- Replace only the original **one** 12-triangle square muzzle box (1.60×1.52×1.52) with a simple **one-mesh eight-corner profile extrusion**: 28 triangles, 1.65 long, subtle rear collar rising to ±.77, forward body ±.64, depth1.42; muzzle tip endpoint remains x19.50.
- The barrel remains the original 12-triangle box, intersecting collar. One geometric identity, no telescoping stacks or washers, no circular hole/internal bore, no extra ribs.
- Reuse the **existing G36 guard vent pixels** for **two broad dark longitudinal flash-hider ports** through custom UVs applied to the muzzle side faces, avoiding any new texture, shader, material family or extra draw call.
- Keep G36 polymer palette and dark factory muzzle steel role; preserve standard image from forward/side/quarter/top/mobile.
- Target exact change **+16 triangles** = roughly 468 total, still 23 meshes and far below 650.

## Release gates
- Dedicated R3 acceptance validates exact 90-degree rear wall, sloped bottom/front, 5.56 magazine containment, glyph content and positioning, pooled graphic identity, full factory mapping, triangle/mesh count.
- Re-baseline existing R1/R2/P2–P8 assertions to R3; include R3 test in the production G36 visual audit, TypeScript, build and the critical Ground Zero/Arsenal integration checks.
- Commit separate stages to feature branch; merge only on green critical results after verifying current Pages release stamp, no outstanding deployment, no conflict with new `main`. GitHub Pages merge automatically triggers the release; verify actual published stamp before claiming live.
