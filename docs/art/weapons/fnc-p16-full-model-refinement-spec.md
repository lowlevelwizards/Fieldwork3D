# FNC P16 — full buttpad-to-muzzle assessment, audited implementation

## Reference and visual hierarchy
User P15 live side and left/right oblique Arsenal captures show an improved, coherent large-form silhouette; remaining faults: magazine socket reads as an added forward block, fore-end root has an abrupt joint, sight has rectangular towers, muzzle is a hexagonal plug, stamped receiver lacks accessible upper/lower hierarchies. Cross-checked FNC real-world side images, Small Arms Review's receiver and sights description, and the shared Fieldwork FAL/AR/HK art implementations.

Approved values: buttpad, open parallel/angled stock bars, inset brace, hinge, primary grip forward position, receiver roof Y1.60, upper gas roof Y1.52, 30-round curved magazine, barrel center Y0 and X19.50 muzzle attachment anchor. The magazine insertion and front-root joint must be fixed locally, never through a rifle-wide translation.

## Part-by-part scope and final choices (ranked by impact, risk)
| Part | Impact/risk | Decision |
|---|---|---|
| Buttpad | Low/low | Preserve dark thicker P10 pad; no changes |
| Stock and hinge | Low/high | Preserve open top/lower rods, inset plate and existing hinge anchors |
| Upper receiver | Medium/medium | Preserve crowned roof, flat P15 nose and right-side operating port; increase seam continuity |
| Lower receiver | High/low | One broad side stamp and restrained selector lever; neither is a mechanical component |
| Grip | Low/high | Preserve +.90X established placement and hand anchor |
| Magwell | Critical/medium | Replace previous oversized overhanging X3.18 housing with one 6-point shallow sculpted socket at X.07..2.73, bottom -3.34; keep base lower and modest side proudness; centered mag x1.54 |
| Magazine | Medium/medium | Move one art-local centerline .11 rearward under socket, leave curve, 30-round length and two pressed ribs unchanged |
| Receiver/front root | Critical/medium | Extend same six-sided polymer root from X2.45 to2.18, set rear scale 1.01; extend vented gas envelope rear from2.55 to2.16 for >.55 longitudinal receiver penetration; no additional connector box |
| Polymer/gas cover | Low/high | Keep P15 30% enlargement, six faces, height hierarchy and both long polymer grooves and five paired broken side vents |
| Handstop | Low/low | Keep one P14 tapered collar and its contact |
| Front sight | High/medium | Retain one base reduced to X12.65..15.10; replace two box ears with two six-point chamfered extrusions from Y1.34 to2.44, at Z+/- .65; preserve open gap, one pair only |
| Barrel | Low/high | Y0 bore, X19.50 barrel endpoint and all attachment sockets untouched |
| Muzzle | High/medium | One slim six-sided flash-hider body radius .66 and length1.54 ending X19.50, with one batched two-by-two rectangular dark vent mesh; factory only |

## Unwanted outcomes audit / mitigations
- A floating magazine: check actual mag and socket 3D bounds overlap, both upper and lower receiver attach, verify no forward socket exceeds receiver X2.75, and that both original pressed ribs follow the shifted centerline.
- Fore-end seams: assert >.55 X volume overlap with receiver, Y/Z intersections, proper hidden root profile; don't cover gaps with an extra spacer.
- Sight towers/sidedness: chamfer existing *two* protective ears as 6-point profiles, don't add a third post or shift the sight line. Ensure base intersects gas and both ears, and genuine center Z void survives.
- Muzzle attachment regression: factory-only geometry changes, end remains X19.50, Y0 bore unaffected, nonfactory path contains no muzzle or dark slots. Drawn slots are representational graphics, not cuts/drilled geometry.
- Loss of receiver silhouette: no new broad upper panels; preserve upper crowned mesh, lower body outline, old side port and charging stem/knob. Use one subtle broad stamp and short selector lever only.
- Detail creep: no pins, screws, clip-ons, rails, new textures, rounded bevel mesh, real-life mechanical information or animation costs; total meshes <=36, no per-frame work.
- Cross-family drift: FAL/HK/AK/AR source files untouched; reuse existing materials and FAL-inspired but uniquely FNC scale/profile.
- Style test trap: update superseded fixed-height P12–P15 assertions, retain legacy behavioral checks, add P16 named-geometry tests and use actual side/oblique mobile and desktop real-WebGL captures as a separate visual acceptance gate.

## Release protocol
Commit compatible feature stages; run focused FN FNC/FAL geometry, TS/build and real five-rifle and mobile/desktop Arsenal checks. Run Ground Zero affected-domain, architecture and regression/build checks. Merge once green and prior main Pages verified. Confirm exact published Pages build stamp after merge. Artwork still benefits from post-release user screenshot review.
