# FN FNC P10 — visual-only stock finish and proportions

## Intent
Apply the user's P9 screenshot review without introducing additional decorative meshes. The large, simplified stock remains one continuous upper metal rail and a lower rail with a single visible knee. The cheek sleeve is removed, but its former dark polymer finish is repurposed for the end buttpad.

## Exact local geometry changes
- Upper rail: replace P9 split steel (-6.45,.03) to (-9.46,.01) and polymer cheek sleeve (-9.46,.01) to (-14.26,-.04) with **one** stock-finish upper beam from (-6.45,.03) to (-14.26,-.04), width .84, depth 1.04.
- Buttplate: **same six profile points** and rear stock datum -14.85; increase Z depth 1.86 -> 2.18; change finish from stock steel to polymer buttpad using existing shared HK_DARK_POLYMER, formerly used on the cheek sleeve.
- Connector plate: one quadrilateral broadened in X from 1.88 -> 2.56 (-12.95..-10.39), depth reduced from .90 to .64, upper edge y=-.34 and lower corners y=-2.30/-2.66. Confirm it still intersects upper/lower rails and doesn't fill the rear stock opening.
- Hinge: x -7.20..-6.02 -> -7.48..-5.96 (length 1.18 -> 1.52); y -1.95..+.40 -> -2.10..+.53 (height 2.35 -> 2.63); Z 1.88 -> 1.68.
- Keep unchanged: lower kinked rail, all other FNC meshes, magazine/barrel positions, stockRearX and muzzleX, game simulation, FAL/HK/AR/AK geometries, and factory part identifiers.

## Audit against unwanted outcomes
- **No cheek gap:** replace both top pieces, do not delete without extending steel; test continuous length and pad/hinge intersections.
- **No extra z-fighting:** one top beam instead of two; flat connector remains shallower than rails; visual checks in side and both oblique views.
- **Darkened butt, not darkened rail:** use a dedicated 'buttpad' finish role mapped to the existing dark-polymer material. The metal rail, hinge, and plate keep the steel finish.
- **Hinge not bulky:** increase X/Y while decreasing Z; keep depth greater than rails and overlap with receiver/stock.
- **Plate not oversized:** add length along X but narrow Z and leave the large rear void open.
- **No per-frame regression:** all geometry built on preset selection, no render-loop allocation or new geometry helpers.
- **Test ownership:** revise superseded cheek-sleeve assertions; retain P9 lower rail and open negative-space tests, add P10 geometry + factory palette acceptance.

## Release requirements
Affected FNC/FAL geometry, TypeScript, production build, WebGL five-rifle comparison, desktop/mobile Arsenal checks and main release gates must pass. Merge only from an up-to-date base and ensure the previous Pages run is successful. Verify published Pages build stamp equals the new merge commit prefix.
