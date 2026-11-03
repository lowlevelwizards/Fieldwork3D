# Fieldwork Breach — Stage 3C: paired trousers, sleeves and garment families

**Implementation scope:** New articulated trousers for BOTH already-accepted
field-uniform families, bloused/straight-leg hem variants, three believable
sleeve treatments, broadly truthful garment-family names and a *cut-specific*
audit of the approved 30 camouflage prints. No additional jackets are
implemented in this phase.

## Rolling staged plan and acceptance criteria

| Gate | Work | Required proof |
| --- | --- | --- |
| **3C-A / Family terminology and eligibility** | Public names change to **Classic Field Blouse/Trousers** and **Modern Utility Blouse/Trousers**. Keep `bdu-` and `acu-` IDs internally to avoid needless animation disruption. Expand original approved-camo eligibility by analogous cut, not U.S.-issue nationality. | All 30 originals immutable; every supported top and trouser cut correctly filters prints; no fabricated commercial equipment compatibility |
| **3C-B / Two actual trouser models** | Replace the transitional `field-trousers` entry. Classic: baggy thigh, roomy straight calf, pronounced large bellowed cargo pockets, simple pocket flaps. Modern: cleaner taper, angled cargo pocket flaps, calf utility pockets, reinforced knee area. Each model has separate shell geometry for upper and lower leg following IK. | Unique gray silhouettes at gameplay zoom; distinct proper 3D physical cargo volumes; true cloth-scale UVs; no changed hitboxes, leg lengths, shoe anchors, gait or weapons |
| **3C-C / Hem and sleeve states** | Classic and Modern trousers each offer **Bloused / Unbloused**; boots stay planted, ankle gusset narrows when bloused, straight hem overlaps boot shaft when unbloused. Both tops offer **Unrolled / Cuffed / Rolled**: full sleeve, visible wrist fold, above-elbow rolled band + genuinely bare forearm. | Actual geometry changes and skin exposure, not text toggles; no sleeve or calf clipping in idle/aim/walk/run/crouch/down; shared camouflage pixels retain scale |
| **3C-D / Appearance editors and focused verification** | One state per outfit (not separate item proliferation), accessible in Operator Lab, Campaign and Quick Play. Compatible states save in wardrobe v1; unknown states return to defaults; old rolledSleeves boolean intentionally ignored (no legacy migration). Preview grid shows real Classic and Modern pants next to matched top. | Focused unit tests + build/typecheck + existing motion and animation integrity gates, then one controlled merge and Pages deployment |

### Modeling boundaries

- Segments are *children of the existing animated upper/lower leg/arm meshes*.
  Their parent transforms and normalized segment lengths remain untouched.
- Trouser waist remains on existing hip geometry. The upper leg shell and
  lower leg shell share the knee; no detached knee parts are given new IK.
- Blousing is modeled in the lower leg's physical taper and fabric band,
  not by scaling an ankle or moving a planted foot. Boot cuffs remain.
- The Modern lower leg gets a calf utility pocket. The Classic family does
  not inherit that pocket just because both are in a camo print.
- The cuffed sleeve is a folded hem near the wrist; the rolled sleeve is
  shortened fabric ending above the elbow with the existing lower-arm bone
  rendered as skin. The modern blouse's sleeve utility pocket stays on the
  upper arm during rolling.
- A state is cosmetic. It cannot change warmth, armor value, inventory,
  movement, shot-line, stock socket, collision or animation authority.
- No iPhone physical visual signoff is assumed from automated tests alone.

## What the names mean

**Classic Field** is the accessible player-facing label for a broadly
traditional / BDU-like field blouse and relaxed cargo trousers. It includes
similar practical uniform constructions from other countries where the
major mass, pockets, and silhouette suit this model. **Modern Utility**
means a more recently structured battle blouse/trouser family
comparable in construction to ACU/MCCUU and modern national uniforms.

These are **silhouette analogues**, NOT claims that foreign armies issued
American-pattern BDU or ACU cuts. Small pocket, closure, collar, and knee
details can still vary by service and era. Where a real coat is too
different, exclude it until a distinct, worthwhile model exists.

## 30-print suitability matrix (two current families)

Legend: C = Classic Field blouse/trousers; M = Modern Utility
blouse/trousers; — = withheld for more accurate future garment or headwear
only. This is a *garment-silhouette* review, not national-issue certification
for every patch, button, webbing set, or pocket.

| Original approved camouflage | C | M | Current rationale |
| --- | :---: | :---: | --- |
| M81 Woodland | ✓ | — | BDU-era four-pocket conventional cut |
| Three-Color Desert | ✓ | — | DCU, similar classic relaxed envelope |
| Tiger Stripe | ✓ | — | Vietnam-era specialty jungle field fatigues |
| UCP | — | ✓ | ACU issue |
| MultiCam | — | ✓ | Modern issue/commercial field utility cuts |
| Flecktarn | ✓ | — | German Feldbluse traditional pocketed silhouette |
| Woodland DPM | ✓ | — | Conventional field uniforms; hooded smock is a *different garment* |
| Swedish M90 | ✓ | — | Swedish conventional field uniform analogy (not exact Swedish sewing pattern) |
| Six-Color Desert | ✓ | — | Early desert BDU-family cut |
| Woodland MARPAT | — | ✓ | MCCUU modern utility construction |
| Alpenflage | — | — | Swiss TAZ/M70 heavy coat and integrated carrying features too distinctive |
| Desert MARPAT | — | ✓ | MCCUU modern utility construction |
| ERDL Lowland | ✓ | — | Jungle fatigue uniform ancestry |
| Finnish M05 | — | ✓ | Modern national utility clothing silhouette |
| Polish Pantera | ✓ | ✓ | Long-running Wz.93 on traditional and modern field uniforms |
| Russian Flora | ✓ | — | Conventional older Russian field uniform silhouette |
| Rhodesian Brushstroke | ✓ | — | Historical field-fatique construction |
| Desert Tropentarn | ✓ | — | German field blouse analogue; not U.S. ACU |
| Belgian Jigsaw | ✓ | — | Belgian traditional field uniform styling |
| East German Strichtarn | ✓ | — | NVA field clothes; traditional cut approximation |
| Mitchell Leaf | — | — | Authentic helmet covers and shelter halves; **no standard field uniform** |
| Splittertarn 31 | — | — | Zeltbahn, reversible smock and specialist overgarments |
| Australian DPCU | ✓ | — | Traditional Australian issue camouflage workwear |
| Italian Vegetato | — | ✓ | Modern combat utility field garments |
| Scorpion W2 | — | ✓ | OCP ACU issue |
| Russian EMR | — | ✓ | Contemporary Russian field utility garments |
| PLA Xingkong | — | ✓ | Modern PLA utility uniform construction analogue |
| CADPAT TW | — | ✓ | Canadian modern utility uniforms |
| British MTP | — | ✓ | PCS-era modern field uniform; **separate smock also possible** |
| Indian Digital 2022 | — | ✓ | Contemporary issue combat field uniform analogue; avoid assuming private production |

28 references? **27 distinct print IDs** currently supported between the two
families (15 C / 13 M, with Polish Pantera shared). Three are withheld:
Alpenflage, Splittertarn 31 and Mitchell Leaf. All **30 original artwork
tiles** remain accessible in their original approved contexts.

No attempt was made to copy foreign uniform-specific insignia,
regimental markings, intellectual-property-restricted prints or
manufacturer-exclusive pockets. Headgear has a separate immutable
compatibility map. Gear/armor/pack compatibility stays independently
restricted by the existing Stage 2 equipment-evidence policy.

## Future garment families — ranked for visual uniqueness AND reuse

| Candidate | Priority | Distinctive shape at gameplay zoom | Reuse and verdict |
| --- | --- | --- | --- |
| **Smock / anorak / outer shell** | **1** | Longer hooded windproof silhouette, flap closure, multiple large chest/hip pockets, gathered waist and high collar | Strong choice: UK DPM/MTP smocks and international protective overgarments; Splittertarn-era pullover smocks may require their own historical variant, not an identical British jacket |
| **Combat shirt / mixed-fabric armor underlayer** | **1** | Slim stretch-knit torso under a carrier, reinforced woven sleeves, taller neck, cuff seams | Strong choice: MultiCam, OCP/Scorpion, MTP, CADPAT and other modern fabrics with documented mixed-material garment production; strong contrast against both field blouses |
| **Mountain / Gorka-type protective suit** | **2** | Large hood, oversized double-layer reinforcement panels, contrast-colored shoulders/elbows/seat and mountain cuff system | Distinct and iconic; potentially reusable beyond Russian print variants, but more specialized than the first two. Don't treat every EMR blouse as a Gorka |
| **Swiss pocket-heavy M70/TAZ field coat** | **3 (defer)** | Integrated carry-pocket jacket, unusual front/back storage and webbing-heavy profile | Strongly unique but mostly anchored to Alpenflage. Create only if that limited scope becomes worth a dedicated model |
| **Historic reversible jump smock / overwhite** | **3 (defer)** | Wide pull-over overgarment with drawcord waist and distinctive neck opening | Compelling for Splittertarn, but a narrow historic specialism. Consider a future smock subvariant rather than its own broad category |

**Do not add** separate Feldbluse, Dutch, Polish, Swedish, Canadian,
Italian and Australian blouse families solely because collars or flap
angles differ. Such variations can fit the two current shape languages
until a new *game-distance silhouette* and meaningful multi-print reuse
justify a third foundational cut.

## Documentary sources and important caveats

- [U.S. Army Quartermaster: ACU jacket and trouser fitting, TM 10-227 §8](https://ciehub.info/ref/TM/10-227_2016.pdf): thigh and calf bellowed cargo pockets, reinforced knee/seat, drawstring hems.
- [U.S. Army: Army issues new guidance on rolling and cuffing sleeves (2016)](https://www.army.mil/article-amp/175866/army_issues_new_guidance_on_rolling_cuffing_sleeves): genuine down/rolled/cuffed differences on ACU, variation by situation and command.
- [U.S. Navy uniform regulations: NWU Type III trouser blousing](https://www.mynavyhr.navy.mil/References/US-Navy-Uniforms/Uniform-Regulations/Uniform-Components/3603_5/): physical blousing vs authorized straight-leg circumstances; not used as evidence that all countries share exact wear rules.
- [U.S. Army: ACU product portfolio](https://cpeground.army.mil/Equipment/Equipment-Portfolio/PM-SSV-Portfolio/Army-Combat-Uniform/): construction, modern operational functionality and fit context.
- [Bundeswehr: Feldanzug and Flecktarn uniform context](https://www.bundeswehr.de/de/selbstverstaendnis/uniformen-bundeswehr): contemporary traditional Feldbluse/Feldhose confirms camouflage is not equivalent to U.S. ACU cut.
- [U.S. Marine Corps: MCO 1020.34H, MCCUU](https://www.marines.mil/Portals/1/Publications/MCO%201020.34H.pdf): independently issued modern utility coat and trouser, and Marine-specific sleeve practice.
- [U.K. DPM SAS Smock product history](https://www.vancouvertacticalsupplies.com/clothing/smocks_uk.php): large exterior pockets, storm flap and hood distinguish outer smock from BDU-like field coat.
- [Splinter historic garment reference](https://www.39-45.org/videos/3945/MAA336.pdf): smock, reversible winter suit and Zeltbahn versus standard camouflage field blouse.
- [Safar Publishing: Gorka suit history](https://www.safar-publishing.com/post/gorka-suit-history-and-variations): reinforced mountain suit and special-purpose garment structure.

**Evidentiary limit:** The broad family classification is an art-direction
judgement informed by several primary uniform specifications and heritage
references. It is **not** an exhaustive per-country issue/year/SKU audit of
all 30 camouflages. An exact national reconstruction would require
garment-specific models and new primary sources before being advertised
as such.

## Scope not included

No footstep scheduler edits, knee IK length changes, physical cloth physics,
additional unreleased camouflages, new helmet artwork, real gear inventory
changes, new smock/combat-shirt/Gorka/Suisse meshes or save migrations for
the removed pre-Stage-3 legacy wardrobe.
