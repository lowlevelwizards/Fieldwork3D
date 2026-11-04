# Fieldwork rig audit — RIG-R1 handoff (2026-11-03)

**Scope:** Read-only code/real-equipment reference audit following the R7 surface-contact armor fitting fix. Armor cleanup is a separate, committed three-stage batch. This report is a rig implementation handoff, **not** a claim that any rig geometry has already been refit.

## Executive findings

The existing ten selectable rigs have distinctive front-panel and pouch *recipes*, and equipment authority remains independent of wardrobe appearance. But the rig mounting architecture **has not yet been migrated to R7 true contact**:

1. `RIG_FRONT_PROFILES` and each rig's authored boxes still use fixed front X positions (~7–9 game units). `armorAttachmentFrame().rigShiftX` translates the *entire rig*, using the legacy `ARMOR_PROFILES['plate-standard']` as an origin. Translation is not an attachment: back panels, belt webbing, and diagonal harnesses can float or collide even if the front looks acceptable.
2. `updateFittedRigHarness` regenerates two generic shoulder loops for most archetypes. It does not fit the visible *rig panel's own inner face*, nor the selected armor's top bag corners. The cache key omits side width and rig translation, leaving a few changed looks with stale paths.
3. `armorMountedMagazineSocket` partially remaps the old `rigMagazineMount` coordinates, while the visual pouches are positioned independently. This creates opportunities for magazine/pouch drift and inappropriate side fallback positions.
4. `chest-placard` hides its harness for **every** visible armor, including police/flak/legacy shell designs that do not necessarily have modern placard interfaces. Compatibility must be defined by *mounting system*, not simply by the armor being equipped.
5. Several rigs (bandolier, LBV, field webbing, SADF) are solid silhouette sketches but not yet faithful reference cuts. Most critically, `sadf-webbing` conflates P83 chest-rig and P83 Battle Jacket features.

### Reference anchors

- Spiritus Micro Fight MkV: a low-profile **single-cell modular placard** which attaches either to a standalone shoulder/back harness or to compatible plate bags; front/side MOLLE and removable insert choices are distinctive. https://www.spiritussystems.com/micro-fight-chassis-mkv/
- Crye AirLite Convertible Chest Rig: front platform accepts both harness configuration and a vest front via quick-attach hardware. https://www.cryeprecision.com/AirLite-Convertible-Chest-Rig
- Tactical Tailor Fight Light 2-piece MAV: **two independent, broad side panels**, central opening, 1.5-inch straps; each side approximately 13.75 × 6.26 inches. https://tacticaltailor.com/fight-light-mav-body-2pc/
- Chinese Type 56 chest rig: **three tall front AK magazine pouches with small auxiliary side pouches** over a flat canvas base, not a modern placard. https://mistymountainsupply.com/shop/p/chinese-army-type-56-chicom-chest-rig
- SADF Pattern 83 has **different chest-rig and Battle Jacket families**. The former generally reads as central flap pouches plus flank pockets; the latter is a torso-encircling vest/webbing assembly with numerous waist, side and back compartments. https://kommandopost.com/2015/08/26/south-african-pattern-83-webbing-1980s-1990s/ and https://www.awm.gov.au/collection/C999079

No real-world inches-to-voxel scaling should be applied literally. These anchors establish relative footprint, height, distinctive closures and rig mounting, not a demand for photorealism.

## Ten selectable rigs: silhouette and fit critique

| Current style | Distinctive target / what survives | R1 gap and proposed change | Priority |
|---|---|---|---|
| `chest-placard` | Compact **three-mag flat placard** with minimal backing; no full harness on compatible plate carrier. | Base is a fixed chest slab at X 8.14; align its *rear face* to the front bag outer surface; integrate top clips visually and use harness **only** for bare shirt/soft vest configurations without true placard mounts. | P0 |
| `micro-rig` | Small high chest panel with two primary cells and optional wing pouches. | Close to placard silhouette; slim its backing, push two larger pouch forms and clearly route the own H/X harness on bare shirt. On carrier, optionally allow a **separate** carrier-mounted configuration (not automatically a placard). | P1 |
| `light-rig` | Classic four-pouch chest rig, very clear X-harness in rear. | Front row is broad but suspended from generic shoulder loops; maintain four chunky cells, make a real X behind shoulders, wrap the back strap flat, fit to front surface of chosen underlayer. | P1 |
| `chicom-rig` | Three long canvas-mag cells, smaller auxiliary pockets on flanks, narrow old-school straps. | Currently largely a rectangle with generic harness; emphasize taller flap closure and fabric panel, old-style thin-but-not-fiddly canvas strap + side ties. Preserve 3+small recognizable geometry. | P1 |
| `split-front` | Two independent wide panels; **center opens**; clear center gap and closure. | Current two banks at ±4.3 have no actual fastening detail / proper wrap path; use a center buckle/tab and wide strap geometry following armor/cloth body, not an unmodified generic harness. | P1 |
| `full-chest` | Tall, substantial bib/patrol rig with front cargo rows and higher admin panel. | Current solid 9.65-high slab competes with armor collar and lower neck. Introduce shoulder silhouette/upper cutout, avoid collars, keep large bib identity rather than a 1:1 enlarged placard. | P2 |
| `lbv` | Classic load-bearing vest: two front shoulder-to-waist load panels with open sternum and conspicuous pouches. | Current vertical slabs at sides and six pocket shapes don't read as real vest yokes. Rebuild two **tapered** angled vest halves and continuous rear support. | P2 |
| `field-webbing` | Belt-centered traditional load-bearing system; suspenders, side magazine/canteen/utility pouches. | Belt currently lives on the chest node and fixed X positions. Anchor belt to pelvis/hip while suspenders attach to chest shoulder. Avoid high central bib and preserve movement/weapon clearance. | P0 |
| `bandolier` | Diagonal cross-body ammunition strap with minimal pouches. | Completely fixed diagonal, may cross neck/armor; five visual pouches vs four declared primary magazine sockets. Route between shoulder and opposite lower torso; make 4/5 visual cells and ledger mapping intentional. | P1 |
| `sadf-webbing` | Choose explicitly: **P83 Battle Jacket** (wraparound multi-pocket load carriage) rather than another 3-cell chest rig. | Currently four front pockets plus two hip pouches; lacks rear/side infrastructure, confused overlap with `chicom` and `field-webbing`. Retain identity as roomy Battle Jacket: chest-side panels, large waist/side boxes, one meaningful rear section. | P1 |

`belt-harness` is still authored internally but retired from the curated UI; existing saved values migrate to `field-webbing`. **Do not reintroduce it as an eleventh choice.**

## Mounting specification: three different attachment modes

1. **Bare shirt / uniform:** Independent harness. Anchor the rig's **inner panel face** onto the real garment-front mesh (R7 `garmentContactAnchor`) with ~0.10–0.18 game units of separation. Draw shoulder straps over *visible* shoulder surfaces and waist/back straps against true torso/hip geometry.
2. **Plate bag with verified modular interface:** Placard mode **only** for designated mounting types. The back of the placard touches the actual **outer front face** of the plate bag, with a small cloth clearance. Top tabs/buckles join upper plate points. Hide standalone harness; keep pouches projecting away from plate.
3. **Bulky soft/fragmentation/legacy armor or nonmodular plate:** Standalone *external* harness. Front/back/side contact tracks the armor's actual rendered outer surface, including side panels, rather than the inner uniform chest or nominal center X. No magically plate-mounted placard.

Add an explicit visual mounting capability field in the wardrobe style metadata (e.g. `none | modular-placard | external-shell`). A rig's requested mode plus the carrier's capability chooses the mounting recipe. This should not change equipment ledger capacity or protection.

## Fitting architecture changes before rig sculpting

- New `rigContactFrame({top,armorStyle,rigStyle})`: actual front armor-bag outer surface; garment-front fallback; back exterior; flank contact at rig height; shoulder top and front/bag anchors; waist/hip mount points; rig panel body center. **Stop using `rigShiftX` as the universal fit algorithm.**
- For each rig, store the real **inner panel/harness/pouch anchor** coordinates in its source geometry. Place its inner front surface at `frontContact + clearance`, not its arbitrary authored origin. Side and rear pieces must use their own contact points.
- Rebuild only connector geometry on actual outfit/mount-mode change, not every animation frame. Fit memoization must include armor style, top, rig, side width, mode and mount surfaces.
- Split rig body/placard/pouches from harness into independent groups. Current generic harness loop and static rear X straps do not suffice for all rigs. Maintain per-rig signature shapes and low piece count; no tiny hooks/cables or decorative polygons without silhouette value.
- Use the existing real magazine instances, but derive `rigMagazineMount` from each placed **pouch cell's** geometry. The fifth bandolier pouch must either have a valid visually consistent socket or be explicitly non-magazine utility.
- Put belt-based rigs onto the proper hip/chest attachment hierarchy, not a single floating chest group. Preserve torso motion and posture.
- Keep (\mathrm{gear}\) color/texture separate from (\mathrm{armor}\) and from selective pouch color override; preserve the current fixed visual density and seed-based camo behavior.

## Compact verification contract

- **First demonstration:** Micro rig + bare combat shirt, then same rig over standard plate, plus three-cell placard on compatible standard plate. For both: front, 3/4, side, overhead and rear; check no strap-end air gaps and no armor-through-pouch clipping.
- **Different geometry:** Chicom over BDU, split-front over flak, full bib over heavy, P83 Battle Jacket over legacy, belt webbing over smock. No giant blanket of matrices captured for every configuration; use representative worst cases.
- **Automated tests:** raycast visible underlayer and visual rig inner surface to check contact; verify all real magazine sockets are inside/at intended pouch cells; confirm detachable harness only for supported modes; confirm no stale connector rebuilds; check clips at shoulder transitions and no ground/inter-operator IK regression.
- **Phone-scale readability:** All ten rigs recognizable by pouch arrangement and harness at game camera zoom, not only while zoomed in. Distinguish micro, placard, classic X, Chicom, full bib, split front, LBV, P83 and field webbing by silhouette alone.
- **Compatibility:** Save migrations, Quick Play versus Campaign equipment persistence, magazine capacity, and current combat/animation systems unchanged.

## Rolling release roadmap

**RIG-A: Ground-truth mounting** — rig contact frame, mode/capability metadata, first micro/placard bare-vs-plate demo. Commit to feature branch, focused geometry tests. Do not add new rig variants.

**RIG-B: Lightweight identities** — placard, micro, four-cell classic rig, Chicom, diagonal bandolier. Fit straps and pouch/socket coordinates; capture phone views.

**RIG-C: Full/tactical identities** — split-front, full bib, LBV with deliberate front opening. Fix their shoulder/side geometry; focused comparisons.

**RIG-D: Traditional/webbing identities** — field belt/pelvis hierarchy and P83 Battle Jacket side/rear/belt silhouette. Capture moving, crouched, standing examples.

**RIG-E: QA + release** — 5 uniform x 7 visible armor x 10 rig combinations exercised programmatically with focused visual snapshots of critical pairs; batch compatible stages, verify preceding live GitHub Pages build before a single merge/deploy.

### Guardrail

The armor contact solver passed the user's visual review. Treat it as stable. Rig geometry may attach to its real surfaces but **must not change** armor front/back placement, global mesh dimensions, gameplay hitboxes, stats or the existing armors' silhouettes.
