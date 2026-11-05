# Operator Camouflage 6A — Eight-pattern expansion and build specification
Date: 2026-11-04
Branch: feature/operator-camouflage-batch-6a-20261104
Target: existing 30-print wardrobe and headwear renderer → 38.

## Objective
Expand the library by *recognizable print families* instead of simple recolors. Preserve every prior recipe/ID and every cosmetic save, unchanged combat stats, original per-operator seed behavior, lazy mobile comparison and the existing shared cloth/UV1 infrastructure.

## Batch 6A priorities (ordered)
| # | ID | label | 64px visual signature | Ink target | Headwear density | Body px per world unit |
|---|---|---|---|---|---|---|
| 1 | atacs-fg | A-TACS FG | soft foliage/earth clouds, organic breakup | 19/27/25/18/11 | 2 | 2.65 |
| 2 | ukrainian-mm14 | Ukrainian MM-14 | sand and gray-olive coarse digital islands | 28/25/23/16/8 | 2 | 2.8 |
| 3 | aor2 | AOR2 | cool green, vertically grouped stepped pixels | 27/33/28/12 | 3 | 3.0 |
| 4 | multicam-tropic | MultiCam Tropic | layered sweeping jungle-green fields and tiny shadow chips | 16/23/21/18/12/7/3 | 2 | 2.9 |
| 5 | atacs-au | A-TACS AU | blurred ochre, sand and stone field transitions | 25/27/21/18/9 | 2 | 2.65 |
| 6 | ss-leto | SS-Leto / Partizan | large interrupted oak-leaf lobes; earthy green contrast | 21/25/21/16/11/6 | 2 | 2.45 |
| 7 | aor1 | AOR1 | cream/coyote stepped desert pixels, horizontal bias | 33/32/26/9 | 3 | 3.0 |
| 8 | multicam-arid | MultiCam Arid | long cream/sand/tawny fields, tiny sage and brown | 24/24/22/15/8/5/2 | 2 | 2.9 |

## Artwork implementation
- New self-contained original art generator: src/operator-camo-batch-6a.ts. Fixed 64×64 source with periodic seamless interpolation, authored wrapped polygon interruptions, deterministic 2px digital steps, and exact intended palette proportions using ranked pigment thresholds.
- Art generation happens only when a master is first requested; cache source indices; do not generate new noise on every pose frame.
- Headwear: existing UV1 atlas, nearest filtering, stable seeded cutting phases and scale. AOR1/AOR2 have denser 3× digital print; the rest use 2×.
- Uniform, armor, rig and ruck: same canonical RGBA bytes via existing garment texture factory and metric density scales. No new material allocations per frame.
- Master names are recognizable *style interpretations*; no scanned, traced or manufacturing-identical licensed designs. Avoid trademark artwork, patches and insignia.
- 6A IDs append to the 30 canonical IDs in the precise order above. No migrations or save rewriting of older variants.

## Eligibility / real-world plausibility
- Patrol cap, boonie: all eight. ACH: eligible modern print covers. High-cut: seven textile options, not SS-Leto. Beanie and steel pot remain non-printable; PASGT keeps its existing conservative set.
- Field uniform: A-TACS supports classic and modern blouses; Partizan supports classic field cut and smock/Gorka; other new prints use modern utility cuts.
- Gorka jacket/trousers: SS-Leto, A-TACS FG and A-TACS AU allowed as stylized production analogues. AOR and new MultiCam variants intentionally stay out until an actual production cut is validated.
- Body armor and equipment: A-TACS and MultiCam variants permitted on verified modern commercially patterned rig/plate cuts. Ukrainian MM-14 permitted on select field webbing and overt carriers; AORs and SS-Leto remain uniform-only.
- Current Gorka panel coloration remains unchanged. Separately colored outer shell, elbows, knee and reinforcement panels are a follow-on garment feature; do not conflate camouflage print expansion with that material redesign.

## Editor / persistence
- Headgear and outfit pickers receive new entries automatically through shared IDs and policies. Extend catalog origin list with Ukraine; expose all 38 in comparison and filter UI.
- Keep real master swatches, favorite and recent storage, independently rolled headwear/fabric phases, saved looks and campaign/Quick Play cosmetics.
- Preserve no-print option and blocked-item handling; a stored pattern must never bypass current equipment eligibility.

## Validation / release gate
- Update four legacy exact-count tests and existing 5A/5B slice bounds so the frozen twelve-print test still exercises IDs 18–29.
- Add focused tests: exactly eight IDs; 64px RGBA; unique tiles; target ink ratios; deterministic indices; headwear UV1; body data reuse; correct terrain/origin; reliable saved wardrobe IDs; outfit and armor/rig compatibility.
- Critical CI: TypeScript check, Vite build, camouflage headwear test, body camouflage test, 6A test, rig policy relevant test. Full unrelated simulation suites not required for this cosmetic stage.
- Keep commits on feature branch. Do not merge during a Pages deployment; verify the previous deployment succeeded before any release checkpoint. Deployment itself is not authorized by this implementation request.

## Reference notes
- A-TACS maker: https://www.a-tacs.com/
- U.S. Navy Type II/III: https://www.navsup.navy.mil/NAVSUP-Enterprise/Navy-Exchange-Service-Command/NWU-Type-II-Type-III/
- Ukraine MM-14 and distinction from MM-25: https://mod.gov.ua/en/news/mo-d-clarifies-in-response-to-service-members-requests-trial-batches-of-clothing-and-gear-featuring-a-new-camouflage-pattern-will-be-procured
