# Camouflage 9A + 9B — eight new recognizable print families

**Scope:** one staged catalog release, **54 → 62** independent IDs, original artwork only. Baseline approved Fieldwork Breach 8H (M98 64px, JGSDF, S2000 unchanged). Feature branch: `feature/operator-camo-9a-9b-eight-reference-families-20261105`.

## Visual priorities

1. **Silhouette over detail.** Each family must remain identifiable on a 20–40px trouser thigh crop and a 64px master thumbnail.
2. **Shape grammar, not recoloring.** No two new prints may be constructed from the same master indices. Each gets specific macro/mid/micro motifs.
3. **Limited palette.** Colors are hand-art-directed in RGB, not sampled from protected or printed photographs. Role-driven color mixing and intentional coverage; no noisy raster filter.
4. **Coherence.** All are deterministic **64×64 indexed** repeat masters, nearest-neighbor RGBA, common cached source, headwear/fabric metric density, stable cut-phase for every wearer. Existing 6A/7A/8A renderer and pixel scale are unchanged.
5. **Authenticity.** Restrict gear, armor, headwear and sewn garment availability to historically credible analogues, not every channel just because a print exists on fabric.

## Photographic references and intended distinctive art

| Pattern | Macro language at gameplay distance | Secondary marks | Palette and distribution intent | Headwear/cloth world repeat |
|---|---|---|---|---|
| **French CCE** | Broad rounded horizontal light/green/brown fields; long restrained black hooks | Occasional interrupted bands, no micro chips | Olive green / sand-taupe / umber / charcoal; intended **34/24/26/16%** | 64px, fabric 2.65 → 24.15 units |
| **Russian VSR-93 / Barvikha** | Several vertical oak-leaf/spear trunks, each kinked and tapering; 3 inks | Negative-space fingers and uneven slender lobes | Pale khaki / olive / dark forest; **43/35/22%** | 2.65 → 24.15 units |
| **Swiss TAZ 90** | Moss/olive fields with medium brown and charcoal branch structures; not red Alpenflage | Attached small 2–4px leaf tips, integrated rather than all-over speckle | Warm khaki / green / earth / black-green; **30/31/24/15%** | 3.1 → 20.65 units |
| **British Desert DPM** | Exactly two pigments; 8 large directional brushstrokes with torn tips, ample light sand | Sparse same-ground interruptions rather than isolated dots | Sand / muted clay-brown; **62/38%** | 2.3 → 27.83 units |
| **South Korean Granite B** | Small/moderate staggered digital regions, angular pixelated step silhouette | Numerous attached square chips and restrained charcoal fractures | Stone / sage / brown-gray / deep green / charcoal; **28/26/19/18/9%** | 3.7 → 17.30 units |
| **Kopassus Flowing Blood** | Very long, flowing vertical red-brown, green and dark branch/ribbon shapes | Thin forked veins; never Tiger Stripe horizontal bands | Warm sand / jungle green / burgundy / deep forest; **36/27/23/14%** | 2.7 → 23.70 units |
| **CADPAT AR (adopted)** | Broad light-desert ground plus connected clay and deeper brown stepped blocks | 2px crenellation and very sparse 2px satellites; NOT 4-color trial master | Sand / clay / deep earth; **47/32/21%** | 4.0 → 16 units |
| **USAF ABU digital tiger** | Repeated broken horizontal sage-gray bands, tapered and offset | Digital 2px teeth; no all-over UCP noise | Mist gray / sage / slate olive / deep gray-green; **32/28/23/17%** | 3.65 → 17.53 units |

The percentages are initial direction targets, not falsified measurements. A separate regression logs the **actual painted** coverage and flags pigments below meaningful presence. Adjust after comparing on actual BDU/ACU operators.

## Source material consulted

- French CCE: Arktis military camouflage/fabric directory and photographed CCE French military trousers: <https://cdn.asp.events/CLIENT_Nineteen_F7A1E73F_5056_B725_6BE81DEAAC036B43/sites/ETS2025/media/libraries/exhibitor-brochures/16552-Arktis%20Range%20Directory-V6.0.1.pdf>.
- VSR-93: documented Barvikha vertical early-1990s Russian uniform references, explicitly distinguish later Flora horizontal bands.
- Swiss TAZ 90: period Swiss uniform/fabric photographs; avoid TAZ16 and older red TAZ83 Alpenflage.
- British Desert DPM: UK military Desert DPM fabric and historical photographic records; British two-tone brush silhouette is essential.
- South Korean Granite B: Korean military pixelated camouflage uniforms, specifically disallow simple MARPAT recoloring.
- Indonesian Kopassus flowing-blood pattern: military Kopassus photos showing long organic ochre/olive/rust ribbons.
- CADPAT AR: Canadian Military Police history and photographs of the **adopted three-color** AR; distinguish initial four-color trials: <https://mpmuseum.org/securcadpat2.html>.
- USAF ABU: Airman Battle Uniform photographs showing subdued sage-gray horizontal *digital tiger* bands.

Photography is for visual fidelity only. **No photographed fabric or official bitmap is imported or duplicated**. CADPAT is a protected design family; the in-game print uses original pixel geometry, not official digital assets.

## Source integration contracts

- `src/operator-camo-batch-9a.ts`: six independent original 64px tiles and recipe metadata.
- `src/operator-camo-batch-9b.ts`: independently authored CADPAT AR and ABU digital designs.
- `src/operator-headwear-camo.ts`: immutable ID extension at end of existing 54, 64px sizes/densities, palette merging, special dispatch before legacy 8A.
- `src/operator-fabric-camo-materials.ts`: explicit garment metric repeats, never rescale the mesh UV geometry.
- `src/operator-headwear-camo-catalog.ts`: origin, terrain, style and era, including France / South Korea / Indonesia.
- `src/operator-uniform-cut-eligibility.ts` and `src/operator-fabric-camo-policy.ts`: period-correct BDU/ACU analogues, smock subset, guarded pack permissions; **no newly authorized plate carriers or rigs** without evidence.
- `src/operator-armor-rig-lab.ts`: opt-in `?camoCut=acu` only for fixed-light modern-uniform preview; no gameplay change.
- `operator-lab.html`, `src/operator-material-browser.ts`: adapt visible catalog count and favorite capacity from 54 to 62.
- Historic tests must retain original 6A/7A/8A **positions**, not incorrectly assert that the latest batch remains the final eight IDs.

## Rolling acceptance gate

1. Run `tests/operator-camo-batch9a9b.test.mjs`: all eight 64px tiles deterministic, opaque, 2–5 meaningful inks each, different original artwork, distinctive directionality for VSR/Kopassus/ABU, preserved 8F JGSDF and 8E S2000 RGBA SHA.
2. Preserve 54 historical items in original order and increment catalog to 62. No duplicate IDs, no saved-look migration, no work for each rendered frame.
3. Validate real BDU classic uniforms and modern ACU-compatible cuts, atlas scale and texture phase, favorites, catalog filters, and conservative field equipment/helmet eligibility.
4. Run only critical existing headwear/material/camo regression tests and TypeScript/Vite build.
5. Reuse one mobile Playwright workflow: **8 source masters + 32 actual cloth renders** (front/back × detail/gameplay, with matching BDU/ACU trousers).
6. When compatible stages pass, group into one 9A/9B release; merge only if previous Pages main deploy is successful and public **build stamp matches** and no other production merge is queued/running. Fix any blocker rather than piling releases.

## Stage commits

1. **9A artwork**: six organic, brush and first digital prints, distinct source masters.
2. **9B artwork**: adopted CADPAT AR and USAF ABU.
3. **9A/9B integration**: IDs/policy/metadata, headwear and cloth material scale.
4. **9A/9B QA**: fixed-cut visual review, focused regression, docs, compatibility audits.
5. **Release checkpoint**: one merge after all gates pass.

**Out of scope:** No immediate design changes to M98, JGSDF, S2000, or other approved older patterns; no new combat effect, shape family, animation or full-game regression suite.
