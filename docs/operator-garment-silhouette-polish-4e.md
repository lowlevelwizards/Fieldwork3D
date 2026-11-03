# Operator garments — silhouette cleanup and pixel-scale audit (2026-11-03)

## Art rule
**Symbol before detail.** Every garment gets a primary silhouette, a secondary construction cue and only a few large accents. Keep it chunky and a little oversized, but never build a "juggernaut" out of stacked boxes. No separate floating trim strips, no narrow fins and no dozens of tiny facets. The animation's joint locations, headgear, gameplay equipment and 30 approved camouflage masters are untouched.

### Reference images / construction evidence
- **Combat shirt:** [Crye G3 Combat Shirt](https://www.cryeprecision.com/G3-Combat-Shirt) — *solid knit torso all the way to the hem*, high quarter zip, separately woven/ripstop sleeves, bicep pockets; under armor the chest may be occluded but the fabric itself is not a bib.
- **Utility/ACU blouse:** [U.S. Army uniform survey](https://history.army.mil/html/museums/uniforms/survey_uwa.pdf) — slanted **chest** pockets and a second set of upper-*sleeve* pockets, not horizontal strips at the front of the arms. Modern trousers have genuine *side*-thigh cargo and optional calf pockets.
- **Smock:** [Arktis B110 smock](https://arktisusa.com/products/combat-smock-polycotton) — long, modestly loose windproof shell, four front pockets, zipper/hood, drawcord hem/cuffs. Real cloth, not front-mounted armor bricks.
- **Gorka:** [SSO history of Gorka](https://sso-mil.ru/articles/istoriya-sozdaniya-kostyuma-gorka-kompaniey-soyuzspetsosnashchenie/) and [Gorka K1 jacket reference](https://kommandostore.com/products/gorka-k-russian-mountain-suit) — restrained roomy anorak, reinforced shoulders/elbows/knees, contrasting hard-wear panels and cinched extremities. Allow genuine dark panel contrast, but reduce primary jacket mass.
- **Visual guideline:** original 40-world-unit figure maps to 40 reference texels; physical cloth UVs use TILE_WORLD_SIZE=32. A 64px specialty Gorka tile must repeat at 32/64, not the earlier .64, to share 1 texel per model unit. Print IDs, raw bitmap palettes and per-character seeds remain unchanged.

## Refined family signatures
| Cut | Must read from battle view | Remove |
| --- | --- | --- |
| Combat shirt | One close-knit torso plane, contrasting shoulder/sleeve fabric, short standing zip collar | Return of camouflage on the front, floating shoulder wedges, overlong tube ends |
| ACU/modern utility | Neat folded collar, slanted chest cargo and **upright outer-arm** pouches | Symmetrical front-facing sleeve strips, mislabeled pouch orientation |
| Field smock | Four prominent but relatively shallow pockets, longer hem, small folded hood | Wide armor-like chest, projecting hood fins, giant pocket blocks |
| Mountain/Gorka | Two contrasting shoulder/knee reinforcement fields, compact anorak body, cinched cuff/waist | 9.45-side shoulder width, long lateral shards, reinforced armor plates |
| Classic/modern/Gorka trousers | Upright narrow-depth **±Z** outer thigh cargo, overlapping knee fabric, shorter ankle hems | Forward/back-long thin pocket slabs, open knee cracks, fabric past the ankle |

## Implementation notes
- Shoulder profile reduced to 8.12 smock and 8.10 Gorka vs 9.35/9.45 previously; hem still reads longer than combat shirt.
- Combat shirt now receives one continuous solid front/knit plane from collar to hem; raglan accents cannot take over its chest.
- Folded hood uses three tucked contiguous volumes, avoiding protruding trim antennas.
- Eight-side faceted articulated sleeves/legs reinforce chunky silhouette instead of faceted round 10-sided profiles.
- Solid knitted/woven trim materials for cuffs: combat knit, smock solid, Gorka base, BDU/ACU neutral fabric. These are separate from camouflage textures.
- Outer-side thigh and calf pouches become short-depth upright cargo; upper thigh knee patches move toward the actual knee.
- Knee shell overlap extends beyond the ±0.5 segment endpoints; ankle hems end at +0.48 rather than +0.53. No IK edits.
- Three new Gorka finishes: khaki/forest olive, slate/charcoal, desert sand/umber, in addition to approved existing colorways.
- New focused tests assert density, material separation, shell measurements, pocket shape, waist and joint limits.

## Visual QA remaining
- Capture clean unarmored front, back, side and 3/4 at **same camera zoom** for all five jackets; inspect silhouette before applying prints.
- Turn on MultiCam / M81 / Russian EMR and Gorka special insert; inspect texel density at torso/sleeves/legs, especially at adjoining mesh boundaries.
- Iterate roll/cuff states, crouch, walk, run and aim; check wrist exposure, elbow flexion, underside of folded hood and knee seams.
- Add/strip plate carrier, pack and belt rig; review thin shell clearance, z-fighting and whether a combat shirt's knit chest remains visible where uncovered.
- Run minimal TypeScript, Stage 3B/3C/4 and one artifact/rig smoke workflow; verify Pages commit SHA before announcing deployment. Automated tests do **not** replace actual iPhone visual review.
