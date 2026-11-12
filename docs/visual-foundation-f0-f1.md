# Visual Foundation — F0 baseline and F1 contract

Baseline: `4e47f2c78b06dd3bf79b1ec5768084efe1530ef1` (main at the feature branch fork).
Status: F0 implementation baseline; F1 is the paired lighting stage.

## Art-direction contract

**Graphic Tactical Miniatures.** Preserve chunky sculptural forms, authentic historical equipment finishes, deliberately simplified textures, muted environment palettes, and tactical readability. A strong key, three discrete diffuse bands, cool muted shadow fill and warm controlled highlights should shape geometry without making all materials glossy or uniformly violet.

No new scene-wide post-processing, outline hulls, simulation lighting, line-of-sight changes, new gameplay geometry or random appearance variations. Keep the legacy lighting opt-out for A/B. Graphics should remain mobile-budgeted and reproducible per site seed.

## Existing owners (do not duplicate)

- `src/operator-studio-light-lab.ts`: authoritative approved 3-band appearance and preview controls.
- `src/operator-studio-graphic-lighting.ts`: cached Studio/Arsenal Toon variants, piece gradient, masked hard-surface glints, cel edge AA.
- `src/breach-graphic-world-lighting.ts`: opaque Standard world diffuse-band shader; no duplicate meshes or draw calls.
- `src/operator-studio-lighting.ts`: inspection key/fill/hemisphere, shadow sizing.
- `src/breach-3d.ts`: tactical world lighting and renderer output; also used for replay.
- `src/arsenal/viewport.ts`: inspection renderer for real authored weapon meshes.
- `src/equipment-lighting-presentation.ts`: gameplay lighting-mode intensity contract.
- `src/rendering/pixel-profiles.ts`, `src/rendering/pixel-materials.ts`, `src/worldgen/building-palettes.ts`: semantic surface patterns and seeded site colors.

## F0 capture matrix — same authored subject, fixed pose/camera/site seed

| Ref | Context | What to compare |
| --- | --- | --- |
| M1 | Motel public waiting, ISO | Wall/cap/floor separation and friendly silhouette on pale floor |
| M2 | Breezeway motel, wide director | Lit armor, paint, trim, window and exposure against dark background |
| W1 | Warehouse, ISO | Olive and concrete separation; contact visibility under walls |
| W2 | Warehouse contact, wide director | Shooter/target against gray walls, unlit recesses, cloth vs rigid gear |
| O1 | Operator Studio front + 3/4 | Helmet, camo, skin, armor and fabric separation; no skin/fabric glint |
| A1 | Arsenal AK + AR | Steel, polymer and wood identities under controlled inspection light |
| D1 | Same room, day/evening/night/blackout/emergency | Material identities; do not reveal undiscovered actors/rooms |

Capture both the old and new appearance for each available reference and record the exact build, seed, lighting mode and camera; do not claim screenshot approval from code tests alone.

## F1 implementation decisions

1. Share numerical band thresholds/energy among world and inspection shading while retaining separate material-specific pipelines.
2. Keep the key world direction shared; tint shadows selectively rather than recoloring every pixel.
3. Normalize renderer output pipeline (sRGB / tone mapping / exposure) across the tactical, Studio and Arsenal contexts without changing the source texture color spaces or saved finishes.
4. Preserve environment lighting-mode scaling, transparency, fog disclosure, alpha-tested materials, shadow invalidation, cached variants, and approved hard-surface glint mask.
5. A/B legacy rendering remains available; no unbounded shader variant growth or additional GPU render pass.

## Acceptance and rollback

Critical gate: TypeScript compile/build; the existing R7 graphic auditions and Studio foundation tests; new F0/F1 visual-contract tests; site-lighting and graphics-budget tests. Verify no shader-hook failures, transparent/fog regressions, color-space double conversion or material cache leaks. Observe the actual mobile scene against reference captures before declaring aesthetic acceptance.

F0 is static baseline/tests; F1 controls visual presentation only. Roll back F1 via the isolated feature commit or the pre-existing legacy lighting toggle for immediate A/B comparison. M1–M7 and C1–C6 remain future phases, not hidden in F1.
