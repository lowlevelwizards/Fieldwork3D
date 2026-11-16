# FN FNC P20 — 12 vents, deliberately simpler low-poly anatomy

## Reference and objective
After approved shared AR STANAG magazines and P19 proportions, user requested reducing the twenty gas-cover vents to **12** (four per side, four on top), simplifying front sights, magwell chamfers, and charging handle. Preserve the blocky silhouetted Fieldwork language and FNC/FAL lineage, not mechanically realistic surface detail.

## Changes (no gameplay changes)
- **Vents:** one four-slot batched strip centered at Y1.17 on each sloped gas-cover flank, plus the existing four-slot roof strip. One `FNC_FRONT_P13.gas.ventSideYs` declaration controls both sides; `ventCount=4` and all side/roof geometry and atlas materials stay shared. Two former side strips of eight vents become two strips of four vents. Polymer grooves remain two long strokes per side, unaffected.
- **Front sight:** two recognizable open-gap guard ears built from a four-point rectangle each instead of separate six-point chamfered silhouettes. One sloping four-point integrated gas/sight seat replaces the formerly five-point stepped roof, preserving established top of rear transition Y1.85, front Y1.73, front-ear top Y2.77 and bore alignment.
- **Receiver/magwell:** one six-corner integrated lower instead of a nine-corner chamfered outline. The magwell's front face drops square from receiver roof to the magazine socket at X2.75. No extra wall slab, overlapping z-depth geometry or separate chamfer mesh; save/AR STANAG ID and positioning unchanged.
- **Charging handle:** one box-shaped right-side lug (rather than a four-point chamfered knob plus independent box stem), centered at X2.16, still emerging from the forward run of the single stamped operating slot. Lug has actual overlap with the receiver and slot and remains ahead of the rear ejection opening. Legacy userData identifiers for earlier acceptance tests remain on the integrated lug.
- **Preserved:** rear aperture, protected front-sight gap, FNC folded stock, P19 barrel/muzzle datums, factory-vs-suppressed paths, AR metal/polymer magazine shapes, operator alignment, FAL/AR/HK/AK geometry and all simulation behavior.

## Verification
Run `node --experimental-strip-types --test tests/weapon-fnc-p20-simplified-forms.test.mjs` plus the existing focused FNC/FAL suite and `node --experimental-strip-types scripts/audit-weapon-geometry.mjs`. Tests assert exact 4+4+4 visible vent quads, rectangular front ears, sight seat, square six-point magwell, one inserted charging lug, STANAG overlap, unchanged muzzle/stock endpoints and lower polygon/mesh counts than the previous P19 baseline of 648 triangles / 33 meshes (144 handguard triangles).

P20 is intentionally a reduction pass. If the new geometry savings come at the expense of side-readable silhouette or visible positive/negative forms in mobile Workbench, fix the silhouette rather than adding little mechanical details back.
