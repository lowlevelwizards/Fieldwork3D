# Visual Foundation — F2/F3 release contract

Branch: `feature/visual-foundation-f2-f3-material-surfaces`.

## F2 material identity
- F2.1: small semantic presentation role policy; preserve authored colors and simulation substrates.
- F2.2: explicitly tag authoritative AR, AK and HK finish families; do not invent stock colors or affect the equipment ledger.
- F2.3: apply subtle, bounded material-specific shape response in existing Studio/Arsenal toon shader and identify equipment cloth/armor by role. Preserve already-approved glint eligibility, shadow/camo layers and variant disposal.
- F2.4: adopt response policy for cached world opaque Standard materials; no additional render pass or geometry.

## F3 surfaces and wear
- F3.1: validate metric UV mapping and texture LOD; preserve world-anchored floor seams and UV-scale consistency.
- F3.2: improve directional construction motifs (wood, concrete, woven materials) without universal random texture noise.
- F3.3: improve condition/age composition by substrate, retaining deterministic room and wall exposure maps.
- F3.4: verify repeated views at the same build, site seed, camera, weapon, stance and lighting state.

## Protected behavior
No simulation, pathfinding, fog-of-war, replay disclosure, ballistics, saved appearance, shadows or collision changes. Historical finishes and camouflages retain their source colors. No dynamic per-frame material allocations, new post-processing pass, new shader per part, or unbounded textures.

## Acceptance
- Existing R7 graphic shader and rim tests pass.
- Fixture/weapon material roles deterministic and distinct; authored RGB unchanged.
- Pixel texture dimensions, mipmap shapes, UV repeats, seams, and site-seed repeatability remain deterministic.
- Pristine material appearance unchanged where intended; wear stays bounded.
- Production typecheck and build, key material/lighting/operator/scene regressions pass.
- Matched visual comparison for AK/AR/HK, operator, motel, and warehouse still requires actual screenshots; passing code tests alone is not aesthetic approval.

Deploy only when previous Pages release is serving its expected build and current deploy queue is clear.
