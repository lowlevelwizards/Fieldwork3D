# G36 P6 — Fieldwork interpretive reset

This stage is a *replacement of the visual construction*, not a refinement of P5 manufacturing-like geometry.

**Modeling rule:** One strong mass per component. Only forms required to identify the original long G36 integrated dual-optic service rifle are allowed. Real-world references establish identity, not the positions of individual vertices. All coordinates are local visual units, not engineering dimensions.

## Primary form inventory

1. One open two-hole stock extrusion, one flat buttpad, one hinge block.
2. One broad upper receiver slab; one angular lower receiver/magwell slab; real empty trigger gap.
3. One genuine through-hole carry frame, one long optic cuboid, one shorter upper optic cuboid, two large dark rectangular faces.
4. One raked four-corner grip.
5. One G36-only smoky polymer magazine using its established curve mathematics.
6. One three-section **four-sided** fore-end: completely flat roof and sides, only a single nose taper; four dark vent marks in the atlas, no vent meshes.
7. One rectangular barrel plus one small blunt muzzle.

**Deliberately forbidden:** rounded/pillowed guard cross-sections, cosmetic chamfers, tiny optic steps, arbitrary receiver shoulders, selector dots, grooves, underside decoration, trigger guard, micro hardware, texture lines and additional material meshes.

Do not change six saved factory part IDs, magazine feed, ammunition/ballistics, mounting policy, operator hand/muzzle/sight coordinates, or overall stock/muzzle extents. Keep the existing live Arsenal/operator/replay route; no second disconnected renderer.

## Review/acceptance

- Compare current P5 and P6 real production renders to AR/M16A2, FNC, FAL, HK/G3 and AKM, equal frame and game scale.
- Inspect side, both 3/4, front, top, 64px and 128px plus simple clay/monochrome.
- Hard constraints: stock and handle actual openings, correct FrontSide normals, no floating intersections, stable operator and magazine datums, no runtime extra meshes.
- Triangle count is **not** an artistic target. It should fall naturally from the new shape grammar.
- User aesthetic approval is still required after merge; automated tests validate integration and geometry, not beauty.
