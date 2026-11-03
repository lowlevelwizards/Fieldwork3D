# Fieldwork Stage 4 — Field garments and mountain suit (rolling release)
**Release method:** one long-lived feature branch; commit stable substages individually; run TypeScript/critical motion/integrity plus one focused clothing test suite; merge **once** after deployment queue clears and exact prior Pages build is verified.

## Stage 4A — garment fit and wear-state correction
- Classic/Modern thigh bellows centered on ±Z outer seam, slightly behind the anterior leg plane. Modern calf pouch likewise moved to the outside. Confirmed against U.S. Army *TM 10-227* §8.1.1.2 and illustrated uniform photographs.
- **Bloused**: leg fabric balloons above a higher .265 normalized shin endpoint, then dramatically narrows to a restrained boot-neck diameter. Existing shin surface becomes dark boot material, giving visibly exposed boot shaft; no ankle/joint displacement.
- **Cuffed trousers**: third, oversized double-fold at a FULL-length hem. Distinct from both wide straight unbloused fabric and hiked elastic blousing.
- **Cuffed sleeves**: double-width woven fold at high wrist, shortening the lower forearm shell to expose real wrist skin. Unrolled stays full length; rolled still above elbow. No IK or stock edits.

## Stage 4B — real new upper-body geometry
- **Combat Shirt:** close-cut knit torso, reinforced (original print) woven shoulder/arm sections, stand-up quarter-zip collar, utility bicep pockets and enlarged elbow patches. Separate knit material avoids recoloring the 30 original camouflage tiles.
- **Windproof Field Smock:** deliberate long outer silhouette, gathered waist/hem, laid-back hood that does not replace approved headgear, four large front cargo pockets, map/side-zip visual treatment, storm placket and upper-arm details.
- **Mountain Gorka Jacket:** hooded, voluminous anorak/field-suit abstraction, distinct outer shoulders, strong two-tone reinforcement panels (upper back/shoulders/elbows), enlarged pockets and gathered waist/cuffs.
- **Mountain Gorka Trousers:** matching baggy legs with large side-thigh pockets, reinforced knees, gaiter-style lower leg treatment and the same hem menu. Trouser base and reinforcement materials are separate from the jacket channels; patterns can be applied independently.
- Every new mesh hangs from the existing chest/upper-arm/lower-arm or upper-leg/lower-leg nodes. Headwear transforms, IK joints, gait, collisions and weapons remain unchanged. Same-material parts are consolidated for mobile.

## Stage 4C — authentic materials and camouflage eligibility

**New garment-specific colors:** combat shirt knit = sand, olive, ranger green, coyote, black. Smock cloth = olive, ranger, khaki, coyote, black. Gorka = khaki/brown, olive/brown, sand/olive, solid olive, plus two exclusive patterned reinforcement styles.

**Two new independent Gorka-only print studies:** SS-Leto-inspired green summer inserts and SS-Autumn-inspired ochre autumn inserts. Both are deterministic, individually authored 64px masters on a single approved-size pixel grid, without randomness or touching the original 30 camo tiles. These are **distinct art-direction studies**; do not present them as faithful 1:1 copies of an original manufacturer-pattern master until the user reviews actual 3D models at field zoom. They cannot be equipped on headgear, smocks, conventional uniforms or gear.

**Existing approved camouflage per top** (availability is silhouette-based, not a claim of a specific country's official garment issue):
- Combat Shirt: UCP, MultiCam, Scorpion W2, MARPAT woodland/desert, CADPAT TW, MTP, Finnish M05, Vegetato, EMR, Xingkong, Indian Digital 2022, Pantera; M81 and Flecktarn where **modern commercially manufactured combat shirts** exist (e.g. UF PRO).
- Windproof Smock: DPM woodland, MTP, MultiCam, M81, Flecktarn, M90, M05, Tropentarn, Three-Color/Six-Color Desert, Pantera, Flora, EMR and **Alpenflage**. Alpenflage here denotes a permissive stylistic smock, NOT a faithful Swiss M61/M70 carry-coat reproduction.
- Gorka: Flora, EMR, MultiCam and Pantera as constrained historical/commercial analogue choices. Gorka-only summer/autumn panel prints use a separate colorway selector and **are not added to the approved universal camo/headwear library**.
- Separate top/trousers/armor/gear/pack policy remains. Fabric on the sleeves does not imply an identical carrier, rucksack or helmet cover exists.
- **Splittertarn 31 is deferred entirely in active UI**, including headwear pickers. Its original artwork remains archived in source as one of the immutable, already approved master tiles. Existing saved selections of that pattern are dropped on parse, not migrated.
- Mitchell Leaf keeps its approved historical headwear interpretation. Other 30-print artworks are unchanged.

## Stage 4D — validation and deployment
- Operator Lab's true 3D card grid auto-shows a matching mountain suit and realistic combat shirt/smock (not a recolored blouse).
- Garment-specific colorway selector in Operator Lab, Campaign and Quick Play; saved in the wardrobe record. Unmodeled/invalid states remain disabled.
- Verify stand, crouch, walk, run, aim, down, with and without armor; test headgear clearance and underside of hood, wrist exposure above glove, cargo placement from 3/4 view, boot cuff vs tapered blousing, real pattern scale and draw-call count on iPhone.
- At one checkpoint, green production TypeScript, Stage-4 focused regressions, operator motion and animation-integrity gates are necessary and sufficient. Verify previous Pages SHA/success before merge, then confirm the new Pages SHA and expected served marker.

## Source references and modeling criteria
- [U.S. Army TM 10-227, fitting of Army Uniforms, 2016 §8](https://ciehub.info/ref/TM/10-227_2016.pdf): ACU bellowed thigh and calf cargo pockets, reinforced knees and trouser drawstrings.
- [Crye Precision G3 Combat Shirt spec sheet](https://www.cryeprecision.com/Resources/en/SpecSheets/APRCSE_SPEC.pdf): stretch torso under armor, contrasting NYCO sleeves, high zip collar and bicep/elbow features.
- [UK MoD PECOC dress committee 2010](https://assets.publishing.service.gov.uk/media/5e3aaf0640f0b609278cd39a/Army_Dress_Committee_meeting_minutes_February_2009_to_November_2010__Annex_I_.pdf): UBACS sleeves, smock evolution and bicep pockets.
- [Arktis B110 Combat Smock](https://arktisusa.com/products/combat-smock-polycotton): four large front pockets, document zips, hood, storm flap, drawstring cuffs/hem.
- [SSO/SPOSN — history of Gorka](https://sso-mil.ru/articles/istoriya-sozdaniya-kostyuma-gorka-kompaniey-soyuzspetsosnashchenie/): anorak, reinforced shoulders/elbows/knees/seat/hem, gaiters and multiple construction generations.
- [SSO Gorka-E summer/autumn offerings](https://www.alfadogtactical.com/shop/sso-sposn-suit-gorka-color-partizan-summer/): SS-Leto / SS-Autumn / Izlom commercial/issue-associated material for later authentic art review.

## Deferred
No separate one-use Swiss M70 coat; no standalone Splittertarn jump smock; no global 8-color procedural palette; no new helmet artwork or changes to underlying firearms/mechanical game behavior. These require their own explicit visual review.
