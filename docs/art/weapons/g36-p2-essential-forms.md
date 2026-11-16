# G36 P2 — Essential shapes and full-Arsenal census

**Scope:** G36 original full-length factory model only. Art/visual changes, no foreign magazine compatibility or ammunition migration.

## Visual hierarchy

1. Carry-handle negative space and stacked optics: explicitly opposite contour winding, visible inward-facing bridge/front-post faces under FrontSide culling; one top reflex frontal window and an existing 6-facet lower optic face.
2. Receiver/stock/fore-end: less depth in three-quarter, wide clear two-hole stock and simpler three-station octagonal handguard; retain the four large pixel vents.
3. Magazine: share actual AR STANAG 30 contour generation to unify art proportions, **not** ammo feed compatibility; retain separate G36 factory part, translucent-looking opaque polymer material, three rib graphics and carried silhouette.
4. Trigger gap: keep an open underside contour with no enclosing trigger guard.
5. Bare barrel and muzzle: two simple rectangular solids (24 triangles total), deliberately visually quieter than the optic.

## Audit and acceptance

The critical test `tests/weapon-g36-p2-census.test.mjs` builds the entire production factory catalog, prints every model's actual mesh/triangle count and named G36 part costs as `G36_P2_FACTORY_CENSUS`, and compares actual M16A2, M4A1, AKM, G3, FNC and FAL factory builds. It limits G36 to 400 triangles / 15 meshes and its front assembly to 24 triangles.

The visual and legacy tests additionally check a front-sided ray cast **from inside** the carry handle, side/openings, contact datums, factory renderer parity, pixel texture caching, and existing saved builds. Final visual approval still requires the user's new real iPhone side and three-quarter screenshots; geometric tests alone cannot approve the art.
