# Fieldwork Breach — Stage 3B paired uniform cut study
**Status:** Two modeled *comparison candidates*; final inclusion and visual quality
are pending the user's side-by-side review. Headgear and camouflage artwork are frozen.

## Why both cuts exist

The two patterns of clothing are materially different **constructions**, not
simply color/pocket presets. A conventional 1980s BDU coat has a pointed
fold-down collar, four rectangular front patch/cargo pockets, a longer
untucked hem and comparatively roomy sleeves. The U.S. Army Combat Uniform
(ACU) blouse introduced a higher/standable collar on early UCP variants,
slanted chest pockets, upper sleeve utility pockets, modern closures and a
tidier, more structured overall envelope. Later OCP ACUs modified the
collar to a fold-down version, changed shoulder-pocket closures and removed
some hook-and-loop features. This study uses the **later folded collar** as
its modern reference, rather than incorrectly giving every OCP blouse the
original UCP Mandarin collar.

BDU and ACU are **uniform cuts**. UCP is a print, not an alternative name
for the ACU. ACU-family issue fabrics included UCP, MultiCam/OEF-CP and
OCP/Scorpion W2. No new pattern was invented for this study.

## Stage 3B prototype differences

| Feature | A: Historical BDU/jungle-inspired cut | B: Modern ACU cut |
| --- | --- | --- |
| Main torso shell | Longer, visibly loose below waist, fuller shoulder span | Slightly more tapered with structured shoulders |
| Collar | Broad fold-down conventional field collar | Shorter modern collar, OCP-era folded reference |
| Front pockets | Two upper and two lower square cargo pockets, separate flaps | Two slanted chest cargo pockets |
| Sleeve construction | Fuller upper and forearm textile volumes; plain upper arm | Modern upper-arm utility pockets; shorter cleaner sleeve shape |
| Closing/hem | Concealed-button style front and long untucked hem | Modern central placket and shorter straight hem |
| Material | Original shared Stage 2 camo cloth map, no new artwork | Same render pipeline and pixel density |
| Animation | Existing upper and lower IK arm meshes are parents | Exactly the same IK parents, lengths, weapons and headgear |
| Body | The existing Stage 3A torso, shoulder and leg dimensions | Exactly the same anatomy, no new game collider |

Each is authored as a small low-poly tapered cloth loft, with independently
articulated upper/lower sleeve shells. Normal pockets, collar and hem retain
fabric print with a physically scaled UV. Identical material parts merge for
mobile draw-call efficiency; unselected candidates are hidden.

## Default print eligibility (deliberately narrow)

| A: 4-pocket BDU / jungle field family | B: U.S. ACU family |
| --- | --- |
| M81 Woodland — U.S. BDU | UCP — original issued ACU |
| Three-Color Desert — DCU, BDU-derived field coat | MultiCam — issued OEF-CP field ACU |
| Six-Color Desert — early desert BDU style | Scorpion W2 — issued OCP ACU |
| ERDL Lowland — earlier four-pocket jungle fatigues | |
| Tiger Stripe — historical specialty jungle fatigues, analogous cut | |
| Rhodesian Brushstroke — analogous historic field fatigues | |

**Important caveat:** ERDL, tiger stripe and Rhodesian brushstroke denote
earlier *jungle-field uniform families*, not literal U.S.-Army-issued BDU
jackets. The A prototype has a closely related 4-pocket envelope but is
not a perfect reconstruction of all individual regional/sewing variants.
The commercial aftermarket may produce additional pattern/cut combinations;
they are not included in these default **documented-issue** selectors
without verifying the actual item.

**Not offered:** M81 on the ACU prototype; UCP on the BDU prototype;
historical Mitchell Leaf on either; non-American modern patterns by
assuming every country's uniform is an ACU. Other historically real
styles (MARPAT MCCUU, Finnish M05 field shirt, British PCS and Swiss TAZ)
should eventually receive their **own** characteristic garment cuts,
not inaccurate re-labeling as an American four-pocket BDU or ACU.

The remaining nonprototype torso wardrobe choices continue to use the
existing Stage 2 fabric-category rules. Previously saved invalid prototype
combinations are preserved as values but not rendered with unsupported
authored prints, so changing clothes does not delete a saved uniform.

## Operator Lab comparison

The **STAGE 3B · FIELD BLOUSE A / B STUDY** panel has two independent
actual-artwork print selectors and a one-tap **COMPARE BDU + ACU**
button. Two operators are rendered at the same scale, same identity, no
headgear, no armor, no pack and no weapon in neutral pose, with
independent BDU and ACU camouflage. Their positions are centered as a
true side-by-side, not a before/after illusion.

This preview does **not** overwrite the current Lab wardrobe, saved
outfit, equipment ownership or campaign soldier. The existing silhouette
mode, orbit views and screenshot capture are available for review.

## Evidence and caution

- [U.S. Army CPE Ground ACU FAQs](https://cpeground.army.mil/Resources/Frequently-Asked-Questions/) — the modified collar, upper-arm pockets, elbow reinforcements, and UCP/OEF-CP/OCP fabrics.
- [U.S. Army 2015 OCP uniform rollout](https://www.army.mil/article/149740/Soldiers_to_field_Operational_Camouflage_Pattern_for_uniforms/) — transition from UCP, OEF-CP, and OCP fabric and uniform revisions.
- [U.S. Army 2019 UCP wear-out announcement](https://www.army.mil/article/228411/acu_pattern_officially_retired_new_uniform_improvements_on_the_way) — UCP not currently authorized, OCP transition context.
- [Official Army ACU summary of changes](https://quartermaster.army.mil/oqmg/enlisted_proponency/Operational_Camouflage_Pattern_POCKET_GUIDE.pdf) — shirt/boots/kit distinctions (reference only).
- [US Woodland BDU historical four-pocket specimen](https://antiquejohn.thebase.in/items/67593409) — visual four-pocket collar/hem reference (surplus example).
- [OCP ACU manufactured field jacket](https://www.bradleyssurplus.com/products/genuine-issue-ocp-jacket) — slanted pockets and sleeve utility pockets.

**Review before declaring both permanent:** white/gray silhouette at 3/4
and side views, line of shoulder and shoulder seams, garment hem with
and without armor, sleeve elbows in ready/aim/crouch, print scale and
draw-call/GPU counters on iPhone. Only prototypes have been implemented;
full 3B upper-body approval is intentionally not assumed.
