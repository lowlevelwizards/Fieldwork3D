# Fieldwork Breach — Universal Weapon Art & Production Standard

**Status:** Canonical production policy for new weapon families, variants, and substantial revisions to existing weapon art; WA2 adoption on the foundation branch, pending release.  
**Version:** 2.0 · 2026-11-25 (WA2 art direction; retains v1 technical contract)  
**Owner:** Arsenal / weapon appearance pipeline.  
**Companion documents:** [R2 silhouette contract](geometry-r2-silhouette-contract.md), [Arsenal V2 baseline](../../arsenal-v2-baseline.md), and the historical AR / AK / FAL / FNC / HK case studies in this directory.

> **Core rule:** Create a recognizable, authentic **miniature**, not a photorealistic weapon with fewer polygons. Build its identity from purposeful exterior masses, meaningful open space, clear proportions, and restrained materials. Optimize before ornamenting. **Actual game-scale visual approval, not passing code tests, determines whether art is done.**

## WA2 — Art direction 2.0: Graphic Miniature Realism

**Adoption:** Canonical art direction for WA3 onward, committed on the WA foundation branch. The technical requirements in sections 0–15 remain in force. This standard does not itself approve a weapon, change live artwork or authorize deployment. The WA0.4 initial assessment is not a final numerical rating.

### A. The signature
Authentic through interpretation, not replication. A Fieldwork weapon is a sculptural miniature: confident, compact, tactile, iconic and economical. Read the object as three or four dominant masses before noticing its individual marks. Its identity must survive the absence of labels, color, dramatic lighting and fine detail. Every extra form needs a visual reason.

**MUST** prioritize silhouette and negative space over detail; **SHOULD** prefer an integrated shape, rectangular defaults and broad decisive facets; **MAY** exaggerate a characteristic exterior proportion when the paired native-scale view proves improved identity. Never exaggerate everything at once. Simplicity means better selection of shapes, not lower fidelity of intent.

### B. Definitive calibration references
The following are **approved teaching references for specific strengths**, not fully art-approved weapons or frozen geometry. Source: [verified WA0 visual baseline](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/45750363645), revision `0f79ca66a2fe27eeabde9e304711892e5628142f`, artifact 15084818826. WA0.4 reviewed all 53 references; WA2 reviewed the selected multi-angle plate again. Paths below identify actual production renders in that archive. For each case, inspect the side-fit, three-quarter-fit, top-fit, front-fit, native-64 and native-128 PNGs. Do not silently substitute a different model or new render for the archived evidence.

| Reference / archive directory | What to study | What not to copy blindly |
|---|---|---|
| `fal/fal-5000-classic/` | Broad angular receiver/furniture, warm vs dark blocks, clear tapered outline | Thin handle and sight features; exact wedge is family-specific |
| `fnc/fnc-service/` | Integrated mass, sparse graphic marks, open rear outline | Reverse dark layers; atlas is optional, not a universal requirement |
| `g36/g36-service/` | Purposeful openings, long continuous modern form, clear graphic void | Do not transfer its characteristic architecture into unrelated families |
| `remington870/r870-police-wood/` | Continuous sculptural wood, bold separation of pump and receiver | Cylinder-dominant family shape is not a rifle template |
| `glock/glock-g19x/` | Planar economy, compact proportion, true guard opening, strong color block | Tan does not automatically establish adequate substrate separation |
| `ak/ak-akm/` | Strong sweeping silhouette, warmer material contrast, broad top facets | Do not require wood or the same color palette in modern variants |
| `ar15/ar-m4a1/` | Compact family identity and modular character | Repeating rail/rib density, interrupted junctions; review at native scale |
| `g3/hk-g3a4/` and `hk33/hk-hk53a3/` | Slender related family profiles | Thin rear forms and nearly identical dark masses can lose distinction |
| `mp5/hk-mp5k-pdw/` | Compact, unmistakable family silhouette | Dark central mass can conceal form; preserve its particular character |
| `beretta/beretta-m9a3/` | Distinct open-top and tan/dark exterior appearance | Busy rear/outline versus Glock; preview-only status remains |
| `legacy/legacy-shotgun/` | Negative example: disconnected-looking stack of blocks | Do not retire until compatibility and fallback callsites are reviewed |

A comparative example: the verified census shows AR mean 768 triangles, FAL 364, FNC 536, AK 360. The WA1 desktop smoke (run 45752149023) specifically shows FAL 50.00 at 366 triangles/26 meshes and M4A1 at 682 triangles/23 meshes in the same lab. These are different shapes with different needs; a smaller mesh count alone does not mean lower triangle cost or better art. The 53-reference aggregate is not a runtime scene budget.

### C. Form and depth grammar

| Rule | Decision and verification |
|---|---|
| C1 silhouette before ornament | Use monochrome fixed side and shared-scale peer comparisons. At 128px the family must be distinguishable; at 64px its defining mass relationships must survive. |
| C2 dominant / subordinate / accent | One coherent dominant body, subordinate furniture and silhouette elements, few accents. At native size the eye should read the largest forms first. |
| C3 rectangles until justified | Use clear rectangular and planar shapes first; introduce a broad facet only when it improves identity, depth or silhouette. No routine micro bevel/chamfer treatment. Verify top/front/three-quarter, not just side. |
| C4 contiguous, not stacked | Junctions should visually belong to the same object. Remove accidental layered slabs and fake spacer plates rather than adding detail to mask them. Compare real three-quarter artwork. |
| C5 purposeful negative space | Preserve real recognizable voids and meaningful outlines. Do not paint over a missing opening or turn an unrelated form into a universal box. |
| C6 selective caricature | Emphasize the most distinctive relationship of a family rather than uniform enlargement. Compare peer silhouettes and all visible depths. No blanket scaling or external functional specification. |
| C7 game-art scale | Primary and native sidearm comparison cohorts are distinct; cross-category calibration requires real operator context. Fitted thumbnails are not evidence of true relative size. WA15/16 resolve final in-game scale. |

### D. Surface grammar: four levels

| Tier | What belongs here | Treatment |
|---|---|---|
| 1 primary | Dominant exterior volumes and silhouette | Real geometry, economical coherent shape |
| 2 identity | Distinctive silhouette-bearing features and recognizable voids | Real geometry only where outline/depth warrants it |
| 3 graphic | Shallow seams, stamped/recessed graphic cues, sparse repeated marks | Prefer integrated UV artwork, simple opaque graphic regions, or genuinely justified batched detail |
| 4 micro | Small fasteners, fine bevels, tiny repeated ridges, dense ornament | Default remove if indistinguishable in native-size or context render |

For a mark, test the normal render against tagged-overlay-hidden and untextured diagnostic views. If removing it does not hurt identity or material perception at the target scale, remove it or use a more economical representation. Do not treat the no-texture view as an exact 'details only' toggle: it also removes other texture artwork; baked marks cannot always be independently hidden. Select line weight according to projected image size, not identical world-unit width across families. Favor a small number of readable dark shapes, even spacing with intentional asymmetry, no noise or outlines added solely for contrast. A pixel graphic must be face-correct, stable in minification, integrated with material lighting, and free of redundant overlays.

### E. Material language

Material is part of the silhouette hierarchy, not decoration applied at the end. The intended shared vocabulary below is **qualitative** until WA3 develops calibrated swatches in actual game lighting; no universal new hex values or shader tuning are authorized here.

| Role | Intended appearance | Avoid |
|---|---|---|
| Steel / dark metal | Broad, cool-to-neutral dark planar masses, restrained response | All steel indistinguishable from dark polymer; excessive specular edges |
| Polymer | Matte, tactile, somewhat distinct in value or hue from adjacent metal | Flat green-gray wash, tiny color variations for each part |
| Wood | Warm, quiet blocks with recognizable broad plane changes | Grain noise, photo texture, heavy procedural mottling |
| Resin / phenolic | Restrained warm, plum or dark hues where appropriate | Universal brown or saturated colors without variant evidence |
| Rubber | Simple muted dark region where it reads as separate material | Every dark part assigned the same identity |
| Paint / finish | Coherent intentional color blocks preserving substrate readability | Recoloring existing saved finishes without approval |
| Lens / smoked appearance | Restrained, graphic optical impression; existing low-cost representation first | Gratuitous transparency, depth artifacts, glows |

Evaluate neutral fill, shared studio, mirrored diagnostic and actual operator/live game contexts. Diagnostic fill can reveal geometry but cannot replace normal lighting acceptance. Distinguish substrate via value, hue and restrained response, not through arbitrary global brightening. WA14 controls condition/weathering; preserve clean/service appearance as a baseline. Existing palette remains authoritative until intentional, evidence-backed WA3+ changes.

### F. Exceptions and variant identity
- Long-gun visual trigger-guard convention: omission is the established default at Fieldwork scale. Keep only where already necessary to a distinctive exterior or presentation and documented; sidearms may retain simplified genuinely open guard shapes. This is an art convention, not a statement about real objects.
- FAL/FNC/G36 are teaching references, not exempt from improvement. G3/HK33/MP5 retain slimmer family character; do not indiscriminately bulk them to match FAL. Compact variants retain intentional differences rather than global downscaling.
- AR rail silhouettes, AK furniture and G36 apertures carry recognizable identity; a detail budget cannot override those defining forms. Their visual density is subject to the tier test.
- Historical proxies retain proxy labels. Beretta remains preview-only. Legacy shotgun remains until WA10 demonstrates safe retirement/reconciliation. Existing approved saved finishes and IDs remain stable.
- New exceptions record rule ID, affected reference IDs, visible benefit, evidence paths, cost and technical impact, approving reviewer and revisit stage. An exception to an art preference is not an exception to compatibility, state integrity or safety.

### G. Evaluation rubric and evidence
Score each category 0–5 only when its required evidence has actually been reviewed: 0 = fails, 1 = major work, 2 = substantial refinement, 3 = adequate, 4 = strong, 5 = benchmark-quality for that category. **Unknown is null, not 0 or a passing result.** Weighted total is sum(weight * score/5) only when all eight categories have evidence.

| Category | Weight | Required evidence |
|---|---:|---|
| Silhouette and identity | 25 | Monochrome side/peer, 128px and 64px |
| Cohesion / Fieldwork signature | 20 | Same-scale peers, integrated shapes, actual A/B |
| Proportion and depth | 15 | Side, opposite, top, front, three-quarter, real operator framing |
| Geometry economy | 10 | Actual geometry census, measured isolated submissions, justified cost deltas |
| Material character | 10 | Normal, neutral/mirrored, actual lighting and role diagnostics |
| Graphic detail | 10 | Native images, marked/hidden and untextured comparison with limitations |
| Variant/accessory consistency | 5 | Representative valid factory/custom/attachment comparisons |
| Cross-context readability | 5 | Arsenal, Operator Lab and actual relevant gameplay context |

Thresholds are working review policy, not claims about existing model scores: 85+ candidate for sign-off, 70–84 targeted refinement, below 70 substantial revision. No candidate is approved if identity, cohesion or proportions score below 3, if any evidence is missing, or if independent hard gates fail. Technical regressions cannot be offset by a high visual score. Final human visual sign-off remains mandatory. WA0.4 qualitative dispositions remain valid input; weighted totals for existing models stay unassigned until full calibrated evidence review. Do not retroactively score from screenshots alone where a rubric category needs additional evidence.

### H. WA3+ execution checklist
1. Select the WA0.4 reference, disposition and affected families/parts. Preserve a revision-tagged baseline and specify what must improve.
2. Compare the actual production silhouette against the relevant calibration reference, then make an isolated shape/material study with explicit scope. No new functional/internal modeling.
3. Evaluate at fixed scale and fitted close-up, all required angles, 64/128px, ordinary material and actual operator context; report archive path and revision.
4. Apply tier test and shared material semantics; capture before/after metrics and explain every increase, unchanged cost or reduction.
5. Verify production-path parity, all applicable saved/variant/attachment/pose contracts, resource ownership and critical tests using sections 7–14. Keep gameplay unchanged.
6. Record score evidence and unknowns, exceptions, remaining findings and sign-off. Stage commits by family, combine compatible batches, verify prior deployment before merge and verify production after deployment. Do not declare the release complete solely because CI passed.

**WA handoff:** WA3 establishes the shared art vocabulary and calibrated swatches using actual render comparisons; WA4/5 calibrate benchmark families; WA6/8/9 prioritize AR and HK drift; WA7 retains AK identity; WA10 reconciles legacy shotgun safely; WA11 sidearms; WA12/13 accessory, custom and material coverage; WA14 condition; WA15/16 context; WA17 optimization; WA18 final audit. No new geometry, finish changes or live menu changes in WA2.

## 0. Applicability, precedence, and language

- **MUST** denotes a production requirement; **SHOULD** denotes the default unless a documented visual/technical reason justifies an exception; **MAY** denotes an optional technique.
- This standard governs all future weapon art, including historical reference previews, Arsenal, Operator Studio, live operators, dropped weapons, and replay/debrief. It also guides **opportunistic consolidation and improvement of existing models**; no previously approved family (FAL/FNC included) is aesthetically frozen or exempt.
- Existing factory IDs, recipe serialization, gameplay boundaries, and active coordinate contracts remain authoritative **until explicitly migrated and regression-tested**. A style pass is not permission for an implicit save or simulation migration.
- The per-family historical documents record what worked at the time; **this standard takes precedence for new production** when old documents contain obsolete universal assertions. In particular, **do not assume every rifle ends at local X=19.5**: FNC uses 19.5 while full-size FAL uses 22; variant-specific muzzle endpoints belong to authoritative barrel-art/assembly data.
- No claim of historical exactness, visual approval, geometry absence, performance success, or deployment success without corresponding evidence. This document establishes policy, not approval of any particular new weapon.

## 1. Art identity and hierarchy

**Style adjectives:** chunky · compact · angular · graphic · iconic · authentic in identity · economical in construction.

The priorities below are strict. Fix a higher priority before investing in a lower one:

1. **Primary silhouette:** length, receiver/stock/fore-end relationships, magazine outline, sights/handle and muzzle profile.
2. **Secondary structure:** physical attachment of receiver, stock, grip, magazine well, handguard and barrel; characteristic protrusions and actual openings.
3. **Depth and volume:** believable front/top/three-quarter envelope; readable widths, thicknesses and purposeful planar facets.
4. **Material separation:** steel vs polymer vs wood vs rubber/paint, with a coherent shared Arsenal value/color range.
5. **Tertiary markings:** broad vents, receiver seams, molded grooves, shallow ports and restrained controls.
6. **Optional micro-detail:** generally omitted. A tiny feature is not justification for a new mesh if it vanishes at playing distance.

A weapon MUST be distinguishable **without labels, finishes, bright highlights, bespoke camera framing or extra surface ornament**. An isolated outline that looks generic is not ready for materials.

## 2. Research and reference lock

Before blockout, record:

- Specific model, variant, date/period where applicable, historical reference purpose and whether the model is factory-standard, service-representative or custom.
- Credible image/source links (source, title, date when known). Prefer side, opposite side, three-quarter, top and front. Mark absent evidence **unknown**, not assumed.
- Five to seven **identity landmarks** and three to five **prohibited confusions** relative to nearby Arsenal weapons.
- Only relative external visual proportions from references. Game-art coordinates are not firearm production dimensions or functional assembly instructions.
- Distinguish three claims: **modeled** (a valid in-game preset exists), **representative** (appropriate family/era approximation), **exact** (specific configuration verified). Existence in the art catalog alone does not establish historical issuance or exact fidelity.
- Define an explicit **scope and variant budget**. A family planning bucket does not authorize a sprawling set of shallow or cosmetically cloned variants.

If reliable evidence cannot distinguish a proposed period variant, keep it a research candidate or correctly labeled preview proxy; do not fabricate a factory name or equipment assignment.

## 3. Silhouette, proportions, and exaggeration

### 3.1 Deliberate caricature, not uniform enlargement

- Exaggerate **relationships**, such as open-frame stock struts vs void, receiver-to-handguard mass, sight height vs receiver, or distinctive magazine sweep.
- Prefer a few decisive shape changes over dozens of 5–10% adjustments. Compare the **actual projected silhouette** at identical scale and framing before asserting an improvement.
- Keep exposed barrels, furniture length, receiver mass, magazine scale, front/rear sight spacing and stock width proportional **to one another**. Do not enlarge all of them simultaneously.
- Side view is the first identity test; top/front and three-quarter are mandatory checks against wafer-thin geometry, floating hardware and excessive thickness.
- Keep silhouette-bearing openings **physically open**: carry handles, triangle/skeletal stocks, sight guards and other essential holes cannot be imitated solely with painted dark rectangles.
- Do not thicken a family into a generic boxy form: the G3 remains slim/tubular, FAL wedge/humpback, AK distinctive stock/mag/fore-end, AR variant-specific furniture, FNC stamped receiver and open stock. These are illustrative differences, **not protected model palettes**.

### 3.2 One coherent structure

- Big shapes should join with credible **overlap and continuity**; a bounding-box overlap assertion is necessary but not sufficient. Confirm the junction is visually plausible in a real three-quarter render.
- Prefer one integrated receiver/lower or tapered fore-end shape over stacked slabs, disguised spacers, face-coincident plates, and unnecessary connector meshes.
- Do not let the magazine float, pass through the receiver wall, look undersized relative to the mouth, or acquire an enormous decorative well to conceal an incorrect insertion position.
- The stock's hinge, frame, pad and rear contact must form one coherent object; preserve the true silhouette void while strengthening struts where game-scale readability requires.
- Distinct side-only controls/ports should be side-correct without mirroring identical details onto both faces.

### 3.3 Relative scale policy

- Use **the real production builders** for comparison, not recreated lookalikes; match camera, lighting, art-unit scale and framing policy.
- Factory/variant length differences must derive from changed body anatomy and correctly authored barrel art—not solely an arbitrary scale factor.
- Keep a table of art landmarks for each family and variant: receiver bounds, stock contact, handguard start/end, sight bounds, magazine center/top, grip contacts, muzzle axis/end.
- Treat measurements as **internal art datums**. Derive both mesh and presentation contacts from a shared source wherever possible; changing one independently is a regression.

## 4. Geometry vocabulary and construction method

Preferred existing primitive helpers live in `src/weapons/geometry/profile-primitives.ts`:

| Need | Preferred construction | Avoid |
| --- | --- | --- |
| Receiver, stock, grip, magazine | One low-vertex XY outline extruded through Z | Stacks of nearly coincident boxes |
| Boxy true forms (pads, hinge) | Simple cuboid | Decorative bevel rings |
| Barrel, muzzle, collar | 6- or 8-facet tube/prism | Unnecessary round high-segment cylinders |
| Tapered shell / roof | Few deliberate stations or broad faceted extrusion | Dense bevel ladders and tiny facets |
| Open handle/stock | True frame/open-profile geometry | Solid slab with a painted hole |
| Repeated shallow surface marks | Batched geometry or UV-mapped pixel atlas | One draw call per dot, screw or vent |

- Most major side outlines SHOULD use approximately **4–10 purposeful corners**. The existing outline helper allows 3–12; exceed the normal shape economy only with documented visual benefit.
- Construct native geometry on **configuration creation/change**, not per animation or render frame. Keep part builders deterministic and free of hidden global scene mutations.
- Preserve stable part naming: `family-{slot}-{partId}-{index}` for the six slots, so Arsenal bounds, editing and tests can identify real components.
- Retain the original side/front/depth contract while making authorized structural changes; don't remove meaningful negative spaces just to meet a triangle number.
- Prefer **reusing actual shared shapes** (e.g. common real magazine/furniture geometry) over copied parameter sets. Reuse must remain historically and visually valid: similar cartridge or manufacturer alone is not compatibility evidence.

## 5. Material and color policy

Authoritative palette: `src/weapons/geometry/weapon-visual-palette.ts`.

- Reuse shared immutable matte steel, polymer, wood, magazine and dark muzzle identities when they produce the intended look. New colors/materials require an explained **visual role**, not a barely distinguishable per-part hex variant.
- Distinguish material types with restrained roughness, metallic response and broad value contrast; do not lean on saturated colors, glowing edge highlights or heavy specular effects.
- Existing references: HK dark polymer `#303433`, FAL polymer `#343D37`, HK blackened metal `#3B4140`, HK dark muzzle `#2F3533`, olive polymer `#60694E`. These are **palette anchors, not immutable aesthetic protections**.
- Large material blocks must still read coherently under shared Gallery/Workbench/Studio/gameplay lighting; evaluate monochrome first, then actual materials.
- Plastic/translucent-looking magazines MAY use inexpensive opaque/faceted shading illusions first; actual alpha transparency needs proof of visual benefit and no depth/sorting regressions.
- No family-specific lighting rig, material recoloring hack, standalone shader framework, or per-frame `MeshStandardMaterial` allocation simply to make a weapon read.
- Consolidation of existing materials is encouraged if visual parity, stable saved finishes, material tags and affected neighboring models are explicitly tested. Never silently recolor a saved build.

## 6. Details and texture economy

**Physical geometry** is reserved for surfaces that change outline, silhouette void, thickness, contact or recognizable mechanical construction.

**Pixel/atlas markings** are suitable for shallow slots, seams, molded flutes, ejection graphics and understated stamps, **when they improve readability**.

The FNC P21 method is the proven reference:

1. Author a single **lazily shared, deterministic** low-resolution texture atlas.
2. Project marks onto existing geometry with stable, face-correct UVs.
3. Use nearest filtering for the authored pixel graphic and appropriate minification handling for gameplay scale.
4. Keep non-marked texels neutral so native material tint, shadows and scene lighting remain intact.
5. Cache any mapped material variant **once per source material**, not per weapon/frame.
6. Delete redundant overlay meshes instead of replacing them with dummy transparent quads.
7. Check left/right/up face orientation, stretch and seams after any shape revision.

An atlas is **an option, not mandatory**. A clean weapon should not be forced to carry an extra texture if it needs no meaningful marks.

## 7. Families, modularity, and visual identity

- Preserve the current six body slots: `receiver`, `stock`, `grip`, `magazine`, `handguard`, `barrel`.
- `WeaponFamily` is an **appearance identity**, not a universal physical part interchangeability assertion. Arsenal browse platforms may be more specific than renderer family groupings.
- Every factory preset must select a complete, compatible, validated body. Define only genuinely authored parts; don't create dozens of placeholder options.
- Variant names must correspond to a **recognizable real silhouette/material/part distinction** with evidence. A compact is not a uniform scale-down, and a historical version is not a modern receiver with a color swap.
- Share approved core geometry between true variants; keep explicitly different stocks, fore-ends, top assemblies, barrel/muzzle profiles and magazine identities separate where needed.
- Reuse standard profiles only when appropriate (e.g. FNC/AR STANAG where validated), without assuming all 5.56 platforms accept the same magazine. Visual feed identity and actual gameplay ammo logic remain separate.
- Keep existing factory/save IDs stable; new variants add their own IDs. When an art change genuinely needs an ID migration or compatibility expansion, scope it separately and test legacy recipes.
- Integrated sights, rails, stocks, and suppressor-like exterior forms require explicit attachment gating: do not display physically incompatible or duplicated accessory geometry.

## 8. Authoritative presentation / animation integration

Production rendering follows **one visual source of truth**:

`equipment-weapon-families.ts` + `equipment-weapon-assemblies.ts` → `breach-modular-weapon-geometry.ts` → `breach-weapon-geometry.ts` → Arsenal, Studio, operators, dropped weapons and replay.

- Never create a lab-only geometry version that visually diverges from production. The lab may **invoke the same builder** with comparison material overrides and camera controls.
- The visual stock, primary grip, support-hand fore-end, magazine body/socket, sights, muzzle tip and attachment mounts must align to **the same assembled weapon**.
- `resolveWeaponAssembly()` and per-family barrel art own pose/shot muzzle alignment. Variant-specific local muzzle endpoints and length scale are legal; changing one requires all dependent presentation checks.
- `breach-weapon-contact-zones.ts` should use the actual usable handguard extent, **not a longer exposed gas assembly** or generic receiver AABB.
- Verify aim, ready, high/low-ready, short-stock, movement, right/left presentation, magazine detach/insert, and optional muzzle device paths. Check contact against armor and hands in operator scale.
- Geometry must not alter ammunition, capacity, firing outcomes, damage, inventory, ownership, or reload timings under an art-only milestone. Visual magazines may have their own authored identity without taking authority over gameplay ammo.
- Builder cleanup must dispose geometry and weapon-owned resources without accidentally disposing shared palette/atlas assets still used by other weapons.

## 9. Performance targets and mandatory measurement

**Targets are comparative budgets, not universal hard caps.** A real silhouette feature may justify a measured exception.

- Initial monochrome blockout: approximately **10–18 meshes**, minimal faces.
- Typical completed factory rifle: aim for **roughly 20–28 mesh objects** and **400–550 emitted triangles**; accept lower when forms permit.
- A model exceeding approximately **32 meshes or 600 triangles** merits a specific audit of high-cost parts and whether their visual benefit is present at normal scale. These are **review triggers, not automatic failures**.
- Use `scripts/audit-weapon-geometry.mjs` to measure emitted triangle counts, meshes, buffer vertices, geometries and per-part cost from the **real production builder**, not source-point counts, guessed draw calls or 2D illustrations.
- Compare both **absolute metrics and the before/after delta** with the nearest relevant family/variant; verify actual draw calls/allocations separately when meaningful.
- No frame-loop mesh/material/atlas construction; do not add an animation callback, perpetual preview render, or expensive lighting/shadow pass for a weapon.
- Cache genuinely identical immutable resources; avoid indiscriminate merging where it destroys interactive six-slot selection, correct finish groups, material roles or safe disposal.
- A topology reduction is successful only when geometry is actually eliminated **and** no defining silhouette or contact is harmed.

**Documented historical examples (not live counts for the current main branch):**

| Milestone | Measured emitted triangles / meshes | Lesson |
| --- | --- | --- |
| FAL P5 before reduction | 686 / 25 | Too many receiver/crown faces; prioritize shape economy |
| FAL P8 | 366 / 26 | Large-form clarity survives major topology reduction |
| FNC P19 | 648 / 33 | Overcomplicated high-cost receiver/fore-end |
| FNC P20 | 588 / 32 | Simplification removed 60 triangles and one mesh |
| FNC P21 | 512 / 24 | Atlas moved shallow marks off geometry, preserving silhouette |
| FNC P24/P25 | 536 / 23 | Additional meaningful silhouette mass without additional draw meshes |
| Peer P19 baseline G3A3 | 490 / 24 | Useful comparable factory rifle |
| Peer P19 baseline M16A2 | 466 / 26 | Useful comparable factory rifle |
| Peer P19 baseline AKM | 352 / 24 | Useful comparable factory rifle |

Use new measured results for each production batch; do not claim these legacy checkpoints are exact current assets.

## 10. Staged production workflow and stop gates

### Stage A — audit and reference
**Produce:** existing-asset check, dated variant references, silhouette landmarks, reference/variant boundaries, similar-Arsenal comparison set, intended reuse, initial risks.  
**Stop if:** a suitable asset already exists but hasn't been inspected, model identity is ambiguous, or the configuration is historically ungrounded.

### Stage B — isolated monochrome blockout
**Produce:** working actual-geometry comparison builder, side/three-quarter/top/front/opposite captures under a common scale, coarse art landmark table. No Arsenal/catalog/issued gear changes.  
**Stop if:** the target cannot be recognized at 128px without color or it confuses with existing neighbors.

### Stage C — structural refinement and topology review
**Produce:** coherent joined receiver/stock/fore-end/magazine/sights, true openings, no unsupported floaters, real triangle/mesh audit.  
**Stop if:** changes merely introduce micro-detail, duplicate hidden plates or improve numerical bounds without visible improvement.

### Stage D — finish, restrained details, family core
**Produce:** shared material mapping, optional atlas/batched marks, six-slot part names, optional validated variants built on genuine common parts.  
**Stop if:** color is being used to rescue a wrong silhouette or a proposed variant is only a recolor/global scale change.

### Stage E — functional presentation and catalog
**Produce:** complete valid factory preset; Arsenal/workbench/Studio/game/replay parity; stock/hand/magazine/muzzle/sight/accessory contact checks; serial/save compatibility evidence.  
**Stop if:** any surface renders a different model, grips miss geometry, duplicated accessories appear or art changes combat/inventory semantics.

### Stage F — validation, art sign-off and release
**Produce:** focused tests + TS/build; actual WebGL desktop/mobile screenshots, performance delta, peer comparisons, sign-off/remaining issues record, logical release batch.  
**Stop if:** tests pass but the visual art fails, old saves break, geometry leaks, the previous public Pages build is unverified, or deployment is queued/in progress.

Separate stage commits are encouraged. Merge related compatible stages at a release checkpoint; do not merge every small artistic iteration. Verify preceding production deployment and public build stamp, then verify the new build stamp after release. Fix failed deployment before starting another.

## 11. Standard contact-sheet / acceptance evidence

For **every newly finished factory variant**, attach or link all of:

1. Monochrome side (stock left, muzzle right), with **same-scale real peer models**.
2. Real three-quarter and opposite-side images with ordinary materials.
3. Top/front views checking depth, rails, sight width, embedded/floating details and left/right asymmetry.
4. At **64px and 128px**, ordinary Arsenal gallery tile and mobile Workbench size.
5. Operator-held aim/ready/low/high-ready/short-stock, ideally in tactical camera distance.
6. Reload/magazine and muzzle-device alternatives; clipping/intersection inspection.
7. Before/after view with pinned prior art, matching camera/scale/background, for any material alteration to an existing family.
8. Geometry metrics with emitted triangles/meshes by part and visible effects of any optimizations.

Visual captures should be from real WebGL/game models. Source-coordinate plots, screenshots from a different asset, and capture existence alone **do not constitute art review**. Record reviewer, date, variant, observations, approval or required changes. If visual inspection is unavailable, label it **pending**, never auto-approved.

## 12. Focused tests and regression boundaries

Use or extend only the critical tests needed for the changed surfaces:

- Family/preset completeness, compatibility, serialization, saved-build round-trip and stable IDs.
- Unique visual/geometry identities, open frame gaps, silhouette extrema, front/side depth, factory vs non-factory muzzle and attachment gating.
- Contact extrema and shared magazine socket/held profile, plus stock, fore-end and shot-time muzzle parity.
- Shader/material identity, atlas sampling, side-appropriate UV and resource cleanup.
- Measured polygon/mesh counts and no unrelated family visual diffs.
- Selected Arsenal, Operator Studio, actual-game render and mobile screenshot smoke; TypeScript and production Vite build.
- Historical faction-preview fidelity changes **only after actual corresponding model and period verification**.

Automated numeric checks should express **durable relationships** (e.g. true mouth clearance, connected stock, sight guard opening, one authoritative muzzle) rather than freezing mistaken coordinates forever. When an approved change moves an art datum, update tests without deleting coverage of the underlying invariant.

## 13. Anti-patterns: do not repeat

1. **P2-style polish without changed identity:** old FAL/G3 silhouettes stayed nearly identical while adding bevels and little features.
2. **P17-style invisible tweaks:** numerically distinct FNC changes were barely visible at normal Workbench scale; require a paired native-scale image before approval.
3. **Overcaricature without proportional control:** later FNC revisions had to slim an oversize crown, polymer fore-end and stock components. Exaggerate selectively, then recheck the whole gun.
4. **Disconnected junctions:** avoid floating handguard connectors, raised gas-box fins, duplicate sight pedestals, material strips concealing air gaps.
5. **Geometry-as-decal:** a separate object for every vent/seam. Batch, reuse, atlas or delete.
6. **False exactness:** one generic rifle or armor proxy must not erase a national/dated equipment gap.
7. **Premature broad family rollout:** build one excellent master variant before proliferating shallow alternatives.
8. **Green CI equals visual approval:** never substitute tests or screenshot generation for human inspection.
9. **Protected favorites:** aesthetic quality is evaluated across the entire arsenal; FAL/FNC/AR/AK/HK can all be revisited when a scoped, measured, cross-family improvement is justified.
10. **Saving polygons at any cost:** preserve the characteristic opening, contour, sight and material hierarchy even when an exception is needed.

## 14. Definition of done — compact approval checklist

A weapon/variant may be called **ART APPROVED** only when:

- [ ] Specific variant and provenance are recorded; proxy/representative/exact assertions are supported.
- [ ] Same-scale, untextured silhouette is independently recognizable at 128px; 64px still carries its most important identity.
- [ ] Major masses join coherently and open structural gaps remain genuinely open.
- [ ] Proportions and depth remain credible from side/opposite/top/front/three-quarter and the tactical camera.
- [ ] Materials reuse/consolidate approved shared roles and remain legible in real in-game lighting.
- [ ] Surface details either contribute visible value or have been removed/batched/atlased.
- [ ] Actual emitted triangles, meshes and geometry/texture lifetimes have been audited.
- [ ] All six appearance slots, magazine/attachment compatibility, stock/contact/muzzle/poses and factory variants validate.
- [ ] Arsenal, Studio, live rig, dropped weapon, replay and reference previews use the same model.
- [ ] Gameplay class, ammunition, ownership, saves and historic fidelity remain correct and intentional.
- [ ] Real desktop/mobile WebGL contact sheets are reviewed, with explicit human sign-off.
- [ ] Focused regression tests, TypeScript, production build and production release gates pass before merge/deploy.

**A missing checkbox is a blocker or an explicitly documented, approved exception; it is not silently interpreted as satisfied.**

## 15. Practical implementation references

| Purpose | Current source |
| --- | --- |
| Low-poly primitives | `src/weapons/geometry/profile-primitives.ts` |
| Shared graphic material roles | `src/weapons/geometry/weapon-visual-palette.ts` |
| Six-slot body catalog and part rules | `src/equipment-weapon-families.ts` |
| Resolved assembly/contact, muzzle and accessories | `src/equipment-weapon-assemblies.ts` |
| Family silhouette dispatch | `src/breach-modular-weapon-geometry.ts` |
| Canonical weapon rendering / disposal | `src/breach-weapon-geometry.ts` |
| Arsenal browsing/identity and reversible edits | `src/arsenal/catalog.ts`, `src/arsenal/compatibility.ts` |
| Arsenal camera and shared light | `src/arsenal/viewport.ts`, `src/arsenal/inspection-lighting.ts` |
| Rifle hand contact | `src/breach-weapon-contact-zones.ts` |
| Measured geometry report | `scripts/audit-weapon-geometry.mjs` |
| Proven simple blockout method | `docs/art/weapons/fal-stage1-silhouette-spec.md` |
| Shape reduction evidence | `docs/art/weapons/fal-p6-shape-economy.md` |
| FNC small-scale silhouette correction | `docs/art/weapons/fnc-p18-silhouette-first-spec.md` |
| FNC texture-atlas method | `docs/art/weapons/fnc-p21-pixel-surface-atlas.md` |
| FNC proportion correction | `docs/art/weapons/fnc-p29-vertical-proportions.md` |
| AR and AK differentiation | `docs/art/weapons/ar-r46-silhouette-spec.md`, `docs/art/weapons/ak-r43-silhouette-spec.md` |
| HK/G3 isolation and regression | `docs/art/weapons/hk-g3-family-scope-audit-2026-11-15.md` |

### Maintenance rule

Update this **single canonical file** when a verified production lesson changes the universal methodology. Keep weapon-specific shapes, art coordinates, dates, milestone results, and performance numbers in their own family specifications. For a universal policy revision, record the rationale, affected existing families, tests and evidence; do not silently promote one weapon's convenience into a global rule.
