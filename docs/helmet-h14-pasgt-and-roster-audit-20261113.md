# H14 — PASGT options and helmet catalog distinctness audit
Date: 2026-11-13 · Source: authored profiles + user phone screenshots

## Historical evidence / why PASGT can carry more than an ACH-exclusive policy
- US Army helmet history (PASGT fielded 1982 onward, woodland/desert covers, band):
  https://history.army.mil/html/museums/uniforms/survey_uwa.pdf
- PASGT service/repair manual (deep ear/nape, small peak, rubber rim, original 2-point chin cup):
  https://clothingandindividualequipment.tpub.com/TM-10-8400-203-23/css/TM-10-8400-203-23_373.htm
- Official NVG field manual (2000) confirms strap-on PASGT night vision mount:
  https://www.landsurvival.com/MANUALS/UsArmyTm11-5855-262-10-2NightVisionGoggles2000.pdf
- Smithsonian artifact, 2003 USMC PASGT with NVG, shell cover, retention:
  https://www.si.edu/object/us-marine-corps-combat-helmet-night-vision-scope:nmah_1274348
- US Marine Corps combat-used cover and goggles band:
  https://www.iraqimilitaria.com/iraqi-online-museum-american-helmets/us-combat-used-usmc-dcu-pasgt-helmet
- PASGT compatible NO-DRILL rail/shroud retrofit documented by manufacturer:
  https://www.armorusa.com/product/railband-helmet-rails/
  https://www.internationalarmor.com/helmets/railbelt-helmet-accessory
- 2022 PASGT style technical spec lists side rails, shrouds, bungees, Velcro:
  https://www.med-eng.com/wp-content/uploads/2025/05/SAF_Armor_PASGT_Technical_Specification.pdf
- PASGT-specific adhesive Velcro mounting procedure (military technical manual):
  https://www.liberatedmanuals.com/TM-9-1265-370-10-1.pdf
- 2009 NVG rear counterweight/Velcro carrier can conform to multiple helmets:
  https://soldiersystems.net/2009/08/26/nvg-counterweight-pouch/
- Modern rail camera/light systems: deliberate later-retrofit category, not a historically fielded 1980s PASGT feature.

## PASGT compatibility decisions
| Option | PASGT | Classification | Implementation |
|---|---|---|---|
| Cloth cover, net, foliage, scrim | yes | period field dress | existing PASGT renderer |
| Elastic band with rear cat-eyes | yes | period | existing PASGT renderer |
| Goggles front/rear/eyes + fabric sleeve | yes | period | existing D2/field pose |
| Strap-on NVG bracket | yes | late historical | existing PASGT-specific flat bracket |
| Cover identifier / field markings | yes | period/field modifications | new surface-facing variant, requires cover or Velcro when bare |
| Rail kit | yes | **later retrofit** | new PASGT-only side rail contour, off by default |
| NVG bungees | yes, if retrofitted | later retrofit | new cover-aware outside-corner flat route; requires rails+shroud |
| Velcro panels | yes | adhesive field modifications/later | new four-panel cover-aware kit |
| Camera, helmet light | yes, with retrofit rails | modern accessory | same stylized models with PASGT side-rail sockets |
| Rear counterweight / spare battery pack | yes, with carrier | late field modification | shared stylized model, mutually exclusive with rear goggles |
| IR strobe | yes, hook-loop/strap retention | later period | shared low-poly crown module |
| Chemlight | yes, field-secured | period/late field | shared crowned retention module |
| Headset rail wings | mechanically feasible | later retrofit | **NOT implemented H14**; requires unifying helmetSetup vs helmetField mounts |
| Ballistic mandible/visor | candidate only | modern special fit | deferred for collision/facewear audit |

Each modern retrofit is OFF in default state; no claims that 1980s PASGT soldiers routinely wore these systems. This is a modular appearance sandbox, not gameplay capability.

## Catalog distinctness audit, ten protective helmets
| ID | Existing distinctive geometry (authored code) | Verdict | Proposed next move |
|---|---|---|---|
| PASGT | deep ear lobes, continuous nape skirt, long brow brim, 2-point chin cup | **KEEP**, strongest distinct silhouette | Preserve deep apron. Retrofitted modules cannot reshape crown |
| US M1 steel | floating bowl + rolled flaring rim | **KEEP** | optional rear seam, liner and 1980s band; avoid PASGT crossover |
| Soviet SSh-40 | round bowl, minimally flared skirt, shallow side extensions | **KEEP** | reinforce hemispheric top vs US M1 upper dome |
| DDR M56 | broad slanted brow, flat-ish crown, massive downward/back flared apron | **KEEP** | strengthen signature swept rear and edge line |
| Police protective | deep ear guards, reinforced brow, articulating visor | **KEEP** separate protective purpose | Visor should define thumbnail when equipped |
| ACH | full-ear protective enclosure with short rounded brow | **KEEP**, baseline modern full-cut | Distinguish primarily by ear/nape coverage |
| MICH 2002 gunfighter | raised-mid ear clearance, fuller lower side returns than 2001 | **KEEP**, but needs stronger cut contrast | Exaggerate midcut notch and contrasting front/back lobes |
| MICH 2001 | open high-cut ears, shortened temple and rear lower wrap | **KEEP**, but currently weakly differentiated | Keep legacy plain-shell look; high cut pronounced |
| Generic high-cut | open-ear silhouette very similar to MICH 2001 | **WEAKEST / MERGE CANDIDATE** | Make a selectable generic high-cut preset or alias to MICH 2001, retaining saved IDs. Do not delete until migrations/preview verified |
| FAST SF high cut | pronounced open ear, integrated modern front mount and trim | **KEEP**, modern high cut | Exaggerate front/rear rail silhouettes and lightweight shell taper, not extra roof slats |
| FAST XP mid cut | lower sides, thicker fuller shell and rear return, modern rail ecosystem | **KEEP**, with silhouette work | Emphasize mid cut lowered ear segment and extra crown thickness to read beside SF |

The bare side differences for MICH 2001 vs generic high-cut (ear edge 5.91 vs 5.95), and FAST SF vs generic high-cut (6.04 vs 5.95), are too close to justify independent *look-alike* cards without a stronger equipment/art identity. FAST XP mid and MICH 2002 have ear-edge 4.20 vs 4.05 and therefore must rely on their generation-specific hardware. Distinct shell names alone are not visual differentiation.

### Historical family identity
MICH/ACH 2000 full cut, MICH 2001 high cut, MICH 2002 gunfighter/mid cut:
https://kommandopost.com/2023/01/02/us-ach-helmets-2008-2010/
https://bodyarmornews.com/mich-style-ballistic-helmet-overview/
FAST SF primary manufacturer sheet:
https://shop.gentexcorp.com/content/FAST_SF_Ops-Core_Data_Sheet.pdf
FAST XP manufacturer page (including mid cut):
https://shop.gentexcorp.com/ops-core-fast-xp-helmet-system/

## Architectural follow-up
Present helmet options currently span two different policy owners:
- operator-helmet-setup-policy.ts (builtin rails, modern earcup headset mount and NVG kit)
- operator-helmet-field-policy.ts (field-appearance optional rails, addon sockets, materials)

Do NOT add a third headset wing control. Instead build the wing as ONE geometry, reconcile slot ownership, and bind it to existing headset mode and side-rail availability. Prioritize compatibility with headsets, goggles, side camera/light, cheek/ear cut, helmet covers. With no eligible over-ear headset selected, wings must hide rather than suspend empty brackets.

## Next gate, not part of this release
1. Visual A/B side profile on all bare shell models at gameplay zoom, no camo or accessory masks.
2. Strengthen MICH 2001 vs generic-highcut and MICH 2002 vs FAST XP lower edge.
3. Decide whether generic high-cut is a preset alias and migrate its save IDs non-destructively.
4. One canonical rail mount inventory feeding both appearance and helmetSetup subsystems.
5. Headset wings only after that inventory, not a duplicate per-frame system.
