# WA0.4 — Visual assessment and artwork overhaul backlog
Baseline 0f79ca66a2fe27eeabde9e304711892e5628142f, Actions run 45750363645, artifact 15084818826. WA0.2 census run 45749779131. WA0.3 generated 656 weapon PNGs across 101 rows plus 106 operator context images. All 41 non-factory part IDs found valid representative hosts. Visual review performed on all 53 side, reverse, three-quarter and 64px panels (contact-sheet scale), all 48 supplementary three-quarter panels, all 53 operator side panels and a representative 12-family gameplay-camera overview. Not every full-resolution top/front or gameplay panel inspected; no comprehensive material isolation or live mission performance claim. Baseline artifact retained 90 days; archive before expiration. No production artwork changes.

## Cross-family findings
1. Strong shared identity already exists: low-frequency faceted masses, graphic dark recesses, exaggerated furniture, purposeful silhouette breaks. Do not homogenize families. FAL/FNC/G36/870/Glock are calibration candidates; AK is a complementary benchmark for recognizable silhouette and color.
2. Reverse images often become almost black compared with lit-side images. This is a capture lighting limitation, not proof of absent artwork. WA1 needs locked world lighting plus selectable mirrored inspection key or neutral diagnostic fill, clearly marked in metadata. Do not brighten all game materials to compensate.
3. The AR has the highest mean triangles (768 vs FAL 364, AK 360) and visibly dense repeating raised rails/ribs. Simplify only where the actual view and metrics support it; no blanket target or functional redesign. G3/HK33/MP5 have closely related, very dark boxy central masses and thin retracting stock silhouettes; differentiate their exterior graphic language while retaining family resemblance.
4. Polymer and steel often collapse to similar dark green values, especially in operator context; AK warm/plum finishes and 870 wood are useful counterexamples. G19X/M9A3 tan variants show the need for value hierarchy independent of hue. Establish shared substrate distinctions, not uniform colors. Preserve distinct finishes.
5. At native 64px and operator scale, big furniture/stock, magazine, handguard silhouette and color dominate. Minor surface details and repeating ribs largely vanish. Favor surface-art marks or fewer broad features when outline is unaffected. Keep true holes and identity-defining edges.
6. Legacy shotgun is a conspicuous collection of overlapping rectangular blocks, unlike the 870's coherent forms. Audit fallback callsites before retirement or replacement; preserve old save compatibility. Do not remove it yet.
7. Operator lab context demonstrates broad size hierarchy; hands obscure many identifying marks. The lab pistol preview scale .57 differs from actual holstered gameplay .37; no conclusion that cross-category gameplay size is calibrated. WA15/16 verify presentation in situ. Sidearm art-only Beretta remains art-only.
8. Accessory samples show mixed silhouette weight and subdued contrast. Seven equipped rows are not 24 individually verified accessory representations. WA12 must inspect accepted mount variants and appearance at native sizes. WA13 covers 41 custom part cases, especially AK's 28, and cross-family material finishes.

## Family evidence and priority
All IDs below have an initial art disposition, not a final weighted score. Severity H/M/L means relative overhaul priority, not functional severity. Evidence paths are relative to the artifact: platform/reference/view.png. Review default side-fit, three-quarter-fit, reverse-fit, native-64 and operator-context side; use other views when implementing. Numerical grades held until WA1 lighting/scale calibration and material/variant review so unknown categories do not masquerade as low quality.

| Family | Visual assessment | Disposition / stage |
|---|---|---|
| AR (9) | Clear lineage, distinctive carry handle and triangular front profile; coarse separated stock transitions, busy rails and rib rhythms, light magazine contrast; short variants risk heavy central mass. | Simplify/rebalance H WA6; preserve lineage and variant differentiation. |
| AK (9) | Strong curved magazine silhouette, faceted upper receiver and warm furniture; modern dark variants lose value separation; varied wood/plum tones look good, mixed part colors need coherent substrate treatment. | Refine/consolidate M WA7/13; preserve silhouette and color diversity. |
| G3 (3) | Slender front extension, conspicuous squared magazine and warm/green furniture; dark receiver and thin retracting stock read as a generic block/line at small scale. | Rebalance/refine H WA8. |
| HK33/53 (3) | Recognizable family, but central body nearly identical across G3/HK33/53; compact dark variants rely heavily on length alone. | Refine/rebalance H WA8. |
| MP5 (6) | Compact clear profiles and strong variant differences; dark receiver dominates, slim stock reads as line, SD fronts merge with dark furniture; bright tiny selector marks are stronger than surrounding shape detail. | Refine/rebalance H WA9; preserve K/PDW compact character. |
| FAL (4) | Strong angular continuous masses, distinct wood/folding variants; clear graphic port/vent hierarchy; carry handle very thin in side profile; family retains identity at tiny size. | Preserve/refine L WA4; assess thin elements and surface color. |
| FNC (1) | Economical integrated forms and repeated graphic vents; skeleton stock and handguard identity strong; dark layers merge in reverse. | Preserve/refine L WA4; benchmark atlas and mass hierarchy. |
| G36 (4) | Strong open stock/handle shapes, angled receiver, chunky magazine; excellent compact silhouette, rails on C/KA4 more visually busy and dark. | Preserve/refine L–M WA5; benchmark polymer. |
| 870 (7) | Continuous sculptural rear furniture, simple upper cylinder silhouette and distinct pump mass; wood strongly legible; dark pumps sometimes blend into body. | Preserve/refine L WA10; legacy fallback H separately. |
| Glock (4) | Coherent planar slide/frame, simple true negative space; compact G26 and tan 19X distinct; subdued dark slide/frame separation. | Preserve/refine L WA11; pistol benchmark. |
| Beretta (2) | Open-top appearance and more expressive outer profile, strong color variants; finer rear projections and busy outline less confident than Glock; tan frame and upper dark region contrast. | Refine/rebalance M WA11; no gameplay enablement. |
| Legacy (1) | Clearly inconsistent stacked-box silhouette in both isolated and operator views. | Consolidate/retire candidate H WA10 after compatibility audit. |

## Per-reference decisions (all 53)
| Reference ID | Disposition | Severity | Focus / stage |
|---|---|---|---|
| ar-m16a1 | refine | M | preserve long triangular furniture, compare receiver seams and simple straight mag / WA6 |
| ar-m16a2 | simplify | H | repeating front furniture rhythm and stock transition / WA6 |
| ar-m16a4 | simplify | H | rail density and visual mass / WA6 |
| ar-c7a2-proxy | rebalance | M | distinguish mixed furniture, retain proxy label / WA6 |
| ar-mk12mod0 | simplify | H | long railed front block and density / WA6 |
| ar-car15 | refine | M | compact rear/fore-end balance / WA6 |
| ar-colt733 | refine | M | carry handle and compact profile hierarchy / WA6 |
| ar-m4a1 | simplify | H | rails, stock/receiver transition / WA6 |
| ar-mk18 | rebalance | H | compact central mass and tan material hierarchy / WA6 |
| ak-akm | preserve/refine | M | warm furniture and curved magazine, graphic relief / WA7 |
| ak-akms | refine | M | thin folding silhouette / WA7 |
| ak-ak74 | preserve/refine | M | warm furniture and magazine finish separation / WA7 |
| ak-aks74 | preserve/refine | M | triangle silhouette and material continuity / WA7 |
| ak-ak74m | refine | M | dark substrate separation / WA7 |
| ak-rpk74 | refine | M | long profile and rear furniture hierarchy / WA7 |
| ak-ak103 | refine | M | dark furniture identity vs 74M / WA7 |
| ak-aks74u | preserve/refine | M | compact silhouette and broad furniture / WA7 |
| ak-ak105 | refine | M | shortened dark variant differentiation / WA7 |
| hk-g3 | refine | M | preserve wood, sharpen exterior mass hierarchy / WA8 |
| hk-g3a3 | rebalance | H | green furniture vs dark central form / WA8 |
| hk-g3a4 | rebalance | H | thin rear silhouette / WA8 |
| hk-hk33a2 | refine | H | body/furniture distinction from G3 / WA8 |
| hk-hk33a3 | rebalance | H | thin rear and dark silhouette / WA8 |
| hk-hk53a3 | rebalance | H | compact central mass and variant identity / WA8 |
| hk-mp5a3 | rebalance | H | central mass, fine rear shape / WA9 |
| hk-mp5sd3 | refine | H | subdued front form separation / WA9 |
| hk-mp5k | preserve/refine | M | compact iconic outline and graphic hierarchy / WA9 |
| hk-mp5k-pdw | preserve/refine | M | open rear silhouette and compact core / WA9 |
| hk-mp5a2 | refine | H | dark fixed furniture vs receiver / WA9 |
| hk-mp5sd2 | refine | H | integrated dark front and rear shape / WA9 |
| fal-5000 | preserve/refine | L | benchmark angular mass, thin carry handle / WA4 |
| fal-5000-classic | preserve/refine | L | benchmark wood contrast / WA4 |
| fal-5061 | preserve/refine | L | benchmark open stock and long silhouette / WA4 |
| fal-5063 | preserve/refine | L | shorter proportion and open stock / WA4 |
| fnc-service | preserve/refine | L | benchmark integrated atlas and silhouette / WA4 |
| g36-service | preserve/refine | L | handle/optic and skeleton silhouette / WA5 |
| g36-k-dual | preserve/refine | L | compact dual-optic identity / WA5 |
| g36-c-classic | refine | M | rail rhythm and short mass / WA5 |
| g36-ka4 | refine | M | solid rear mass and rail hierarchy / WA5 |
| r870-police-wood | preserve/refine | L | benchmark sculpted rear/pump color / WA10 |
| r870-police-extended | preserve/refine | L | length differentiation / WA10 |
| r870-tac14 | preserve/refine | L | sculptural compact rear / WA10 |
| r870-police-synthetic | refine | L | dark front mass separation / WA10 |
| r870-tactical-magpul | refine | M | dark furniture edge readability / WA10 |
| r870-mcs-breacher | preserve/refine | L | compact silhouette balance / WA10 |
| r870-mcs-cqb | preserve/refine | L | open rear shape and pump hierarchy / WA10 |
| glock-g19-gen3 | preserve/refine | L | coherent silhouette and graphic slide/frame / WA11 |
| glock-g26 | preserve/refine | L | compact grip distinction / WA11 |
| glock-g19x | refine | L | tan substrate separation / WA11 |
| glock-g19-gen5-mos | preserve/refine | L | subtle variant graphic rhythm / WA11 |
| beretta-m9 | refine/rebalance | M | confident outline, rear projection and grip mass / WA11 |
| beretta-m9a3 | refine/rebalance | M | tan material hierarchy and finer outline / WA11 |
| legacy-shotgun | consolidate/retire candidate | H | replace legacy visual fallback only after usage/compat audit / WA10 |

## WA1 handoff
Use actual shared builders and visual artifact as immutable reference; side-by-side with candidate, matched views and scale. Surface toggles must distinguish baked marks from separate overlays. Add reverse diagnostic light preset (not gameplay edit), material isolation, real silhouette, native px and operator context. Preserve source catalog and accepted custom IDs. Baseline ZIP not committed (12 MB); linked artifact is evidence, not permanent repository storage; set up durable archive/versioned manifest before retention expiration. WA2 may draft principle and exceptions now; final weighted rubric requires calibrated views and context plus review of outstanding angles. No score fabricated.
