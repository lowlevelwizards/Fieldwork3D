# Fieldwork palette: curated audit and implementation recommendations

This is a **review of real source colors**, not a palette redesign or a runtime screenshot test. For the complete machine-readable ledger, see [all-unique-colors.csv](all-unique-colors.csv) and [all-color-uses.csv](all-color-uses.csv).

## What the census actually says

- All 528 scanned source and page files: **2,603** authored literal occurrences, **2,295** distinct normalized RGB colors.
- Statically reachable primary tactical entry (index.html + imports): **391** files, **1,714** occurrences, **1,564** unique RGB.
- Among Breach-reachable colors, **577** meet a broad same-domain visual-neighbor threshold (<0.022 OKLab), and **364** meet a much closer threshold (<0.006). **These are review queues, not safe automatic merges.**
- **1,474** Breach RGB values occur once in the reachable code. Source rarity is not runtime visual rarity; a one-time building paint definition may cover an entire map.
- Among core UI-only colors, **460** RGB values appear, **324** broadly similar to another source color and **226** extremely close. Local UI one-off hues are the clearest first consolidation target.
- The most concentrated source files: breach-style.css (303 distinct colors), building-palettes.ts (232), breach-main.ts (194), breach-3d.ts (153), operator-headwear-camo.ts (100). Not all of these should be consolidated.

## Criteria: each color needs a reason

Retain a distinct color only if it materially contributes to a **semantic tactical signal**, **interface readability**, **physical material or depth**, **recognizable gear/garment identity**, **historically identifiable camouflage**, **a distinct architectural atmosphere**, or **meaningful natural/character variation**. Otherwise map it to a named shared role. Never decide solely by a small numeric distance.

## First actionable merge table

| Actual source values | Finding | Decision |
|---|---|---|
| Headwear black #292e2d; garment black #292f2d | One-channel variation of the same named identity | **Merge base reference**; keep material-specific finishing |
| UI sage #a7b995; #a8b995 | One-channel difference with the same sage role | **Merge into shared sage UI token** |
| UI panels #294239; #284239 | Extremely close medium-green panel values | **Merge after checking same visual state** |
| UI panels #182c27; #192c27 | Nearly identical deep panels | **Use common deep-surface role**, but retain opacity variation |
| Clinic scheme trim #f0f2e9; #f1f2ea | Very close white trims in adjacent schemes | **Strong architectural merge candidate** |
| Signage cream #f0e6cc; #f0e6cd | One-channel difference across authored sign art | **Merge neutral ink**, preserve sign motifs |
| Headwear foliage #909987; fabric foliage #8a9388 | Same named equipment color, different base values | **Compare material renders** before aligning |
| Headwear olive drab #686d4e; garment OD #646c49 | Same named equipment family | **Harmonize base** if the rendered materials remain readable |
| Headwear coyote #887054; garment coyote #927557 | Related but more distinguishable | **Review**, do not blindly overwrite |
| Garment nutria #937b58; eyewear tan #937b59 | Identical perceptually, semantically different materials | **Share reference color if desired**, preserve separate option names |
| Gorka, combat shirt and smock local olive/black/khaki | Duplicates official garment color families | **Reference fabric family tokens** but keep contrasting panels |
| Flashbang targeting #f0af55; #dca053; #c88d4e | Warm target strokes/fills vary by view and state | **Define shared semantic roles** for ring/selected fill across 2D/3D, not a single flat color |

## Rare color outliers: real exception or unnecessary variation?

| Color | Where | Interpretation | Verdict |
|---|---|---|---|
| #b2226f | breach-fog-mask.ts diagnostic palette mode | Magenta is an intentional unmistakable debug signal | **Keep debug-only**; not normal game fog |
| #b2883a | operator-head-accessory-catalog.ts | Amber eyewear lens with separate alpha and tint | **Keep** genuine material identity |
| #ff9b73 | breach-3d.ts | Distinguishes opposing-side tracer flashes from friendly light | **Keep** tactical distinction |
| #a65a4e | breach-3d.ts | Blood impact tone | **Keep** different semantic feedback |
| #9c473a | rendering/pixel-signage.ts | Sale/signage red ink | **Keep** where tiny pixel readability warrants |
| #f0af55, #dca053 | breach-main.ts | Flashbang destination ring and center | **Keep 2-tone hierarchy**; coordinate 3D equivalent |
| #c88d4e | breach-main.ts | Flash destination inner dot in another view | **Align related role**, check backgrounds and contrast |
| #b18a48 | rendering/pixel-signage.ts | Safety/wayfinding ink | **Keep if legible** as functional environmental detail |

A rare color is not an error when it communicates a unique action, material, light source, state or environment. A near-identical dark green appearing on the sixth menu panel, however, needs a named role or it should be replaced.

## Palette boundaries to keep

**Interface:** use the existing fieldwork-design.css variables as shared authority, especially background #111d1c, panel #223631, raised #2d423c, deep #172825, text #e6e8da, muted #afc0b1, sage #a7b995, mint #9fccc4, brass #cfb184, warning #cc907d and focus #f1cd97. Reduce anonymous shades first; distinct text, danger, active, selection and focus roles remain legitimate.

**Operator solids:** headwear currently offers 12 curated color options and garment fabric 16. These are *different selections*, not necessarily 28 distinct base paint values. Align same-name neutral/earth families where practical, retaining material-dependent surface variation, selection eligibility and believable real-world colors.

**Camouflage:** preserve pattern-specific ink ratio, shape language, contrast and recognizability. The census finds 220 distinct source RGB values in the camouflage domain. Do **not** merge those solely because they look close to another pattern's inks.

**People:** preserve the 10 skin tone and 8 hair tone identities. A single definition may populate many operators; source-use rarity does not invalidate it.

**Architecture:** 12 archetypes × 3 intentional building schemes should remain recognizable, including warm/cool and pristine/aged distinction. Consolidate only almost indistinguishable colors performing the **same role** (e.g., trim-to-trim or grout-to-grout). Scheme diversity is not unnecessary redundancy.

**Combat/replay:** use one cross-view semantic vocabulary for route, watch, aim, enemy/friendly, flash, warning and debug. Preserve color difference where it changes tactical legibility.

## Safe implementation order

1. **UI theme refactor:** assign roles to each actively used style; replace exact and one-channel duplicates; retain focus, contrast and state distinction. Start with breach-style.css, ux-r1-sheets.css and campaign-style.css. This offers the clearest visible cohesion.
2. **Gear family harmonization:** consolidate same-named shared base colors across headwear, garments, armor, pouches and eyewear. Do not change camouflage indexed masters.
3. **Cross-view feedback:** unify 2D/isometric flash, route, watch, selection and tracer tokens with separate outline/fill/lightness states.
4. **Architecture/prop palette review:** same-role near-duplicate consolidation within matching site style; review signage at actual pixel scale.
5. **Visual approval gate:** test representative operators and gear, a house/clinic/warehouse, bright/dim light, fog/contacts/replay, and a range of printed patterns. Compare screenshots before/after with no changes to pattern silhouette/ratios.
6. **Runtime audit:** inspect generated mixtures, wear, gradients, HSL, illumination and alpha. These are not all countable as fixed authored hex colors.

No color changes were applied to the game. The exhaustive files document source locations, current occurrence counts, provisional justification, rarity, nearby RGB values and protected-versus-review disposition. **Distance flags require a human semantics-and-visual check; automatic global find-and-replace is inappropriate.**
