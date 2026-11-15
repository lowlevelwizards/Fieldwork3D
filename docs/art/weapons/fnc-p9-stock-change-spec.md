# FN FNC P9 — stock identity correction and simplified receiver underside

## Sources and diagnosis
User-supplied in-game P8 Arsenal screenshots (side, near-side and opposite three-quarter views) and three real-world FN FNC folding-stock references. The in-game lower rail slopes almost immediately from the receiver; the stock reads like one generic triangle. The real reference's identifying large forms are a straight parallel departure of upper and lower tubular members, a later knee in the lower bar, an inset flat bridge plate, a distinct vertical butt assembly and an obvious hinged bracket.

This is **an art-only visual translation**, not a working firearm mechanism or specification. Preserve modular FNC factory part IDs and combat/mounting data.

## Concrete shape specification (+X muzzle, +Y up, +Z right)

- **Hinge**: one rectangular extruded bracket x=-7.20..-6.02, y=-1.95..0.40, depth=1.88; extends slightly into the receiver, intersects both bars, projects farther in Z than rails; no separate visible screws/pins.
- **Upper rail**: steel beam remains (-6.45,.03) to (-9.46,.01), width=.69; cheek sleeve extends from (-9.46,.01) to (-14.26,-.04), width=1.04; same length split and no overlapping coplanar steel/polymer surfaces.
- **Lower rail**: one six-point extrusion: (-6.52,-1.23),(-10.18,-1.23),(-14.38,-3.01),(-14.38,-3.49),(-10.05,-1.84),(-6.52,-1.84). First ~3.66 game-art units horizontal, then one intentional downward bend; depth=1.12. No smooth tube subdivision or multiple independent joints.
- **Buttplate**: one six-point upright silhouette: (-14.85,.36),(-14.17,.36),(-14.10,.12),(-14.10,-3.36),(-14.35,-3.56),(-14.85,-3.56), depth=1.86. Both rails physically overlap its front region and the historical muzzle-to-butt length remains unchanged.
- **Connector plate**: one flat four-point recessed bridge: (-12.55,-.49),(-10.67,-.49),(-11.76,-2.36),(-12.10,-2.48), depth=.90. This touches sleeve and lower diagonal without filling the stock's open rear interior.
- **Underside**: remove the P8 separately modeled open trigger guard mesh; leave P8's grip, lower receiver and magazine geometry unchanged.

## Audit decisions (and mitigations)

1. **Ambiguity: “two parallel bars then triangle”** — interpret the triangle as the long open *void* formed after a single lower-bar knee, not a new solid triangular stock plate.
2. **Ambiguity: “flat piece connecting in between”** — model one inset connecting sheet between upper and lower members, *not* a floating third rail or giant uninterrupted infill.
3. **Potential disconnected rail tips** — deliberately intersect both upper sleeve and lower bar with the upright buttplate, and hinge both rail fronts to the rectangular block; test AABB intersections.
4. **Potential coplanar shimmer** — retain prior disjoint metal/cheek length split; plate is recessed (shallower in Z), hinge and butt are thicker than bar rails.
5. **Unnecessary micro-detail** — omit rivets, small butt ridges, sling loops, animated hinges and hardware; each extra mesh would be inferior to more legible large masses at native in-game scale.
6. **Trigger guard removal mistaken for gameplay change** — delete only the visual loop, do not edit collision, combat, rig poses, contacts, or serialized parts.
7. **Risk of FAL/HK family regressions** — modify only FNC geometry, its tests, and its isolated CI; preserve the FNC stockRearX=-14.85 and muzzleX=19.50, and retain the existing untouched-FAL geometry acceptance check.

## Acceptance

- One rectangular hinge, one upper rail with existing material sleeve split, one kinked lower rail, one shallow web, one distinct buttplate; no trigger-guard mesh.
- Native-scale side view visibly shows two parallel rails then the lower rail knee; opposite and three-quarter views preserve negative space and visually connected joints.
- Exactly two stock rail meshes tagged as structural; no more than 34 geometry children, unchanged FNC part naming conventions and gameplay endpoints.
- Tests inspect actual vertices, bounding overlap and depth hierarchy (not only flags); FNC/FAL affected suites, TypeScript, production build, and browser Arsenal/mobile/five-rifle captures pass.
- Release only after checks pass, previous Pages release has succeeded, and new public Pages build stamp matches the merged commit.

## Deliberate non-goals
No other weapon geometry, receiver/front-end rework, fitting alternate buttstocks, folding animation, texture upgrade, or physical firearm engineering.
