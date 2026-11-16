# FNC P17 — Fieldwork caricature audit and implementation

## Objective and deliberate exclusions
Push an iconic, legible low-poly FNC rather than add realism. P16 was recognizable but had a magwell slab, repetitive vents, thin muzzle and small apparent rear aperture. Real FNC shape language and the project's FAL/HK/AK abstractions inform silhouette—not a new 1:1 replica. Selectively enlarge known landmarks; preserve negative spaces and the distinctive two-level fore-end.

## A — structural consolidation
- **Receiver lower and magwell:** remove the entire separately extruded X.07..2.73 Z3.64 magwell side-slab. Rebuild the *same* lower outline as nine angular stations, including a near-perpendicular nose at X2.75 from Y-.98 to -3.18, a short 0.12 slope into the Y-3.34 mag seating edge and a step back to the lower's rear. Depth remains 3.42 and the STANAG stays center X1.54, top Y-2.81, curved with two pressed ribs. Preserve old user-data integration markers on the lower only, add P17 marker. One integrated mesh, no duplicate hidden plate.
- **Receiver/front-end junction:** existing gas X2.16, polymer X2.18, receiver terminal X2.75 have genuine overlapping surfaces. Change the polymer's rear hex cross-section scale 1.01 -> .93, maintaining a narrowed, concealed root, not an additional bridge/spacer. Leave gas roof aligned Y1.52 vs receiver Y1.60. No extra selector or ejection details.

## B — controlled caricature
- **Polymer:** Add 0.10 lower-only flare below Y-1.0 using piecewise linear Y conversion. Shoulder width slightly wider: hex half Z1.10 ->1.16, roof .76->.80, bottom .65->.68. Reproject two longitudinal dark grooves to exact new surface. Do not increase upper height or obscure gas vent.
- **Stop:** center X10.48, length .70 (was center 10.54, length .55); keep taper, same 6-face body, only ~.13 extension beyond handguard face; no rectangular fin.
- **Rear sight:** keep outer frame [-5.65,-4.13], height Y2.48 and anchoring. Enlarge actual aperture from ~.54 to ~.69 at bottom and ~.50 at top; no tower height increase. Preserve natural protected hole and alignment with front.
- **Front sight:** remove one unnecessary shoulder station from base, keep same two protected six-point ears and center gap. Do not increase complexity.
- **Barrel/muzzle:** visual barrel cube 1.00->1.14 Y/Z; same world axis Y0 and terminal X19.50. Factory muzzle radius .66->.80, unchanged length1.54 and endpoint. Project batched two-per-side slotted gestures with facetZ = radius*cos(pi/6)+.025 rather than stale fixed .67. Suppressed/nonfactory variant renders no factory flash hider or slots. No gameplay/attachment changes.
- **Stock:** retain beams/hinge/open web, pad top Y.36->.45, bottom Y-3.56->-3.67, same rear endpoint X-14.85. No new braces, no cheekpad.

## C — coherent graphic mass
- **Gas marks:** preserve five grouped vent rows, two side and one roof, increase visible vent height .155->.205 and roof width .25->.29. Thicken existing two polymer long strokes .24->.29. Still five batched existing detail meshes, no new detail draws.
- No change to gas-section top/bottom (Y1.52/-.45), no handguard front extension (until native-scale proof), no extra upper-stamping overlay, no stock-rail inflation. These are intentionally excluded after risk audit.

## Risk audit and release gates
- Single lower magwell needs regression update: old distinct-well tests previously required a separate raised Z slab. Replace that with proof of *one* lower mesh, vertical leading face, Z3.42, magazine intersection, and no second magwell component.
- Larger lower polymer and stop must remain nested: assert roof below gas vents, true poly/gas/stop intersection, handstop extends less than .2 beyond polymer, still visible lower polymer.
- Coordinate contract unchanged: rear stock X-14.85, barrel axis/muzzle assembly Y0 and X19.50, magazine X1.54 topY-2.81, grip +.90, sight positions; upper receiver roof Y1.60. No FAL/HK/AK/AR geometry changes.
- Slots derive from new muzzle radius to prevent buried or floating quads; factory device absent from accessory/no-factory builds.
- Preserve all established factory part IDs, no procedural updates during rendering, no new detail meshes; require focused FNC/FAL tests and build, five-rifle multi-angle real-WebGL captures, mobile/desktop Workbench, Ground Zero regressions, previous Pages release verified, merge checkpoint, then public build-stamp verification.
- At 200–250px side thumbnail, confirm better recognition through receiver/magwell silhouette and large landmarks. Automated captures test render stability but cannot conclusively certify artistic quality.
