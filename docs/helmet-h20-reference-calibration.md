# H20 — Side-profile reference calibration

## What this is and is not

This pass measures the *relative visual silhouette* of five helmet archetypes against the same unchanged Fieldwork 8×8×8 block head. The flat, chunky crown is a deliberate artistic constraint. The comparable game coordinates below are **not** converted from real-world millimeters or sampled as manufacturer orthographic engineering drawings.

[**View the same-scale, code-derived side-profile comparison**](helmet-h20-side-orthos.svg)

The SVG panels show projected contours of the current authored game meshes/cuboid envelopes, with a translucent common cube-head reference and implied ear landmark. Front points left (−Z), rear right (+Z). Source geometry is deliberately simplified; the diagrams are **not photographic helmet measurements**.

## Verified real-world anchors

| Archetype | Published / visible reference | Supported inference |
|---|---|---|
| PASGT | A pronounced small brow peak, deep ear-lobe protection and nape coverage in side profile; the original M88/PASGT is not an ACH clone | Preserve the distinctive old-style brim and lower ear/nape skirt instead of rounding away the iconic mass |
| MICH 2000 / ACH | MSA ACH TC-2000 catalog lists TC-2001 full ear cutout and TC-2002 partial ear cutout as its alternate variants | The baseline Full-Cut is the deep protective silhouette |
| MICH TC-2002 | MSA explicitly identifies a partial ear cutout | Mid-Cut needs visible ear-side mass, but less depth than Full-Cut |
| MICH TC-2001 | MSA explicitly identifies a **full ear cutout** | High-Cut needs a strong ear negative space; the rear should still wrap around the skull |
| Ops-Core FAST SF | Manufacturer specification describes the FAST High Cut shell; latest next-gen FAST SF Large shell has **148 in² (955 cm²) square coverage** and **4.32 mm shell thickness** | A related but **not interchangeable** high-cut archetype; reference for rear wrap and visible ear gap, not a mandate to add rails/details to MICH |

**Primary-source links:**
- [MSA ACH TC-2000 series catalog](https://media.msanet.com/NA/USA/BallisticProtection/MilitaryHelmets/AdvancedCombatHelmet/3720-23.pdf) — official TC-2001 / TC-2002 cut definitions.
- [Gentex / Ops-Core FAST SF Next Generation datasheet](https://shop.gentexcorp.com/content/Ops-Core%20FAST%20SF%20Next%20Gen%20Data%20Sheet.pdf) — official shell thickness and coverage by head size.
- [Gentex FAST SF data sheet](https://shop.gentexcorp.com/content/FAST_SF_Ops-Core_Data_Sheet.pdf) — additional manufacturer profile context.
- [PASGT-style profile photograph](https://www.senken-group.com/news/bulletproof-pasgt-m88-military-ballistic-helmets-bullet-proof-helmet-level-nij-iiia-pe-aramid-armor-helmet/) — commercial M88-style reference, **not** original US government production dimensional authority.

Manufacturer sheets seldom provide the actual crown-to-ear-cutout vertical distance. Avoid claiming those heights are real-world specifications. FAST shell area and thickness are **product/size-specific**: neither an all-helmet standard nor an exact reference for the TC-2001.

## Measured within Fieldwork (head-local game units)

The head is unchanged: top Y7, ear top Y4, ear center Y2.6 at Z+.5, rear Z+4. Coordinates for modern MICH helmets come from one six-station side hem, *not* a pile of overlapping box trims.

| Cut | Brow height | Central ear hem | Rear hem | Ear relief above implied ear top |
|---|---:|---:|---:|---:|
| MICH 2000 Full-Cut | 4.40 | 2.04 | 2.72 | Covers upper ear (+ overlaps ear vertically) |
| MICH 2002 Mid-Cut | 4.55 | 3.06 | 3.82 | Partial ear overlap (ear top is Y4.0) |
| MICH 2001 High-Cut H19 | 4.55 | 4.78 | 4.12 | 0.78 above top of ear |
| **MICH 2001 High-Cut H20** | **4.55** | **5.30** | **3.90** | **1.30 above top of ear** |

H20 changes **only** MICH TC-2001's ear/rear lower contour and dependent metadata. Full and Mid are held at their approved H18 dimensions; PASGT and FAST are comparison archetypes with no geometry edits.

### Current H20 TC-2001 side hem (front → rear)

| Station | Z | Y | Role |
|---|---:|---:|---|
| 1 | −5.71 | 4.55 | short heavy brow |
| 2 | −3.45 | 4.55 | substantial front temple |
| 3 | −2.15 | 5.30 | distinctive ear opening rises |
| 4 | +1.75 | 5.30 | large, quiet over-ear arch |
| 5 | +3.35 | 3.90 | strong diagonal to protective rear |
| 6 | +5.66 | 3.90 | rear shell wraps skull |

All stations share right side X5.015 (mirrored left). Shell, rubber binding and textile cover use one same source-of-truth hem; no extra corner subdivision. Crown remains at Y8.705, bevel 1.10, inset .53, shell geometry **29 quads / 58 triangles / one draw call**. Rubber edge remains height .42, with maximum .095 outboard offset.

### Distinct reference families

- **PASGT:** pronounced peak and deep coverage are preserved; not an alias of MICH 2000.
- **MICH 2000/2002/2001:** use one consistent crown language with distinct actual lower perimeters.
- **Modern FAST:** more aggressive ear clearance, accessory-bearing rails and alternative rear shape; retained as *reference*, not activated as a fourth user-facing helmet cut. Legacy cosmetic identifiers still map to the three canonical cuts.

## Quality and performance gate

Keep the fixed head, six contour points, 58 triangles, static mesh generation and cached visual assembly. Verify the same camera scale side-on and three-quarter. Test cover on/off, retention anchors, rubber lip and headset/rail clearances. Check that the ear aperture is distinctive at gameplay distance, and that the nape still has enough protective presence.

**No merge/deploy** until the critical regression/build and Operator Studio mobile checks pass and the release checkpoint is explicitly requested.
