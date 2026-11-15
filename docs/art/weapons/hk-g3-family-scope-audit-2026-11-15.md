# HK / G3 refinement dependency audit — 2026-11-15

## Approved art direction
The FAL is the visual **quality bar**, not a template to copy.
G3 must remain recognizably stamped, horizontal, slim and tubular.
Focus on recognizable large masses: long receiver upper/lower step,
a visible cocking tube, compact diopter drum, hooded front sight,
distinct trigger housing, straight 20-round steel magazine, and
a restrained tapered fore-end. **No blanket bevel pass.**

## Actual source routing on main
Source: `src/weapons/geometry/hk-silhouettes.ts`.

| Geometry edit | G3 early | G3A3 | G3A4 | HK33/HK53 | MP5 family |
|---|---|---|---|---|---|
| Common G3 stamped shell, lower, magazine housing | yes | yes | yes | no | no |
| Receiver cocking tube/handle | yes | yes | yes | no | no |
| Shared G3 pistol grip and straight box magazine | yes | yes | yes | separate renderer | separate renderer |
| Early blade rear sight | yes | no | no | no | no |
| Later rotary diopter turret | no | yes | yes | no | no |
| Wooden/early fixed stock contour | yes | optional part | optional part | no | no |
| Polymer fixed stock | optional part | yes | optional part | no | no |
| Retractable metal stock | no by factory | optional part | yes | HK53 shares helper, not receiver | separate |
| Faceted 8-sided handguard primitive | yes (wood) | yes (polymer) | yes (polymer) | separate | separate |
| HK 7.62 barrel sight and flash hider | yes | yes | yes | separate barrel datum | separate |

**Critical:** `addHKFamily` routes MP5 variants to
`hk-mp5-silhouettes.ts` and HK33/HK53 variants to
`hk-556-silhouettes.ts` before constructing the G3 shell.
Do not modify those families merely to chase the new G3 aesthetic.

## Stage proposal (not yet applied to models)
1. **G3 receiver/tube**: make the cocking tube and overlapping stamped shell
   two clear longitudinal masses; prioritize a distinct silhouette in dark
   untextured side view. Keep existing ejection-port position and muzzle datum.
2. **Sights**: fewer broad facets for the drum, plus a more confidently
   proportioned open front hood. Avoid adding fake holes and screw texture.
3. **Fore-end**: one broad 6- or 8-side prism, less mechanical clutter,
   oversized but slim relative to FAL. Let dark/olive material separation
   carry more of the form, not side bevel strips.
4. **Stock/lower**: clarify straight upper comb, angular heel and small
   lower receiver step. Keep wood and retractable stock parts independent.
5. **Family comparison**: test early G3, G3A3, G3A4 side/3-4 views
   before HK33/HK53 and MP5 scoped visual regression snapshots.

## Non-negotiables
- FAL factory/wood/Para unaffected.
- No extra runtime meshes or callbacks inside the animation loop.
- Weapon muzzle, sight, magazine, carry-contact datums remain valid.
- Keep class-wide G3 part shapes in the shared G3 path; variant-only
  geometry in explicit early/drum/stock decisions.
- Avoid accidental loss of real G3 identity from over-simplifying the
  diopter drum and hood. The game-art goal is representational, not generic.

## Faction distribution audit
44 dated references were reviewed. Current FAL primary previews:
Rhodesian Security Forces (1975), SADF Bush (1985).
Historically grounded nondefault appearances added:
- Rhodesian 1975: folding 50.61 alongside the representative fixed FAL
- Ukrainian MM-14 (2015–2026): limited 50.61 Para, documented October 2022,
  while retaining AK-74M as the normal preview

Not assigned as standard: Ukraine **February–March 2022** volunteers
(FAL documented later in 2022); Belgium **1995** (FN FNC by then);
Australia **2004** (F88 replaced L1A1);
British **1995** (SA80); SANDF **2015** (R4/R5);
Indonesian Kopassus 1990 (country-level FAL possession is not
Kopassus-specific proof).

References: Ukrainian Military FAL Para October 2022
https://militarnyi.com/en/news/ukrainian-military-received-fn-fal-para-rifles/
South African R1 family
https://www.defenceweb.co.za/wp-content/uploads/Repository/A-Guide-to-the-SANDF/A-guide-to-the-SANDF-chapter-9-army-app-b-armament.pdf
Australia F88 replaced L1A1
https://www.aph.gov.au/~/media/Committees/fadt_ctte/estimates/bud_1516/def/Defence_Answers.pdf
