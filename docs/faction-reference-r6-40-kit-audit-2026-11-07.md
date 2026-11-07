# R6 — full 40-reference fidelity and expansion audit (7 November 2026)

## Scope and meaning
This is an **appearance-only** audit against the 40 dated reference kits in `src/faction-reference-catalog.ts`, their fully merged `REFERENCE_GEAR_PROFILES`, `REFERENCE_WEAPONS`, the current AR/AK/HK workbench presets, and the PASGT P7 field-dress policy. It is **not** an inventory or faction-specific combat-stat change. Country/era is a visual envelope, not a claim that every member of that service wore one outfit or carried one gun.

**Fidelity language:** MATCH = currently modeled close to its stated issued type; REPRESENTATIVE = right era/family, variants or issue mix differ; PROXY = different weapon/shell/garment family, explicitly labeled. A national flag does **not** equal a specific unit badge. Equipment camo is not inherited indiscriminately from uniform fabric. Most helmets identified below as PASGT are shape stand-ins for different national shells.

## Complete audit: all 40 entries

| # | Reference | Current strengths / appropriate choice | Remaining discrepancy and next action |
|---:|---|---|---|
| 1 | USMC woodland MARPAT, 2005 | MARPAT, coyote vest/webbing, M16A4, PASGT/LWH-like dome | Dedicated LWH/Interceptor/MTV cut, 8-point utility cap; **do not add Army flag patch** |
| 2 | Bundeswehr Flecktarn, 2000 | Flecktarn, green webbing, M92-like PASGT, now two national sleeve flags | **G36** needed; M92 and period Koppeltragegestell shape; national flags are not unit tabs |
| 3 | Russian EMR, 2015 | EMR, AK-74M, full-coverage protective armor/field pouches | **6B47 helmet, 6B45 armor, 6Sh117 harness**, AK-12 role variation |
| 4 | British DPM, 1995 | DPM smock, PLCE-like webbing, Mk6 PASGT proxy with coarse scrim choice | **L85A1/A2, Mk6 and PLCE** distinctly shaped |
| 5 | NVA Strichtarn, 1980 | Authentic distinct DDR M56 shell, Strichtarn, AKM and plain webbing | Narrower NVA Y-straps, cap cockade; **no invented modern flag on sleeve** |
| 6 | SADF Nutria/P83, 1985 | Nutria plain clothing, P83 webbing and boonie | **R4/Galil**; distinguish old SADF from post-1994 national symbols |
| 7 | Sweden M90, 2000 | M90 print, simple green load carriage, field boonie option | **Ak 5/FNC** and Swedish helmet/harness family; boonie is one field look only |
| 8 | Rhodesian Brushstroke, 1975 | Brushstroke, light cotton webbing, boonie | **FAL/R1**, more convincing tropical short sleeves/field pocket layout |
| 9 | Ukraine MM-14, 2022 | MM-14, plausible modern mixed kit, AK-74M, Ukrainian flag | 6B-style legacy/modern helmet variants, Ukrainian local vest cuts, unit-specific marks; armbands scenario-dependent |
| 10 | PLA Xingkong, 2021 | Xingkong and full Chinese-style protective silhouette | **QBZ-191 and Type 19 helmet/vest**; do not invent PLA national flags on sleeves |
| 11 | Swiss Alpenflage, 1980 | Red TAZ 57/83 family, no separate rig, integrated-pocket logic | Period **SIG SG 510** more specific than generic SG 550; integrated smock-pouch construction |
| 12 | US Army 6-color Desert, 1991 | Six-color BDUs/PASGT, M16A2, olive ALICE, mismatched green/woodland vest | PASGT vest construction/cover options; avoid treating universal 2004 flag practice as 1991 policy |
| 13 | US Army OCP, 2019 | Scorpion W2, IOTV-like legacy armor, ACH, M4A1 | True IOTV/TAPS variants; corrected forward-facing right-shoulder US flag |
| 14 | US Army UCP, 2010 | UCP, ACH, broad IOTV proxy, M4-family | IOTV/FLC details, foliage-green fabric options; corrected reversed US flag |
| 15 | US Army M81, 1990 | M81 BDUs, PASGT ballistic vest, ALICE, M16A2 | Dedicated PASGT vest pockets/closure; new PASGT slit-and-elastic-band reference setup |
| 16 | US Army Iraq/DCU, 2003 | Three-color DCU, M16A4 as period variant, transitional woodland armor | OTV Interceptor specifically; 2003 units also widely carried M16A2/M4, not one universal rifle |
| 17 | US reconnaissance ERDL, 1970 | ERDL, boonie, M1956 webbing, now CAR-15 rifle preview | Tropical uniform short-sleeve details; M16A1 alternate remains valid |
| 18 | USMC Desert MARPAT, 2010 | Desert MARPAT, coyote armor, woodland print pack, M16A4 | LWH/MTV/plate carrier era variants; correct 8-point cover |
| 19 | Naval Special Warfare AOR1, 2014 | AOR1, high-cut helmet, compact AR/Mk18, minimalist plate/rig | More distinctive SOF helmet setup and weapon accessories; avoid fictional unit insignia |
| 20 | British MTP, 2015 | MTP, protective bib, Mk7-like PASGT, field kit | **L85A2, Mk7, Osprey Mk4 / Virtus** (year-dependent), accurate helmet rim |
| 21 | Bundeswehr Tropentarn, 2010 | Desert Flecktarn, M92-like helmet, arid gear, both German sleeve flags | **G36**, M92, Bundeswehr field harness; don't substitute a modern FAST shell |
| 22 | Finnish M05, 2015 | M05 digital pattern, protective kit; AKM currently a clearly labeled proxy | **RK 62 / RK 95**, Finnish composite helmet and field harness |
| 23 | Polish Pantera, 2010 | Wz.93 Pantera, broadly appropriate PASGT-like shell, AK-platform Beryl proxy, Polish flag | **5.56 Beryl/mini-Beryl** handguard/stock/magazine family and Wz.2005 helm |
| 24 | Italian Vegetato, 2015 | Vegetato print and modern full protective ensemble | **Beretta ARX160**, Italian helmet/vest shapes, evidence-based local insignia |
| 25 | Belgian Jigsaw, 1995 | Jigsaw, PASGT-era shell, light olive harness/no modern vest | **FN FNC**, native Belgian webbing/helmet variants |
| 26 | French CCE, 2005 | CCE, SPECTRA-shaped PASGT approximation, flak and webbing | **FAMAS F1/G2**, SPECTRA shell/cover, French load bearing |
| 27 | Norway M98, 2005 | M98 print and now-live **HK G3A3 / AG3-family** preview | Norwegian AG3 hardware/optic details; helmet and pack distinctness |
| 28 | Greece Lizard, 1990 | Lizard, M1 steel with patterned cover, ALICE-like harness, now-live **HK G3A3** | Local G3A3 accessories and helmet net/cover variation |
| 29 | Switzerland TAZ 90, 2005 | Swiss TAZ print, unarmored field harness, generic helmet | **SIG SG 550**, Swiss specific helmet and load pockets |
| 30 | Russia Flora, 2000 | Flora, AK-74M, broad 6B13-style legacy armor and 6Sh92-like load | Russian 6B13 vest, 6Sh92 rig and legacy helmet geometry |
| 31 | Russian OMON Urban Kamysh, 2002 | Urban Kamysh, black visored helmet/vest, now **AKS-74U** and **OMON/ОМОН** panel | Russian police helmet accuracy, no English POLICE chest panel; exact agency badges require research |
| 32 | Russian Gorka / SS-Leto, 2010 | Unarmored Gorka with restrained field rig; compact AK | Specific Gorka reinforced sections and SS-Leto overgarment options; do not print the entire vest |
| 33 | JGSDF Type II, 2010 | Type II print, heavy Japanese-style carrier proxy | **Type 89 rifle** (Type 20 is later), Type 88 helmet / Japanese carrier distinctions |
| 34 | India 2022 digital, 2023 | Indian print, olive plate/rig, AK-103 visual family | AK-203 / INSAS alternatives by unit, Indian helmet and bib; avoid unsupported digital vest |
| 35 | Australia DPCU, 2004 | DPCU, olive/DPCU field harness and PASGT-like helmet | **F88 AUG**, Australian RBH/helmet and chest rig |
| 36 | Canada CADPAT TW, 2012 | CADPAT, CG634-like PASGT proxy, now **20-inch C7A2-core rifle with collapsible stock** | Canadian-green furniture/C79 sight, actual TV/armor, helmet; do not force 2017 CADPAT flag practice onto 2012 |
| 37 | ROK Granite B, 2023 | Granite B pattern, matched protective kit | **Daewoo K2**, ROK composite helmet/plate carriage |
| 38 | Indonesian Kopassus brushstroke, 1990 | Flowing Blood print, scarlet beret, M16A1 representative, olive webbing | Correct beret badge and period variants; red beret and pattern are defining |
| 39 | SANDF Soldier 2000, 2015 | S2000 fabric, subdued brown webbing and field cap | **R4/R5 Galil**, post-P83 SANDF-specific carrier and field pouches |
| 40 | US SWAT, 2015 | Black police gear, visor helmet, AR M4A1 and SWAT panel | AR is a plausible 2015 primary; **MP5 is now available** for a separate 1980s–2000s SWAT reference, not a forced replacement |

## Implemented in R6
- Reversed-canton `flag-us-reversed` for modern US Army right-shoulder kits. Kept conventional flag asset for contexts where appropriate; pre-2004 reference auto-fill is intentionally blank rather than falsely universal.
- `label-omon` with recognizable `OMON` pixel lettering instead of English `POLICE`.
- German flags on *both* Bundeswehr field-blouse sleeves for these broadly representative kits.
- Unit badge gaps no longer become magically “exact” simply because a country flag or police panel exists; generic unit-badge gap is **minor**, preventing every non-unit-specific reference from being falsely classed as visually unrecognizable.
- New `ar-c7a2-proxy` AR-family factory preview: flat-top, long service barrel, collapsible butt and plain rifle handguard (actual C7A2 colors/C79 not modeled). CAR-15 for US reconnaissance; AKS-74U for OMON.
- Explicit, conservative `pasgtDetails` on selected dated references: cover foliage slits, elastic-band choices, and British DPM scrim. P7 geometry/policy remains sole owner, not duplicated.

## High-impact new modeled assets (weighted by current references + new historically distinct references)
Counts are **current explicit reference families benefiting**, with additional archetypes directional rather than exhaustive.

| Priority | Proposed asset or family | Existing references | Additional credible reference opportunities | Current best interim proxy |
|---:|---|---:|---|---|
| 1 | **FN FAL**: metric FAL, Commonwealth L1A1, R1 | 1 | Brazil, Argentina 1982, British pre-SA80, Portugal 1970s, early Israel, other Cold War Europe/Africa | AR-M16A1 silhouette only; clearly label *proxy*, never a FAL match |
| 2 | **G36**: G36, G36K, G36C | 2 | Spain, Baltic and European G36 users, 2000s German variants | AR-family, not visually correct |
| 3 | **FNC / Ak 5 shared silhouette family** | 2 | Indonesian FNC, Swedish 1990s / 2010s era variations | AR-family proxy |
| 4 | **Galil / R4 / R5** | 2 | Israel 1980s/1990s, South African 1990s, Latin American Galil/ACE families (ACE is a distinct subfamily) | AKM family only, with visible proxy warning |
| 5 | **Region-specific helmet-shell family**: M92, Mk6/Mk7, SPECTRA, CG634, RBH | 8+ PASGT-derived kits | New continental/UK/Commonwealth periods | PASGT P7 covers/field dressing, **not a claim of identical shells** |
| 6 | **Legacy armor family**: PASGT vest, Interceptor OTV, early IOTV/MTV | 5+ US kits | US 1980s–2010s, USMC Iraq, 1990s coalition outfits | soft-flak/plate-legacy |
| 7 | **International field harness**: PLCE, Bundeswehr Koppel, Russian 6Sh92/6Sh117 | 6+ | UK, Germany, Russia, former Soviet and export users | field-webbing / split-front |
| 8 | **SIG SG 510/550 family** | 2 | Other Swiss eras, Chile, Swiss exports | AR rifles, explicit non-match |
| 9 | **AUG / F88 family** | 1 | Austria, Australia 1990s/2010s, NZ/Ireland historical, other users | AR rifle proxy |
| 10 | **SA80 / L85A1/A2/A3** | 2 | British DPM, Desert DPM, MTP eras | AR rifle proxy |
| 11 | **6B47 + 6B45 + dedicated Soviet/Russian soft/plate vest** | 2+ | Ratnik-era Russian, VSR-93, earlier Flora loadouts | ACH + legacy plate |
| 12 | **Tropical fatigues and recognizable local smocks** | 3+ | Vietnam, Rhodesia, Swiss, African Cold War outfits | BDU + rolled sleeve / generic smock |
| 13 | **FAMAS, ARX160, QBZ-191, Type 89, K2, RK62, Beryl** | 1 each | National specificity first; then new year/unit archetypes | Closest AR or AK, labeled proxy |

**Why these rankings:** FAL generates exceptionally broad Cold War coverage; G36, FNC/Ak5, Galil and helmets each resolve several existing identifying mismatches. A fashionable single-country rifle can be valuable but should not outrank equipment shared by many references. Exact counts depend on actual dated loadout selection, not every historical customer of a weapon.

## Ready-to-add reference opportunities with currently modeled equipment
1. **US Army Vietnam 1968 (M1 + Mitchell leaf + M16A1 + M1956):** strong existing-assets fit. Missing tropical jungle shirt/gear refinements.
2. **Soviet Motor Rifle 1985 (solid green + Soviet steel + AK-74 + field webbing):** can represent immediately, with harness proxy.
3. **Soviet VDV Afghanistan 1985 (Berezka / solid, AKS-74, steel helmet or beret):** existing key shapes, period-specific outfit issue must be checked.
4. **Russian Army VSR-93 / Chechnya 1995 (VSR-93 + AK-74/AK-74M + legacy vest):** print already modeled; armor/webbing proxies explicit.
5. **British Army Desert DPM 2002 (Desert DPM + Mk6 proxy + webbing + L85 proxy):** print already available, high visual distinction.
6. **US SWAT 1995 (dark cloth + police helmet + MP5A3/MP5SD + soft vest):** new HK MP5 family finally permits recognizable period difference from current 2015 AR-based reference.
7. **German tactical police GSG 9 late 1990s (MP5 + plain dark/olive gear):** requires specific helmet, period evidence and non-fabricated insignia.
8. **West German Bundeswehr 1985 (plain olive field + G3A3 + olive webbing + M1-inspired helmet proxy):** now much more viable with G3.
9. **Israel IDF 1980s (olive fatigues + PASGT/M1-like shell + webbing + AR/M16 rifle):** visually viable without inventing a Galil; Galil addition enables iconic alternate.
10. **Brazil Army 1980s (olive / green fatigues + steel/PASGT proxy + FAL proxy):** weapon is the major unlock.
11. **Argentina 1982 (olive field dress + M1/steel-shell proxy + FAL proxy):** period webbing and helmet need dedicated review before publishing.
12. **UK special operations 1980s/1990s (dark/plain or DPM + MP5 + field harness):** no fabricated unit badge; exact uniform varies.

Recommended first incremental catalog batch: **US Vietnam regular, Soviet Motor Rifle, Russia VSR-93, British Desert DPM, US SWAT 1995**. These add distinct eras and weapon identities without introducing new combat systems. Keep historical proxies explicit in the UI.

## Identity / insignia next
- **Do not bulk-stamp flags onto all 40**. Some periods and services did not wear national shoulder patches, and a flag is not proof of a specific unit insignia.
- Add selectable location-specific national service tapes, restrained shoulder titles, and regiment/service badges only with sourced image/era/placement. Preferred next shared art infrastructure: **helmet crest, beret badge, chest name tape, shoulder tab** as independent slots; generic flags remain optional.
- Distinguish regular military, paramilitary police, special-operations and irregular marking authorization. Validate dates against `mark.from/to` and actual slot—not just country.
- Grounded in official US Army right-forward flag guidance; German double-shoulder flag uniform examples; Canadian C7A2 description and CADPAT tunic chronology. Preserve the 24×16 hard-edge authored miniature identity scale.

## Art/QA acceptance gates
1. Every one of 40 resolves without technical errors, incompatible equipment channels (except documented Swiss Alpenflage trousers), or unknown preset IDs.
2. Every visible weapon is labeled MATCH / REPRESENTATIVE / PROXY and never displayed as historical authenticity purely due to stock similarity.
3. 40 preview front/side/3-quarter renders audited for shell-hair intersection, arm badges, helmet cover slits, foliage/scrim visibility and placement, magazine/rig overlap.
4. P7 helmet concealment dependencies respect saved preferences: foliage/scrim effective slits; net effective elastic retaining band. No changes to armor hitboxes, weapon stats, inventories or Campaign data.
5. All 40 existing references remain present; candidate references stay roadmap suggestions until source-verified and separately added.

## Reference sources checked
- US Army utility-uniform right-arm flag and forward canton: https://www.army.mil/uniforms/
- 2004 universal Army flag rule: https://www.stripes.com/news/2004-02-22/new-army-uniform-rule-requires-flag-for-all-1957072.html1
- Bundeswehr field/duty uniform background: https://www.bundeswehr.de/en/about-bundeswehr/identity-of-the-bundeswehr/bundeswehr-uniforms
- German tropical field shirt with both sleeve flags: https://hessenantique.com/bundeswehr-tropical-field-shirt/
- C7A2 national official specification: https://www.canada.ca/en/army/services/equipment/weapons/c7a2-automatic-rifle.html
- Canadian CADPAT sleeve and flag chronology: https://qormuseum.org/history/timeline-uniforms/evolution-of-enlisted-uniforms-of-the-qorofc/
- 2003 US Army AR/M16/M4 family service context: https://asc.army.mil/docs/wsh2/2003-wsh.pdf

Historical shape notes outside the above directly sourced cases are *design assessments*, not exhaustive archival authentication. Do not treat this document as a claim that individual photographed soldiers wore these exact kits.
