# FN FNC P1 — isolated silhouette approval checkpoint
**Branch:** feature/fnc-p1-silhouette-lab-20261115  
**Scope:** a new, monochrome 5.56 FN FNC art prototype; no factory preset, issued faction weapon, saved build, combat class, muzzle socket, deploy or operator rig change.

## Design thesis
FNC is a distinct 5.56 rifle, not a smaller FAL receiver. Approve recognizable large shapes before rendering details or Swedish furniture. Do not duplicate the FAL's crowned receiver, bulk or handle. Retain existing low-poly game-art language and compare *real* production M16A2, G3A3, AK-74 and FAL 50.00 at one model scale.

## P1 visual hierarchy (highest impact first)
1. **Open tubular stock:** two separate stout rails with genuine negative space, modest rear pad and hinge. Extended position only; no folding animation.
2. **Squared stamped receiver:** long horizontal top and angular lower, flatter and less tapered than the approved FAL receiver; no G3 full-length cocking tube.
3. **Long grooved rounded fore-end:** continuous top plane, heavier bottom polymer mass and ONE broad longitudinal groove. Avoid dozens of slots or screws.
4. **Slim 5.56 box magazine:** distinguish from the broad straight FAL 7.62 profile. The full-size FNC is 5.56×45 mm and uses a STANAG-pattern magazine.
5. **Front sight and exposed barrel:** sight set forward of the handguard but well behind the muzzle; simplified muzzle device and rear aperture in the correct visual region.
6. **One side charging handle:** leave a clear three-quarter feature without overmodeling details.

P1 is deliberately dark flat-material with neutral sage-gray inspection background. Do not grade color finishes yet.

## Art datums (review-only; NOT ballistics)
- Stock rear X = -14.85
- Receiver rear/front X = -6.38 / 4.12
- Handguard ends X = 13.55
- Front sight X = 15.20
- Muzzle visual tip X = 19.50 (P1B: ~7% shorter rifle art vs first blockout)
- Magazine lowest Y ≈ -7.80 (P1B: narrowed, swept 30-round STANAG profile using the existing AR curve generator)
- Exposed barrel width/height = 0.96 art units (P1 was 0.66; muzzle 1.16)
- Nominal real rifle barrel = 17.7 in (449 mm); art units are not inches
- Aim for <=25 visible mesh objects and <550 triangles; no animation-loop allocations

## P1B shape review after first phone capture
- The 30-round magazine looked like a square, near-vertical oversized slab. Replaced its five-point outline with the existing AR-family 30-round STANAG curve generator, using a 10-point outline adjusted for FNC placement, with one extruded mesh.
- The exposed barrel was 0.66 art units, ~21% of the fore-end height. Increased its diameter to 0.96 units and modestly widened the muzzle device, without inventing a heavy barrel.
- The first prototype was 36.4 overall art units against the FAL's 37.0. New FNC overall length is 34.35 vs FAL 37.0, closer to the real-world 997 mm standard rifle vs ~1090 mm FAL. Visual alignment only; true real barrel remains 449 mm.

## Faction lineage plan (NOT delivered by P1)
- **P2 FNC factory**: proper modular family parts, live rifle serialization, muzzle/contact anchor parity, deterministic visual configuration, 5.56 rifle-class gameplay; Belgian Jigsaw 1995 default after browser QA.
- **P3 original Swedish Ak 5**: retain a separate Swedish preset with longer/thicker green fore-end and stock, enlarged winter trigger area/charging handle, Swedish sight; Swedish M90 2000 default after QA.
- **P4 Ak 5C**: shorter 350 mm barrel, revised modern fore-end, optic rail, adjustable stock and modern accessories; later dated Swedish references only.
- Optional Para, Ak 5D, Indonesian SS1 should follow genuine silhouette approval, not be generated as cosmetic names.

## Historical references
- FN FNC side-on overview/specification: https://weaponsystems.net/system/1068-FN+FNC
- Swedish Armed Forces / Försvarets Forum on original Ak 5 and Ak 5C:
  https://www.forsvarsmakten.se/siteassets/3-aktuellt/forsvarets-forum/2020/forum_2005_lowres.pdf
- Small Arms Review original Ak 5 changes: https://smallarmsreview.com/peacekeepers-secret-weapon-the-swedish-ak5-rifle/
- Small Arms Survey FNC distinguishing silhouette: https://www.smallarmssurvey.org/sites/default/files/resources/SmallArmsSurvey_ID_PlayingCards.pdf

## Acceptance gates
- Lab opens at /fnc-stage1-lab.html in Vite development or the next built Pages release (only after a future main merge).
- Side, three-quarter and opposite-side camera toggles function; five rows use one camera, one scale and identical flat material.
- Tests verify open stock, profile landmarks, topology budget and absence of any live FNC preset.
- Explicit visual approval before P2. No merge or deploy as part of P1.

## P2 — reference-led exterior identity pass

The P1B length/magazine correction remains authoritative; P2 is **visual-only** on the same draft feature branch. Reuse the existing six-slot game-art conventions and shared historical palettes; keep the rifle separate from live family serialization until approved.

- **Stock**: original metal two-leg hollow folding stock plus one obvious black insulating top-rail sleeve. No collapse animation or opaque filled stock. Preserve stock and butt contact extrema.
- **Receiver**: flat stamped upper and boxy lower/magwell, one restrained roof step. Right-side ejection/charging region and left-side selector are intentionally asymmetric and low-detail; no rows of artificial rivets or accessory rail.
- **Fore-end**: octagonal faceted polymer mass (shared visual language with the G3 but FN-specific front taper and lower body), exactly one long longitudinal recessed side line plus two broad upper slots on each side. Batch marks on real flat faces; no floating vent boxes or repeated mesh clutter.
- **Magazine**: the proven AR 30-round STANAG curve/normal generator reused unchanged; only placement and size tailored, plus two muted, broad stamped ribs; 5.56 not FAL 7.62.
- **Barrel/sights**: retain P1B 17.7-inch historical barrel metadata and X = 19.50 art muzzle. Add a quiet front collar/gas-block mass and maintain large, legible protected front sights.
- **Finish**: use immutable HK/FAL/AR black metal, polymer, magazine, shadow and muzzle materials in the FNC-only preview. Monochrome toggle preserves apples-to-apples comparisons against existing rifles.
- **Workflow**: 5-rifle one-scale lab, side/three-quarter/opposite/mobile browser captures, factory/monochrome comparison, CI art-boundary/geometry tests. Never merge/deploy before user reviews the models.

### Historical image/style sources
- Small Arms Survey FNC profile and distinctive two-leg stock/rounded grooved fore-end: https://www.smallarmssurvey.org/sites/default/files/resources/SmallArmsSurvey_ID_PlayingCards.pdf
- Small Arms Review FN FNC factory forms, stock sleeve and receiver: https://smallarmsreview.com/fabrique-nationales-carbine-the-fnc-in-america/
- Commons original FNC right-hand image: https://commons.wikimedia.org/wiki/File:FN_Herstal_FNC_5.56_mm_Assault_Rifle_Right_Side.jpg
