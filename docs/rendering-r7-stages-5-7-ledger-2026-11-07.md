# Rendering R7.5–R7.7 — staged implementation ledger (2026-11-07)

Branch: `feature/r7-stylized-shader-compat-rim-20261107`  
PR: [#1038](https://github.com/lowlevelwizards/Fieldwork3D/pull/1038)  
Base: main after R7.1–R7.4 production release

## Art contract
- Preserve chunky voxel/low-poly silhouettes, printed camouflage and AO bytes,
  existing per-rig arm/thigh cavity shading, IK and tactical fog/visibility.
- The approved smooth look remains the production default. New cel and rim
  effects require explicit Studio URL query flags, not wardrobe persistence.
- Do not use a full-screen outline pass, extra scene lights or extra geometry.
- A material with unfamiliar custom shader work must retain its original shader.

## R7.5 — composable toon and pose cavities (implemented)
- `applyOperatorStudioToon` retains the source Standard material and selects
  cache variants by 2/3 bands and eligible rim role, per operator root.
- The torso and thigh cavity `onBeforeCompile` hooks are chained into
  compatible toon variants, reusing the original animation-driven Vector2
  uniforms. Different operators and legs never share cavity values.
- Unknown shader hooks and unsupported PBR texture semantics are intentionally
  excluded from automatic conversion; no silent visual feature loss.
- Switching to bands=0 restores the original material. Rig replacement and
  thumbnail disposal release cached toon alternatives, without disposing maps.
- Focused tests validate uniform identity, mode restoration, separate variants,
  material exclusions and no UV/geometry mutation.

## R7.6 — diagnostic block/rim highlights (implemented; not art-approved)
- Studio URL: `?operatorLightingToon=3&operatorRim=pixel` or
  `?operatorLightingToon=2&operatorRim=hard`.
- Rim without toon remains inert; it is not a second global material pipeline.
- View-dependent edge factor is modulated by object-local quantization to make
  reasonably chunky, stable highlight patches. Highlights scale the existing
  outgoing light, so they cannot independently brighten unlit fragments.
- Semantic hard-shell region tags are applied to approved ballistic headwear
  and plate assemblies; ordinary cloth, soft caps, skin and pouches are not
  eligible. Group tags affect only material selection, not rig geometry.
- Main Studio model and appearance thumbnails use matching experiment flags.
- Browser critical smoke renders actual 390px WebGL screenshots for hard/pixel
  rim variants and rejects shader/WebGL errors.
- Remaining: human visual selection, moving-orbit shimmer comparisons, material
  edge strength calibration and iPhone Safari performance before promotion.

## R7.7 — nonblocking appearance thumbnail readback (implemented)
- Use Three.js asynchronous `readRenderTargetPixelsAsync` where supported.
  `?thumbnailReadback=sync` forces the old synchronous path for A/B debugging.
- Exactly one thumbnail readback may be in flight for the shared target/buffer.
- GPU readback is initiated before immediately restoring the main renderer's
  target and clear state; the await happens after restoration.
- Changed categories/appearance keys and hidden Studio invalidate pending
  display results. Do not paint obsolete card images after a slow readback.
- Existing bounded ImageData cache, single reusable rig and sRGB conversion
  remain unchanged. No additional WebGL context.
- Diagnostics expose the chosen readback mode, total readback wait time, GPU
  program count and the existing per-item render time.
- Remaining: actual iPhone FPS/input-latency and memory comparison with
  `thumbnailReadback=sync` across cold/warm Studio opens.

## Focused release gate
- `npm run build` including TypeScript, Node R7 composition/readback tests,
  inherited R5 toon/cavity tests, and existing Studio thumbnail contract.
- Mobile Studio smoke must confirm thumbnail completion, stable card DOM,
  saved looks and actual operator preview.
- R7 shader smoke must capture both rim modes without WebGL program errors.
- Existing armor/rig and facewear mobile workflows should pass.
- Merge only at release checkpoint when main is compatible, previous Pages
  deployment succeeded and live build ID equals previous main head.
- Keep experimental cel/rim query flags opt-in. Do not queue overlapping Pages.

## Remaining roadmap priorities
1. Physical iPhone repeated Studio open/close and async-readback A/B,
   cold/warm Quick Play first-frame timing and context-loss soak.
2. Human visual review of R7 pixel/cel materials at tactical, medium and
   Studio zoom; retain smooth materials where stylization harms depth.
3. Separate actual cast-shadow coloring from cool fill, retaining neutral AO.
4. Harmonize authorized world props/architecture, compare lighting modes.
5. Consolidate shader variants and optimize tactical GPU overdraw/shadows
   using measured scene-level performance.
