# Camouflage 7A — eight-pattern expansion, and Ukrainian MM-14 final fidelity pass
Branch: feature/operator-camo-7a-eight-patterns-mm14-20261104
Release checkpoint: 38 → 46 patterns, one production merge only after tests/deploy checks.

## Build order and stages
- S1 MM-14: replace neutral grayscale/empty ground with five dusty khaki/sage/olive inks, layered interlocking pixels and branch-shaped dark accents. Do not migrate the saved id.
- S2 MultiCam Black + Alpine: reuse the original MultiCam 32×32 canonical ink-index tile *exactly*, 2× expanded to 64×64 and density increased from 2 to 4 to preserve the same 16-world-unit motif period.
- S3 PenCott GreenZone + BadLands: one authored 64px hybrid three-scale fractal geometry, with overlapping large fields, midi stepped connected edges and deliberately confined micro speckle. Only palettes differ.
- S4 Desert Night: geometric 8px lattice plus sparse deep-green blotches (not woodland digital); KLMK Berezka: angled repeating bright olive/khaki sunray leaves; Kryptek Highlander: bold angular earth rocks and broken crossing fracture-net; Spectre SKWO: rugged forest-steppe broken strokes and crisp small cell accents.
- S5 Integrate all eight in source, catalog, headwear, garment/fabric, independent solid trim, armor/rig restrictions, 46-print UI and persistence, leaving game mechanics unchanged.
- S6 CI: node strip-types focused art and policy tests, TypeScript/Vite build. Optional mobile visual smoke (headwear/UI and gameplay zoom) when available. Commit every stage to feature branch; release only when previous Pages deployment succeeded.

## Rendering and legacy contracts
- Retain 30 original and 8 6A authored tiles, and MM-14's ID and seed. New 7A art is originally drawn via deterministic source-time raster rules; no scanned/proprietary print master.
- 64×64 tile per new ID, exact nearest-filtered RGBA in headwear UV1 and fabric world-space UV; one art identity for tops, trousers, nylon channels and swatches.
- MultiCam roles preserve an identical geometry even when colors change. PenCott pair shares its original authored index geometry independently from the MultiCam map. Other four families MUST use independent structural generators.
- Camo color fractions measured from actual pixels, not percentile-sorted noise. Headwear and garment scales are consciously calibrated and tested.
- Original 38 IDs and saved looks remain stable. Outfit health/equipment persistence rules unchanged.

## Authenticity and visual eligibility
- MC Black: modern field/LE garments, produced modern rigs/plates/packs. MC Alpine: overwhite/modern clothing, winter smocks and pack covers, no universal armor/rig assumptions.
- PenCott: manufactured modern uniform fabrics, smocks/BDUs and selected commercial nylon/rig cuts. Kryptek: commercial outerwear and selected tactical textile cuts.
- DNC: historic parka/overgarment and simple field trousers only. Never a general military plate carrier.
- Berezka: KLMK-like field clothing and Gorka reproductions; no modern plate covers. Spectre SKWO: field/Gorka cuts, compatible webbing, no presumed universal plate carriers.
- Modern helmet covers restricted to realistic 7A prints; older historic textiles remain on patrol caps/boonies and appropriate clothing.

## Critical QA
- Every new ID is discoverable and saved without migration; 38 original IDs remain stable and all 46 palettes/tiles resolve without missing colors.
- MultiCam byte-for-byte ink topology equivalence (2×), PenCott family topology equivalence but distinct from MultiCam.
- DNC lattice survives physical scale, Berezka sunray repetition clear, Highlander angular fracture overlay visible, Spectre distinct from EMR.
- 3D UV1/headwear, world-space trousers and gear channels share one master; reroll retains chosen scale.
- MM14 subdued olive and khaki palette, significant olive/digital area, no large pale slabs.
- Only critical appearance/texture/compatibility tests + tsc/Vite; no unrelated gameplay performance sweep.
